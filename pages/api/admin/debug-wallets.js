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
    // Fetch all account opening wallets (user_id IS NULL)
    const { data: wallets, error: walletsError } = await supabaseAdmin
      .from('admin_assigned_wallets')
      .select('id, crypto_type, network_type, wallet_address, user_id, created_at')
      .is('user_id', null)
      .order('created_at', { ascending: false });

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError);
      return res.status(500).json({ error: walletsError.message });
    }

    // Group by crypto_type + network_type to show duplicates
    const groupedByCombo = {};
    wallets.forEach(wallet => {
      const key = `${wallet.crypto_type}|||${wallet.network_type}`;
      if (!groupedByCombo[key]) {
        groupedByCombo[key] = [];
      }
      groupedByCombo[key].push(wallet);
    });

    const duplicates = Object.entries(groupedByCombo)
      .filter(([key, wallets]) => wallets.length > 1)
      .map(([key, wallets]) => ({
        combo: key.split('|||'),
        count: wallets.length,
        wallets: wallets
      }));

    return res.status(200).json({
      success: true,
      totalWallets: wallets.length,
      wallets,
      groupedByCombo,
      duplicates,
      hasDuplicates: duplicates.length > 0
    });

  } catch (error) {
    console.error('Error in debug-wallets:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
