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
    // First, get all wallets
    const { data: wallets, error } = await supabaseAdmin
      .from('admin_assigned_wallets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wallets:', error);
      return res.status(500).json({ error: 'Failed to fetch wallets' });
    }

    // Get unique admin IDs
    const adminIds = [...new Set(wallets?.map(w => w.admin_id).filter(Boolean))];

    // Fetch admin emails separately
    const { data: admins, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select('id, email')
      .in('id', adminIds);

    if (adminError) {
      console.error('Error fetching admin profiles:', adminError);
    }

    // Create a map of admin IDs to emails
    const adminEmailMap = {};
    admins?.forEach(admin => {
      adminEmailMap[admin.id] = admin.email;
    });

    // Format the response to include assigned_by_email
    const formattedWallets = wallets?.map(wallet => ({
      ...wallet,
      assigned_by_email: adminEmailMap[wallet.admin_id] || 'Unknown'
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