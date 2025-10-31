import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status } = req.query;

    let query = supabaseAdmin
      .from('crypto_deposits')
      .select(`
        *,
        user:user_id (
          id,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: deposits, error } = await query;

    if (error) {
      console.error('Error fetching crypto deposits:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch crypto deposits',
        details: error.message 
      });
    }

    const enrichedDeposits = deposits.map(deposit => ({
      ...deposit,
      user_email: deposit.user?.email || 'Unknown'
    }));

    const summary = {
      total: deposits.length,
      pending: deposits.filter(d => d.status === 'pending').length,
      approved: deposits.filter(d => d.status === 'approved').length,
      rejected: deposits.filter(d => d.status === 'rejected').length,
      totalPendingAmount: deposits
        .filter(d => d.status === 'pending')
        .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
    };

    return res.status(200).json({ 
      success: true,
      deposits: enrichedDeposits,
      summary
    });

  } catch (error) {
    console.error('Error in get-crypto-deposits API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
