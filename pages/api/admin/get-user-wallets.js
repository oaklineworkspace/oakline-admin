
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
    const { userId } = req.query;

    let query = supabaseAdmin
      .from('user_crypto_wallets')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: wallets, error } = await query;

    if (error) {
      console.error('Error fetching wallets:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch wallets',
        details: error.message 
      });
    }

    // Fetch admin info for assigned_by
    const adminIds = [...new Set(wallets.map(w => w.assigned_by).filter(Boolean))];
    const { data: admins } = await supabaseAdmin.auth.admin.listUsers();
    
    const adminEmailMap = {};
    if (admins && admins.users) {
      admins.users.forEach(admin => {
        adminEmailMap[admin.id] = admin.email;
      });
    }

    const enrichedWallets = wallets.map(wallet => ({
      ...wallet,
      assigned_by_email: adminEmailMap[wallet.assigned_by] || 'System'
    }));

    return res.status(200).json({ 
      success: true,
      wallets: enrichedWallets
    });

  } catch (error) {
    console.error('Error in get-user-wallets API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
