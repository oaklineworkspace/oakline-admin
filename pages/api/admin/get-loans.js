
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch loans with user email from profiles
    const { data: loans, error } = await supabaseAdmin
      .from('loans')
      .select(`
        *,
        user:profiles!loans_user_id_fkey(email),
        account:accounts!loans_account_id_fkey(account_number, account_type)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching loans:', error);
      return res.status(500).json({ error: 'Failed to fetch loans', details: error.message });
    }

    // Transform the data to flatten user email
    const transformedLoans = loans.map(loan => ({
      ...loan,
      user_email: loan.user?.email || 'N/A',
      account_number: loan.account?.account_number || 'N/A',
      account_type: loan.account?.account_type || 'N/A'
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
