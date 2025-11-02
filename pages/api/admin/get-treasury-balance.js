
import { supabase } from '../../../lib/supabaseClient';

const TREASURY_USER_ID = '7f62c3ec-31fe-4952-aa00-2c922064d56a';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Fetch treasury account balance
    const { data: treasuryAccount, error: fetchError } = await supabase
      .from('accounts')
      .select('balance')
      .eq('user_id', TREASURY_USER_ID)
      .single();

    if (fetchError) {
      console.error('Error fetching treasury account:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch treasury balance' });
    }

    if (!treasuryAccount) {
      return res.status(404).json({ error: 'Treasury account not found' });
    }

    return res.status(200).json({ 
      balance: parseFloat(treasuryAccount.balance || 0)
    });

  } catch (error) {
    console.error('Error in get-treasury-balance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
