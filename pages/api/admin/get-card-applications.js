
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all card applications
    const { data: applications, error } = await supabaseAdmin
      .from('card_applications')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching card applications:', error);
      return res.status(500).json({ error: 'Failed to fetch card applications' });
    }

    // Manually fetch related user and account data
    const enrichedApplications = await Promise.all(
      (applications || []).map(async (app) => {
        // Fetch user data
        let userData = null;
        if (app.user_id) {
          const { data: user } = await supabaseAdmin
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('id', app.user_id)
            .single();
          
          if (user) {
            userData = {
              id: user.id,
              name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
              email: user.email
            };
          }
        }

        // Fetch account data
        let accountData = null;
        if (app.account_id) {
          const { data: account } = await supabaseAdmin
            .from('accounts')
            .select('id, account_number, account_type, balance')
            .eq('id', app.account_id)
            .single();
          
          if (account) {
            accountData = account;
          }
        }

        return {
          ...app,
          users: userData,
          accounts: accountData
        };
      })
    );

    res.status(200).json({ 
      success: true, 
      applications: enrichedApplications 
    });
  } catch (error) {
    console.error('Error in get-card-applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
