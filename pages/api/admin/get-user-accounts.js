
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch all accounts for this user
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (accountsError) {
      console.error('Error fetching user accounts:', accountsError);
      return res.status(500).json({ 
        error: 'Failed to fetch accounts',
        details: accountsError.message 
      });
    }

    return res.status(200).json({
      success: true,
      accounts: accounts || [],
      count: accounts?.length || 0
    });

  } catch (error) {
    console.error('Error in get-user-accounts API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
