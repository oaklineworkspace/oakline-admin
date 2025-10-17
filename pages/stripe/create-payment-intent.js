
import Stripe from 'stripe';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, accountId, userId, description } = req.body;

    if (!amount || !accountId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify the account belongs to the user
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Verify user exists in auth
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        accountId: accountId,
        userId: userId,
        description: description || 'Account deposit',
        type: 'deposit'
      },
      description: `Deposit to account ${account.account_number}`,
    });

    // Store pending transaction
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        account_id: accountId,
        user_id: userId,
        type: 'deposit',
        amount: parseFloat(amount),
        description: description || 'Account deposit',
        status: 'pending',
        stripe_payment_intent_id: paymentIntent.id,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
      return res.status(500).json({ error: 'Failed to create transaction record' });
    }

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Stripe payment intent creation error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
}
