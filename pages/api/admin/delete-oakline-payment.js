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
    const { paymentId, isTransaction } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    // Delete from transactions table if isTransaction flag is set, otherwise from pending payments
    const tableName = isTransaction ? 'oakline_pay_transactions' : 'oakline_pay_pending_payments';

    const { error: deleteError } = await supabaseAdmin
      .from(tableName)
      .delete()
      .eq('id', paymentId);

    if (deleteError) throw deleteError;

    return res.status(200).json({
      success: true,
      message: `${isTransaction ? 'Transaction' : 'Payment'} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return res.status(500).json({
      error: 'Failed to delete payment',
      details: error.message
    });
  }
}
