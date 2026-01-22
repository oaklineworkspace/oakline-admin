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
        admin_assigned_wallets:assigned_wallet_id (
          wallet_address,
          memo,
          crypto_type,
          network_type
        ),
        accounts:account_id (
          *,
          applications (
            first_name,
            last_name,
            email
          ),
          profiles:user_id (
            first_name,
            last_name,
            email
          )
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