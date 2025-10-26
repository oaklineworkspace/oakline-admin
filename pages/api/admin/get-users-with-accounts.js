
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .order('created_at', { ascending: false });

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return res.status(500).json({ 
        error: 'Failed to fetch users',
        details: profileError.message 
      });
    }

    // Fetch accounts for all users
    const { data: accounts, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (accountError) {
      console.error('Error fetching accounts:', accountError);
      return res.status(500).json({ 
        error: 'Failed to fetch accounts',
        details: accountError.message 
      });
    }

    // Combine users with their accounts
    const usersWithAccounts = profiles.map(profile => ({
      ...profile,
      accounts: accounts.filter(acc => acc.user_id === profile.id)
    }));

    return res.status(200).json({ 
      users: usersWithAccounts,
      total: usersWithAccounts.length 
    });

  } catch (error) {
    console.error('Error in get-users-with-accounts API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
