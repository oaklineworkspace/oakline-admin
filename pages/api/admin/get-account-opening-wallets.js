
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
    const { data: wallets, error } = await supabaseAdmin
      .from('admin_assigned_wallets')
      .select(`
        *,
        crypto_assets:crypto_type (
          id,
          crypto_type,
          symbol,
          network_type,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching account opening wallets:', error);
      throw new Error(error.message);
    }

    return res.status(200).json({
      success: true,
      wallets: wallets || []
    });

  } catch (error) {
    console.error('Error in get-account-opening-wallets:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch wallets'
    });
  }
}
