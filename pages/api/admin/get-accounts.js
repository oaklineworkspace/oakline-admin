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
    const { status, userId } = req.query;

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

    if (userId) {
      query = query.eq('user_id', userId);
    }

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

    // Fetch assigned wallets for these accounts' users
    const userIds = [...new Set(filteredAccounts.map(acc => acc.user_id).filter(Boolean))];
    
    let assignedWallets = [];
    if (userIds.length > 0) {
      const { data: wallets, error: walletsError } = await supabaseAdmin
        .from('admin_assigned_wallets')
        .select('*')
        .in('user_id', userIds);
      
      if (!walletsError && wallets) {
        assignedWallets = wallets;
      }
    }

    // Fetch account opening deposits for these accounts
    const accountIds = filteredAccounts.map(acc => acc.id).filter(Boolean);
    
    let deposits = [];
    if (accountIds.length > 0) {
      const { data: depositData, error: depositsError } = await supabaseAdmin
        .from('account_opening_crypto_deposits')
        .select(`
          *,
          crypto_assets:crypto_asset_id (
            crypto_type,
            symbol,
            network_type
          ),
          admin_assigned_wallets:assigned_wallet_id (
            wallet_address,
            memo,
            crypto_type,
            network_type
          )
        `)
        .in('account_id', accountIds);
      
      if (!depositsError && depositData) {
        deposits = depositData;
      }
    }

    // Attach wallet and deposit info to each account
    const accountsWithDetails = filteredAccounts.map(account => ({
      ...account,
      assigned_wallets: assignedWallets.filter(w => w.user_id === account.user_id),
      deposits: deposits.filter(d => d.account_id === account.id)
    }));

    return res.status(200).json({
      success: true,
      accounts: accountsWithDetails
    });
  } catch (error) {
    console.error('Error in get-accounts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}