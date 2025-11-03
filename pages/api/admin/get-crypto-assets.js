
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
    const { data: assets, error } = await supabaseAdmin
      .from('crypto_assets')
      .select('*')
      .eq('status', 'active')
      .order('crypto_type', { ascending: true });

    if (error) {
      console.error('Error fetching crypto assets:', error);
      return res.status(500).json({ error: 'Failed to fetch crypto assets' });
    }

    // Group by crypto_type for easier frontend consumption
    const groupedAssets = {};
    assets.forEach(asset => {
      if (!groupedAssets[asset.crypto_type]) {
        groupedAssets[asset.crypto_type] = [];
      }
      groupedAssets[asset.crypto_type].push(asset.network_type);
    });

    return res.status(200).json({
      success: true,
      assets: assets || [],
      grouped: groupedAssets
    });

  } catch (error) {
    console.error('Error in get-crypto-assets API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
