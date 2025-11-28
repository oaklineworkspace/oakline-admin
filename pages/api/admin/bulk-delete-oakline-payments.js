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
    const { paymentIds } = req.body;

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({ error: 'Payment IDs are required' });
    }

    // Delete all payments
    const { error: deleteError } = await supabaseAdmin
      .from('oakline_pay_transactions')
      .delete()
      .in('id', paymentIds);

    if (deleteError) throw deleteError;

    return res.status(200).json({
      success: true,
      message: `${paymentIds.length} payment(s) deleted successfully`,
      deletedCount: paymentIds.length
    });
  } catch (error) {
    console.error('Error bulk deleting payments:', error);
    return res.status(500).json({
      error: 'Failed to delete payments',
      details: error.message
    });
  }
}
