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
        assigned_by:admin_id (
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wallets:', error);
      return res.status(500).json({ error: 'Failed to fetch wallets' });
    }

    // Format the response to include assigned_by_email
    const formattedWallets = wallets?.map(wallet => ({
      ...wallet,
      assigned_by_email: wallet.assigned_by?.email || 'Unknown'
    })) || [];

    return res.status(200).json({
      success: true,
      wallets: formattedWallets
    });

  } catch (error) {
    console.error('Error in get-user-wallets API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}