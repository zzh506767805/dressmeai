import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

// Initialize Stripe client
const stripeKey = process.env.STRIPE_SECRET_KEY!;
console.log('Stripe Key:', stripeKey);
console.log('Key prefix:', stripeKey.substring(0, 7));
console.log('Using Stripe key:', stripeKey.startsWith('sk_live_') ? 'Production Mode' : 'Test Mode');

const stripe = new Stripe(stripeKey, {
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
    console.log('Creating payment session with mode:', stripeKey.startsWith('sk_live_') ? 'Production' : 'Test');
    
    // Create payment session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Virtual Try-On Service',
              description: 'Generate your virtual try-on effect images',
            },
            unit_amount: 100, // Amount in cents (1 USD)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
    });

    // Return session URL
    res.status(200).json({ 
      url: session.url,
      mode: stripeKey.startsWith('sk_live_') ? 'production' : 'test',
      keyPrefix: stripeKey.substring(0, 7)
    });
  } catch (error) {
    console.error('Payment session creation failed:', error);
    res.status(500).json({ 
      message: 'Failed to create payment session',
      mode: stripeKey.startsWith('sk_live_') ? 'production' : 'test',
      keyPrefix: stripeKey.substring(0, 7)
    });
  }
} 