
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, accountId, cardType, cardholderName } = req.body;

    if (!userId || !accountId || !cardholderName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already has a card for this account
    const { data: existingCard } = await supabaseAdmin
      .from('cards')
      .select('id')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('status', 'active')
      .single();

    if (existingCard) {
      return res.status(400).json({ error: 'User already has an active card for this account' });
    }

    // Generate card details
    const generateCardNumber = () => {
      const prefix = '4532';
      let cardNumber = prefix;
      for (let i = 0; i < 12; i++) {
        cardNumber += Math.floor(Math.random() * 10);
      }
      return cardNumber.match(/.{1,4}/g).join(' ');
    };

    const generateExpiryDate = () => {
      const now = new Date();
      const expiryYear = now.getFullYear() + 3;
      const expiryMonth = String(now.getMonth() + 1).padStart(2, '0');
      return `${expiryMonth}/${expiryYear.toString().slice(-2)}`;
    };

    const generateCVV = () => {
      return Math.floor(100 + Math.random() * 900).toString();
    };

    // Get account details
    const { data: accountData, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('account_number, account_type')
      .eq('id', accountId)
      .single();

    if (accountError || !accountData) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const cardNumber = generateCardNumber();
    const expiryDate = generateExpiryDate();
    const cvv = generateCVV();

    // Insert card directly (admin assignment)
    const { data: cardData, error: cardError } = await supabaseAdmin
      .from('cards')
      .insert({
        user_id: userId,
        account_id: accountId,
        card_number: cardNumber,
        cardholder_name: cardholderName.toUpperCase(),
        expiry_date: expiryDate,
        cvv: cvv,
        card_type: cardType || 'debit',
        status: 'active',
        daily_limit: 2000.00,
        monthly_limit: 10000.00,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (cardError) {
      console.error('Error creating card:', cardError);
      return res.status(500).json({ error: 'Failed to create card' });
    }

    res.status(200).json({
      success: true,
      message: 'Card assigned successfully',
      card: cardData,
      cardDetails: {
        cardNumber,
        expiryDate,
        cvv
      }
    });

  } catch (error) {
    console.error('Card assignment error:', error);
    res.status(500).json({ error: error.message || 'Failed to assign card' });
  }
}
