import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Fetch all transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100); // Limit to last 100 transactions

    if (error) {
      console.error('Error fetching transactions:', error);
      return res.status(200).json({
        success: true,
        transactions: []
      });
    }

    return res.status(200).json({
      success: true,
      transactions: transactions || []
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(200).json({
      success: true,
      transactions: []
    });
  }
}