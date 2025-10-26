import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status } = req.query;

    let query = supabaseAdmin
      .from('accounts')
      .select(`
        *,
        applications (
          first_name,
          last_name,
          email
        )
      `);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: accounts, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ accounts });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}