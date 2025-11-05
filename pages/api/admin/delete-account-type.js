
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
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Account type ID is required' });
    }

    const { error } = await supabaseAdmin
      .from('account_types')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Account type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account type:', error);
    return res.status(500).json({
      error: 'Failed to delete account type',
      details: error.message
    });
  }
}
