import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ message: 'Missing session_id' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id as string);
    
    // 检查支付状态
    const success = session.payment_status === 'paid';
    
    res.status(200).json({ success });
  } catch (error) {
    console.error('验证支付状态失败:', error);
    res.status(500).json({ message: '验证支付状态失败' });
  }
} 