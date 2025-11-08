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
      // If no application data, exclude the account
      if (!account.applications) {
        console.log('Account has no application data:', account.id);
        return false;
      }

      const selectedAccountTypes = account.applications.account_types || [];

      // If no account types selected in application, exclude it
      if (!Array.isArray(selectedAccountTypes) || selectedAccountTypes.length === 0) {
        console.log('Application has no account types:', account.application_id);
        return false;
      }

      // Ensure account_type exists
      if (!account.account_type) {
        console.log('Account has no account_type:', account.id);
        return false;
      }

      // Only include accounts whose type was actually selected by the user
      const isIncluded = selectedAccountTypes.includes(account.account_type);
      
      if (!isIncluded) {
        console.log(`Filtering out account ${account.account_number} (${account.account_type}) - not in selected types:`, selectedAccountTypes);
      }
      
      return isIncluded;
    }) : [];

    console.log(`Filtered ${accounts?.length || 0} accounts down to ${filteredAccounts.length}`);

    return res.status(200).json({
      success: true,
      accounts: filteredAccounts
    });
  } catch (error) {
    console.error('Error in get-accounts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}