import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    switch (method) {
      case 'GET':
        return await getCardTransactions(req, user.id, res);
      case 'POST':
        return await processCardTransaction(req, user.id, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in card-transactions API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getCardTransactions(req, userId, res) {
  try {
    const { cardId } = req.query;

    if (!cardId) {
      return res.status(400).json({ error: 'Card ID is required' });
    }

    // Verify card belongs to user first
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: 'Card not found or access denied' });
    }

    const { data: cardTransactions, error: transError } = await supabase
      .from('card_transactions')
      .select('*')
      .eq('card_id', cardId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (transError) {
      console.error('Error fetching transactions:', transError);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    res.status(200).json({
      success: true,
      transactions: cardTransactions || []
    });
  } catch (error) {
    console.error('Error in getCardTransactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

async function processCardTransaction(req, userId, res) {
  try {
    const { cardId, amount, merchant, location, transactionType = 'purchase' } = req.body;

    if (!cardId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid card ID and amount are required' });
    }

    // Get card details with account information
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        *,
        accounts!inner(
          id,
          balance
        )
      `)
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Check card status and lock
    if (card.status !== 'active') {
      return res.status(400).json({ error: 'Card is not active' });
    }

    if (card.is_locked) {
      return res.status(400).json({ error: 'Card is locked' });
    }

    // Check daily/monthly limits (simplified - you'd need to track spending periods)
    if (amount > card.daily_limit) {
      return res.status(400).json({ error: 'Transaction exceeds daily limit' });
    }

    // Check account balance
    if (card.accounts.balance < amount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Process transaction in a transaction block
    const { data: newTransaction, error: transactionError } = await supabase
      .from('card_transactions')
      .insert([{
        card_id: cardId,
        transaction_type: transactionType,
        amount: amount,
        merchant: merchant || 'Unknown Merchant',
        location: location || 'Unknown Location'
      }])
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating card transaction:', transactionError);
      return res.status(500).json({ error: 'Failed to process transaction' });
    }

    // Update account balance
    const { error: balanceError } = await supabase
      .from('accounts')
      .update({
        balance: card.accounts.balance - amount
      })
      .eq('id', card.account_id);

    if (balanceError) {
      console.error('Error updating account balance:', balanceError);
      return res.status(500).json({ error: 'Failed to update account balance' });
    }

    // Create corresponding account transaction
    await supabase
      .from('transactions')
      .insert([{
        user_id: userId,
        account_id: card.account_id,
        type: 'debit',
        amount: amount,
        description: `Card transaction at ${merchant || 'Unknown Merchant'}`,
        status: 'completed'
      }]);

    res.status(200).json({
      success: true,
      message: 'Transaction processed successfully',
      transaction: newTransaction,
      new_balance: card.accounts.balance - amount
    });
  } catch (error) {
    console.error('Error in processCardTransaction:', error);
    res.status(500).json({ error: 'Failed to process transaction' });
  }
}
