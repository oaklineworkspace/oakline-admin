
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      accountId,
      cardholderName,
      cardNumber,
      cardBrand,
      cardCategory,
      cardType,
      cvc,
      expiryDate,
      dailyLimit,
      monthlyLimit
    } = req.body;

    if (!userId || !accountId || !cardholderName || !cardNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert the new card
    const { data: card, error: cardError } = await supabaseAdmin
      .from('cards')
      .insert({
        user_id: userId,
        account_id: accountId,
        cardholder_name: cardholderName,
        card_number: cardNumber,
        card_brand: cardBrand || 'visa',
        card_category: cardCategory || 'debit',
        card_type: cardType || 'debit',
        cvc: cvc,
        expiry_date: expiryDate,
        daily_limit: dailyLimit || 1000,
        monthly_limit: monthlyLimit || 10000,
        status: 'active',
        is_locked: false,
        daily_spent: 0,
        monthly_spent: 0
      })
      .select()
      .single();

    if (cardError) {
      console.error('Error issuing card:', cardError);
      return res.status(500).json({ error: 'Failed to issue card', details: cardError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Card issued successfully',
      card: card
    });

  } catch (error) {
    console.error('Error in issue-card:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
