import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, status } = req.query;

    let query = supabaseAdmin
      .from('crypto_investments')
      .select(`
        *,
        users:user_id (
          email
        ),
        accounts:account_id (
          account_number,
          account_type
        ),
        crypto_assets:crypto_asset_id (
          crypto_type,
          symbol,
          network_type
        )
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: investments, error } = await query;

    if (error) {
      console.error('Error fetching crypto investments:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ investments: investments || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
