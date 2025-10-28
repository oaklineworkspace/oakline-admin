
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: deposits, error } = await supabaseAdmin
      .from('check_deposits')
      .select(`
        *,
        accounts (
          account_number,
          account_type,
          balance,
          applications (
            first_name,
            last_name,
            email
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching check deposits:', error);
      throw error;
    }

    res.status(200).json({
      success: true,
      deposits: deposits || []
    });
  } catch (error) {
    console.error('Error in get-check-deposits:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
