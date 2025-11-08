import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, status, applicationId } = req.query;

    let query = supabaseAdmin
      .from('account_opening_crypto_deposits')
      .select(`
        *,
        users:user_id (
          email
        ),
        applications:application_id (
          first_name,
          last_name,
          email
        ),
        accounts:account_id (
          account_number,
          account_type,
          status,
          min_deposit
        ),
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
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (applicationId) {
      query = query.eq('application_id', applicationId);
    }

    const { data: deposits, error } = await query;

    if (error) {
      console.error('Error fetching account opening deposits:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ deposits: deposits || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
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
    const { account_id, user_id, status } = req.query;

    let query = supabaseAdmin
      .from('account_opening_crypto_deposits')
      .select(`
        *,
        crypto_assets:crypto_asset_id (
          crypto_type,
          symbol,
          network_type
        ),
        assigned_wallets:assigned_wallet_id (
          wallet_address,
          memo
        )
      `)
      .order('created_at', { ascending: false });

    if (account_id) {
      query = query.eq('account_id', account_id);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: deposits, error } = await query;

    if (error) {
      console.error('Error fetching deposits:', error);
      throw new Error(error.message);
    }

    return res.status(200).json({
      success: true,
      deposits: deposits || [],
      count: deposits?.length || 0
    });

  } catch (error) {
    console.error('Error in get-account-opening-deposits:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch deposits'
    });
  }
}
