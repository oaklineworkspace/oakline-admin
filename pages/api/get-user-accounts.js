
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user's accounts through profile/application connection
    const { data: profile } = await supabase
      .from('profiles')
      .select('application_id')
      .eq('id', user.id)
      .single();

    if (!profile?.application_id) {
      return res.status(404).json({ error: 'No application found for user' });
    }

    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .eq('application_id', profile.application_id)
      .eq('status', 'active');

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      return res.status(500).json({ error: 'Failed to fetch accounts' });
    }

    res.status(200).json({
      success: true,
      accounts: accounts || []
    });

  } catch (error) {
    console.error('Error in get-user-accounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
