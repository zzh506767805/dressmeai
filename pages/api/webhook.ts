import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';

// 禁用 body parsing，因为我们需要原始请求体来验证 webhook
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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

    // 验证 webhook 签名
    const event = stripe.webhooks.constructEvent(
      buf,
      sig,
      webhookSecret
    );

    // 处理支付成功事件
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // TODO: 在这里触发图片生成流程
      // 1. 获取用户上传的图片
      // 2. 调用生成 API
      // 3. 更新数据库中的支付状态
      console.log('支付成功，会话ID:', session.id);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook 错误:', error);
    res.status(400).json({ message: '验证失败' });
  }
} 