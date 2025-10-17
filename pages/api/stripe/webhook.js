import Stripe from 'stripe';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false, // Stripe requires raw body for signature verification
  },
};

// Helper function to convert readable stream to buffer
const buffer = async (readable) => {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let event;
  const sig = req.headers['stripe-signature'];

  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      // Payment events
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      // Invoice events
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object);
        break;

      // Charge events
      case 'charge.succeeded':
        console.log('Charge succeeded:', event.data.object.id);
        break;

      case 'charge.failed':
        console.log('Charge failed:', event.data.object.id);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling event:', error);
    res.status(500).send('Server Error');
  }
}

// --- HANDLER FUNCTIONS ---

async function handlePaymentSuccess(paymentIntent) {
  const { accountId, userId, description } = paymentIntent.metadata;
  const amount = paymentIntent.amount / 100; // Stripe amounts are in cents

  // Update transaction in Supabase
  await supabaseAdmin
    .from('transactions')
    .update({ status: 'completed' })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Update account balance
  const { data: account } = await supabaseAdmin
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single();

  const newBalance = (parseFloat(account.balance || 0) + amount).toFixed(2);

  await supabaseAdmin
    .from('accounts')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', accountId);

  console.log(`Payment succeeded: $${amount} deposited to account ${accountId}`);
}

async function handlePaymentFailed(paymentIntent) {
  await supabaseAdmin
    .from('transactions')
    .update({ status: 'failed' })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  console.log(`Payment failed for intent ${paymentIntent.id}`);
}

async function handleInvoicePaid(invoice) {
  console.log('Invoice paid:', invoice.id);

  // Optional: update subscription or account
}

async function handleInvoiceFailed(invoice) {
  console.log('Invoice payment failed:', invoice.id);

  // Optional: notify user or mark subscription as unpaid
}
