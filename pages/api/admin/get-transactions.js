import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all transactions
    const { data: transactions, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100); // Limit to last 100 transactions

    if (error) {
      console.error('Error fetching transactions:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    return res.status(200).json({
      success: true,
      transactions: transactions || []
    });
  } catch (error) {
    console.error('Error in get-transactions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}