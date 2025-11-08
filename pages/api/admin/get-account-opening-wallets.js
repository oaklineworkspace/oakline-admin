
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
    // First, fetch all wallets
    const { data: wallets, error: walletsError } = await supabaseAdmin
      .from('admin_assigned_wallets')
      .select('*')
      .order('created_at', { ascending: false });

    if (walletsError) {
      console.error('Error fetching account opening wallets:', walletsError);
      throw new Error(walletsError.message);
    }

    // Then fetch all crypto assets
    const { data: cryptoAssets, error: assetsError } = await supabaseAdmin
      .from('crypto_assets')
      .select('*')
      .eq('status', 'active');

    if (assetsError) {
      console.error('Error fetching crypto assets:', assetsError);
      throw new Error(assetsError.message);
    }

    // Map crypto assets to wallets by matching crypto_type and network_type
    const walletsWithAssets = wallets.map(wallet => {
      const matchingAsset = cryptoAssets.find(
        asset => asset.crypto_type === wallet.crypto_type && 
                 asset.network_type === wallet.network_type
      );

      return {
        ...wallet,
        crypto_assets: matchingAsset || null,
        crypto_asset_id: matchingAsset?.id || null
      };
    });

    return res.status(200).json({
      success: true,
      wallets: walletsWithAssets || []
    });

  } catch (error) {
    console.error('Error in get-account-opening-wallets:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch wallets'
    });
  }
}
