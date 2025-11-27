import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { tagId } = req.body;

    if (!tagId) {
      return res.status(400).json({ error: 'Tag ID is required' });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('oakline_pay_profiles')
      .delete()
      .eq('id', tagId);

    if (deleteError) throw deleteError;

    return res.status(200).json({
      success: true,
      message: 'Tag deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return res.status(500).json({
      error: 'Failed to delete tag',
      details: error.message
    });
  }
}
