
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select('user_id, principal, status')
      .order('created_at', { ascending: false });

    if (loansError) {
      console.error('Error fetching loans:', loansError);
      return res.status(500).json({ error: 'Failed to fetch loans' });
    }

    const userLoanStats = {};
    (loans || []).forEach(loan => {
      if (!userLoanStats[loan.user_id]) {
        userLoanStats[loan.user_id] = {
          total_loans: 0,
          active_loans: 0,
          total_principal: 0
        };
      }
      userLoanStats[loan.user_id].total_loans += 1;
      if (loan.status === 'active' || loan.status === 'approved') {
        userLoanStats[loan.user_id].active_loans += 1;
      }
      userLoanStats[loan.user_id].total_principal += parseFloat(loan.principal || 0);
    });

    const userIds = Object.keys(userLoanStats);

    if (userIds.length === 0) {
      return res.status(200).json({ users: [] });
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return res.status(500).json({ error: 'Failed to fetch user profiles' });
    }

    const users = (profiles || []).map(profile => ({
      ...profile,
      ...userLoanStats[profile.id]
    }));

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error in get-users-with-loans:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
