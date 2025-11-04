import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { data: applicationsData, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (appError) {
      console.error('Error fetching applications:', appError);
      throw new Error('Failed to fetch applications: ' + appError.message);
    }

    const { data: accountsData, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select(`
        *,
        applications!accounts_application_id_fkey(
          id,
          first_name,
          last_name,
          email,
          user_id
        )
      `)
      .order('created_at', { ascending: false });

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      throw new Error('Failed to fetch accounts: ' + accountsError.message);
    }

    return res.status(200).json({
      users: applicationsData || [],
      accounts: accountsData || []
    });
  } catch (error) {
    console.error('Error in get-accounts API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
