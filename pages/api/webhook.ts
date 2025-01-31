import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';

// 禁用 body parsing，因为我们需要原始请求体来验证 webhook
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripeKey = process.env.STRIPE_SECRET_KEY!;
console.log('Webhook using Stripe key:', stripeKey.startsWith('sk_live_') ? 'Production Mode' : 'Test Mode');

const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-01-27.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature']!;

    console.log('Processing webhook with mode:', stripeKey.startsWith('sk_live_') ? 'Production' : 'Test');

    // 验证 webhook 签名
    const event = stripe.webhooks.constructEvent(
      buf,
      sig,
      webhookSecret
    );

    // 处理支付成功事件
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Payment completed in mode:', stripeKey.startsWith('sk_live_') ? 'Production' : 'Test');
      console.log('支付成功，会话ID:', session.id);
    }

    res.status(200).json({ 
      received: true,
      mode: stripeKey.startsWith('sk_live_') ? 'production' : 'test'
    });
  } catch (error) {
    console.error('Webhook 错误:', error);
    res.status(400).json({ 
      message: '验证失败',
      mode: stripeKey.startsWith('sk_live_') ? 'production' : 'test'
    });
  }
} 