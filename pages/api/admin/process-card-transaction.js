
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cardId, amount, merchant, location, transactionType } = req.body;

    // Validate required fields
    if (!cardId || !amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Card ID and valid amount are required' 
      });
    }

    // Call the PostgreSQL function to process the transaction
    const { data, error } = await supabase.rpc('process_card_transaction', {
      p_card_id: parseInt(cardId),
      p_amount: parseFloat(amount),
      p_merchant: merchant || 'Unknown Merchant',
      p_location: location || 'Unknown Location',
      p_transaction_type: transactionType || 'purchase'
    });

    if (error) {
      console.error('Error processing card transaction:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error: ' + error.message 
      });
    }

    // Return the result from the PostgreSQL function
    res.status(200).json(data);

  } catch (error) {
    console.error('Error in process-card-transaction API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
}
