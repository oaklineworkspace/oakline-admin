
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all loans first
    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .order('created_at', { ascending: false });

    if (loansError) {
      console.error('Error fetching loans:', loansError);
      return res.status(500).json({ error: 'Failed to fetch loans', details: loansError.message });
    }

    if (!loans || loans.length === 0) {
      return res.status(200).json({
        success: true,
        loans: []
      });
    }

    // Get unique user IDs and account IDs
    const userIds = [...new Set(loans.map(loan => loan.user_id).filter(Boolean))];
    const accountIds = [...new Set(loans.map(loan => loan.account_id).filter(Boolean))];

    // Fetch user profiles
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    // Fetch accounts
    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('id, account_number, account_type')
      .in('id', accountIds);

    // Create lookup maps
    const profileMap = (profiles || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    const accountMap = (accounts || []).reduce((acc, account) => {
      acc[account.id] = account;
      return acc;
    }, {});

    // Transform the data to include user email and account info
    const transformedLoans = loans.map(loan => ({
      ...loan,
      user_email: profileMap[loan.user_id]?.email || 'N/A',
      account_number: accountMap[loan.account_id]?.account_number || 'N/A',
      account_type: accountMap[loan.account_id]?.account_type || 'N/A'
    }));

    return res.status(200).json({
      success: true,
      loans: transformedLoans
    });

  } catch (error) {
    console.error('Error in get-loans:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
