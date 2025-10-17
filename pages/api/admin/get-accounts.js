import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Fetch all accounts with related application data
    const { data: accounts, error } = await supabaseAdmin
      .from('accounts')
      .select(`
        *,
        applications:application_id (
          email,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      return res.status(500).json({ 
        message: 'Failed to fetch accounts',
        error: error.message 
      });
    }

    return res.status(200).json({
      success: true,
      accounts: accounts || []
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  }
}