import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status } = req.query;

    let query = supabaseAdmin
      .from('accounts')
      .select(`
        *,
        user_id,
        application_id,
        applications (
          id,
          first_name,
          last_name,
          email,
          account_types
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: accounts, error } = await query;

    if (error) {
      console.error('Error fetching accounts:', error);
      return res.status(500).json({ error: 'Failed to fetch accounts' });
    }

    // Filter accounts to only include those that match the user's selected account types
    const filteredAccounts = accounts ? accounts.filter(account => {
      // If no application data, keep the account (edge case)
      if (!account.applications) return true;

      const selectedAccountTypes = account.applications.account_types || [];

      // If no account types selected in application, keep it (edge case)
      if (selectedAccountTypes.length === 0) return true;

      // Only include accounts whose type was actually selected by the user
      return selectedAccountTypes.includes(account.account_type);
    }) : [];

    return res.status(200).json({
      success: true,
      accounts: filteredAccounts
    });
  } catch (error) {
    console.error('Error in get-accounts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}