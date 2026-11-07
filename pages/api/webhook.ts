import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { getStripe } from '@/lib/stripe';
import { processStripeEvent } from '@/lib/stripe-events';

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ message: 'Webhook is not configured' });
  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') return res.status(400).json({ message: 'Missing signature' });
  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(await buffer(req, { limit: '1mb' }), signature, secret, undefined, Stripe.createSubtleCryptoProvider());
  } catch { return res.status(400).json({ message: 'Invalid webhook signature' }); }
  try {
    await processStripeEvent(event);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[webhook] Retry required', error instanceof Error ? error.message : 'unknown');
    return res.status(503).json({ message: 'Please retry this event' });
  }
}
