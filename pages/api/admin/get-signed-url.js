import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await verifyAdminAuth(req);
    if (authResult.error) {
      return res.status(authResult.status || 401).json({ error: authResult.error });
    }

    const { path, bucket = 'crypto-deposit-proofs' } = req.body;

    if (!path) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const { data, error } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (error) {
      console.error('Error creating signed URL:', error);
      return res.status(500).json({ error: 'Failed to create signed URL: ' + error.message });
    }

    return res.status(200).json({
      success: true,
      signedUrl: data.signedUrl
    });

  } catch (error) {
    console.error('Error in get-signed-url:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
