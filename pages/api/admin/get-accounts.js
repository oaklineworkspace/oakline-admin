import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: accounts, error } = await supabaseAdmin
      .from('accounts')
      .select(`
        id,
        account_number,
        account_type,
        balance,
        user_id,
        applications (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      return res.status(500).json({ error: 'Failed to fetch accounts' });
    }

    return res.status(200).json({ 
      success: true,
      accounts: accounts || [] 
    });
  } catch (error) {
    console.error('Error in get-accounts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}