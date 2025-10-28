
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

    // Verify account exists and belongs to user
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (accountError || !account) {
      console.error('Account verification error:', accountError);
      return res.status(400).json({ error: 'Invalid account or account does not belong to user' });
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
        card_type: cardType || cardCategory || 'debit',
        cvc: cvc,
        expiry_date: expiryDate,
        daily_limit: parseFloat(dailyLimit) || 1000.00,
        monthly_limit: parseFloat(monthlyLimit) || 10000.00,
        status: 'active',
        is_locked: false,
        daily_spent: 0.00,
        monthly_spent: 0.00
      })
      .select()
      .single();

    if (cardError) {
      console.error('Error issuing card:', cardError);
      console.error('Card data attempted:', {
        user_id: userId,
        account_id: accountId,
        cardholder_name: cardholderName,
        card_number: cardNumber,
        card_brand: cardBrand,
        card_category: cardCategory
      });
      return res.status(500).json({ 
        error: 'Failed to issue card', 
        details: cardError.message,
        code: cardError.code 
      });
    }

    console.log('Card issued successfully:', card.id);

    return res.status(200).json({
      success: true,
      message: 'Card issued successfully',
      card: card
    });

  } catch (error) {
    console.error('Error in issue-card:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
