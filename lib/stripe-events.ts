import type Stripe from 'stripe';
import type { D1Database } from '@cloudflare/workers-types';
import { getPaymentBySubscription } from './db';
import { getCloudflareEnv } from './cloudflare';
import { processCheckoutSession } from './payments';
import { getPlanById, planIdToSubscriptionStatus, PRICING_PLANS } from './pricing';

export interface EventMutation { sql: string; values: (string | number | null)[] }

export async function applyStripeEvent(db: D1Database, eventId: string, mutations: EventMutation[]) {
  const token = crypto.randomUUID();
  const now = new Date().toISOString().replace('Z', '+00:00');
  const result = await db.batch([
    db.prepare('INSERT INTO WebhookEvent (id, token, createdAt) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING').bind(eventId, token, now),
    ...mutations.map(mutation => db.prepare(mutation.sql.replace('{gate}', 'EXISTS (SELECT 1 FROM WebhookEvent WHERE id = ? AND token = ?)')).bind(...mutation.values, eventId, token)),
  ]);
  return Boolean(result[0].meta.changes);
}

export async function processStripeEvent(event: Stripe.Event) {
  if (event.type === 'checkout.session.completed') {
    const result = await processCheckoutSession(event.data.object as Stripe.Checkout.Session);
    if (result.status === 'missing_metadata') throw new Error('Paid checkout metadata missing');
    return;
  }
  if (!['customer.subscription.updated', 'customer.subscription.deleted', 'invoice.payment_succeeded'].includes(event.type)) return;
  const object: any = event.data.object;
  const subscriptionId = event.type.startsWith('customer.subscription') ? object.id
    : typeof object.subscription === 'string' ? object.subscription : object.subscription?.id;
  if (!subscriptionId) return;
  const payment = await getPaymentBySubscription(subscriptionId);
  const userId = payment?.userId || object.metadata?.userId;
  if (!userId) throw new Error('Subscription user is not linked yet');
  const now = new Date().toISOString().replace('Z', '+00:00');
  const mutations: EventMutation[] = [];
  if (event.type === 'customer.subscription.deleted') {
    mutations.push({ sql: `UPDATE User SET subscriptionStatus = 'FREE', subscriptionExpiry = NULL, credits = 0, subscriptionEventAt = ?, updatedAt = ? WHERE id = ? AND subscriptionEventAt <= ? AND {gate}`, values: [event.created, now, userId, event.created] });
  } else if (event.type === 'customer.subscription.updated') {
    const periodEnd = object.current_period_end ?? object.items?.data?.[0]?.current_period_end;
    const plan = object.metadata?.planId ? getPlanById(object.metadata.planId) : PRICING_PLANS.find(plan => plan.name === payment?.plan);
    if (['active', 'trialing'].includes(object.status) && periodEnd && plan) {
      // Subscription updates extend/adjust membership, never replenish spent credits.
      mutations.push({ sql: `UPDATE User SET subscriptionStatus = ?, subscriptionExpiry = ?, subscriptionEventAt = ?, updatedAt = ? WHERE id = ? AND subscriptionEventAt <= ? AND {gate}`, values: [planIdToSubscriptionStatus(plan.id), new Date(periodEnd * 1000).toISOString().replace('Z', '+00:00'), event.created, now, userId, event.created] });
    }
  } else if (object.billing_reason === 'subscription_cycle') {
    const plan = PRICING_PLANS.find(plan => plan.name === payment?.plan);
    const period = object.lines?.data?.find((line: any) => line.period?.end)?.period;
    if (!plan || !period) throw new Error('Renewal plan or period unavailable');
    const annual = period.end - period.start > 300 * 86400;
    const credits = plan.credits === -1 ? 999999 : plan.credits * (annual ? 12 : 1);
    const invoicePaymentId = crypto.randomUUID();
    mutations.push({ sql: `INSERT INTO Payment (id, userId, stripeSessionId, stripeSubscriptionId, plan, mode, status, amount, currency, createdAt, updatedAt)
      SELECT ?, ?, ?, ?, ?, 'subscription', 'paid', ?, ?, ?, ? WHERE {gate} ON CONFLICT(stripeSessionId) DO NOTHING`, values: [invoicePaymentId, userId, `invoice:${object.id}`, subscriptionId, plan.name, object.amount_paid ?? 0, object.currency ?? 'usd', now, now] });
    mutations.push({ sql: `UPDATE User SET subscriptionStatus = ?, subscriptionExpiry = ?, credits = ?, subscriptionEventAt = ?, updatedAt = ? WHERE id = ? AND subscriptionEventAt <= ? AND EXISTS (SELECT 1 FROM Payment WHERE id = ?) AND {gate}`, values: [planIdToSubscriptionStatus(plan.id), new Date(period.end * 1000).toISOString().replace('Z', '+00:00'), credits, event.created, now, userId, event.created, invoicePaymentId] });
  }
  if (mutations.length) await applyStripeEvent(getCloudflareEnv().DB, event.id, mutations);
}
