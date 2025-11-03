
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
      .order('crypto_type', { ascending: true })
      .order('network_type', { ascending: true });

    if (error) {
      console.error('Error fetching all crypto assets:', error);
      return res.status(500).json({ error: 'Failed to fetch crypto assets' });
    }

    return res.status(200).json({
      success: true,
      assets: assets || []
    });

  } catch (error) {
    console.error('Error in get-all-crypto-assets API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
