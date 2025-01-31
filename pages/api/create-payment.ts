import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

// 初始化 Stripe 客户端
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 创建支付会话
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: '虚拟试衣服务',
              description: '生成您的虚拟试衣效果图',
            },
            unit_amount: 100, // 金额为 1 美元 (金额以分为单位)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
    });

    // 返回支付会话 URL
    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('创建支付会话失败:', error);
    res.status(500).json({ message: '创建支付会话失败' });
  }
} 