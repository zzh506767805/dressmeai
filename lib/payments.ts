import type Stripe from 'stripe';
import { getJob, getPaymentBySession } from './db';
import { getStripe } from './stripe';
import { getCloudflareEnv } from './cloudflare';
import { grantCheckout } from './atomic';
import { readImageResponse, readImageBytes, storedImageKey, uploadImageBuffer } from './blob';
import { Cadence, getPlanById, planIdToSubscriptionStatus, PlanId } from './pricing';

export type ProcessResult =
  | { status: 'processed'; mode: 'subscription' | 'payment'; plan?: string; unlockedJobId?: string }
  | { status: 'already_processed' | 'not_paid' | 'missing_metadata' };

export async function processCheckoutSession(session: Stripe.Checkout.Session): Promise<ProcessResult> {
  if (session.payment_status !== 'paid') return { status: 'not_paid' };
  const userId = session.metadata?.userId;
  if (!userId) return { status: 'missing_metadata' };
  if (await getPaymentBySession(session.id)) return { status: 'already_processed' };
  const shared = {
    sessionId: session.id, userId, customerId: session.customer?.toString() ?? null,
    amount: session.amount_total ?? 100, currency: session.currency ?? 'usd',
  };
  if (session.mode === 'subscription') {
    const plan = getPlanById((session.metadata?.planId ?? 'basic') as PlanId);
    const cadence = (session.metadata?.cadence ?? 'monthly') as Cadence;
    const subscriptionId = session.subscription?.toString() ?? null;
    if (!plan || !subscriptionId) return { status: 'missing_metadata' };
    // Do not record paid before obtaining the actual subscription period. A
    // transient Stripe error leaves the entire grant retryable.
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    const periodEnd = (sub as any).current_period_end ?? (sub as any).items?.data?.[0]?.current_period_end;
    if (!periodEnd) throw new Error('Subscription period unavailable');
    const applied = await grantCheckout(getCloudflareEnv().DB, {
      ...shared, subscriptionId, mode: 'subscription', plan: plan.name,
      subscriptionStatus: planIdToSubscriptionStatus(plan.id), subscriptionExpiry: periodEnd * 1000,
      credits: plan.credits === -1 ? 999999 : plan.credits * (cadence === 'annual' ? 12 : 1),
    });
    return applied ? { status: 'processed', mode: 'subscription', plan: plan.name } : { status: 'already_processed' };
  }
  const jobId = session.metadata?.jobId;
  let unlock: { jobId: string; imageUrl: string } | undefined;
  if (jobId) {
    const job = await getJob(jobId, userId);
    if (job?.status === 'COMPLETED' && job.originalImageUrl) {
      try {
        const response = await readImageResponse(job.originalImageUrl);
        const imageUrl = storedImageKey(job.originalImageUrl) ? job.originalImageUrl
          : await uploadImageBuffer(await readImageBytes(response), 'result-orig', userId);
        unlock = { jobId, imageUrl };
      } catch { console.error('[unlock] Original unavailable; granting one credit'); }
    }
  }
  const applied = await grantCheckout(getCloudflareEnv().DB, {
    ...shared, subscriptionId: null, mode: 'payment', plan: jobId ? 'single_unlock' : 'single', credits: 1, unlock,
  });
  return applied ? { status: 'processed', mode: 'payment', unlockedJobId: unlock?.jobId } : { status: 'already_processed' };
}
