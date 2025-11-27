import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { tagId, is_active, is_public, allow_requests } = req.body;

    if (!tagId) {
      return res.status(400).json({ error: 'Tag ID is required' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('oakline_pay_profiles')
      .update({
        is_active,
        is_public,
        allow_requests,
        updated_at: new Date().toISOString()
      })
      .eq('id', tagId);

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      message: 'Oakline tag updated successfully'
    });
  } catch (error) {
    console.error('Error updating Oakline tag:', error);
    return res.status(500).json({
      error: 'Failed to update Oakline tag',
      details: error.message
    });
  }
}
