import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    console.error('Admin auth failed:', authResult.error);
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { status } = req.query;

    let query = supabaseAdmin
      .from('crypto_deposits')
      .select(`
        *,
        crypto_asset:crypto_asset_id (
          crypto_type,
          network_type,
          symbol
        ),
        loan_wallet:loan_wallet_id (
          wallet_address,
          memo
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      if (status === 'verifying') {
        query = query.eq('status', 'pending').not('confirmed_at', 'is', null);
      } else {
        query = query.eq('status', status);
      }
    }

    const { data: deposits, error } = await query;

    if (error) {
      console.error('Error fetching crypto deposits:', error);
      return res.status(500).json({
        error: 'Failed to fetch crypto deposits',
        details: error.message
      });
    }

    // Fetch user emails from profiles table
    const userIds = [...new Set(deposits.map(d => d.user_id).filter(Boolean))];
    let userEmailMap = {};
    let accountMap = {};

    if (userIds.length > 0) {
      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
      } else {
        profiles?.forEach(profile => {
          userEmailMap[profile.id] = {
            email: profile.email || 'N/A',
            name: profile.first_name && profile.last_name 
              ? `${profile.first_name} ${profile.last_name}`.trim()
              : (profile.first_name || profile.last_name || 'N/A')
          };
        });
      }

      // Fetch accounts for all users
      const { data: accounts, error: accountsError } = await supabaseAdmin
        .from('accounts')
        .select('id, user_id, account_number, account_type, balance')
        .in('user_id', userIds);

      if (accountsError) {
        console.error('Error fetching accounts:', accountsError);
      } else {
        accounts?.forEach(account => {
          if (!accountMap[account.user_id]) {
            accountMap[account.user_id] = [];
          }
          accountMap[account.user_id].push(account);
        });
      }
    }

    // Fetch assigned wallet addresses for deposits
    const { data: wallets, error: walletsError } = await supabaseAdmin
      .from('admin_assigned_wallets')
      .select('user_id, crypto_type, network_type, wallet_address')
      .in('user_id', userIds);

    let walletMap = {};
    if (!walletsError && wallets) {
      wallets.forEach(wallet => {
        const key = `${wallet.user_id}_${wallet.crypto_type}_${wallet.network_type}`;
        walletMap[key] = wallet.wallet_address;
      });
    }

    // Enrich deposits with user emails, account numbers, and wallet addresses
    const enrichedDeposits = deposits.map(deposit => {
      const userInfo = userEmailMap[deposit.user_id] || { email: 'N/A', name: 'N/A' };
      const userAccounts = accountMap[deposit.user_id] || [];
      
      // Find the account that matches this deposit
      let accountNumber = 'N/A';
      if (deposit.account_id) {
        const matchingAccount = userAccounts.find(acc => acc.id === deposit.account_id);
        accountNumber = matchingAccount?.account_number || 'N/A';
      } else if (userAccounts.length > 0) {
        // Fallback to first account if no specific account_id
        accountNumber = userAccounts[0].account_number;
      }

      // Extract crypto asset data from the join
      const cryptoType = deposit.crypto_asset?.crypto_type || 'Unknown';
      const networkType = deposit.crypto_asset?.network_type || 'N/A';
      const symbol = deposit.crypto_asset?.symbol || '';

      // Extract wallet address from loan_wallet join or fall back to assigned wallets
      let walletAddress = deposit.loan_wallet?.wallet_address || 'N/A';
      let walletMemo = deposit.loan_wallet?.memo || null;
      
      if (walletAddress === 'N/A') {
        const walletKey = `${deposit.user_id}_${cryptoType}_${networkType}`;
        walletAddress = walletMap[walletKey] || 'N/A';
      }

      return {
        ...deposit,
        user_email: userInfo.email,
        user_name: userInfo.name,
        account_number: accountNumber,
        crypto_type: cryptoType,
        network_type: networkType,
        symbol: symbol,
        wallet_address: walletAddress,
        wallet_memo: walletMemo
      };
    });

    const summary = {
      total: deposits.length,
      pending: deposits.filter(d => d.status === 'pending' && !d.confirmed_at).length,
      verifying: deposits.filter(d => d.status === 'pending' && d.confirmed_at).length,
      confirmed: deposits.filter(d => d.status === 'confirmed').length,
      rejected: deposits.filter(d => d.status === 'rejected').length,
      reversed: deposits.filter(d => d.status === 'reversed').length,
      totalPendingAmount: deposits
        .filter(d => d.status === 'pending')
        .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
    };

    return res.status(200).json({
      success: true,
      deposits: enrichedDeposits,
      summary
    });

  } catch (error) {
    console.error('Error in get-crypto-deposits API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}