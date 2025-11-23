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
    const { transactionIds } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ error: 'Transaction IDs are required' });
    }

    // Delete selected transactions
    const { error: deleteError, count } = await supabaseAdmin
      .from('transactions')
      .delete()
      .in('id', transactionIds);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw deleteError;
    }

    // Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: authResult.adminId,
        action: `Deleted ${transactionIds.length} selected transactions`,
        table_name: 'transactions'
      });

    res.status(200).json({
      success: true,
      message: 'Transactions deleted successfully',
      deleted: count || 0
    });
  } catch (error) {
    console.error('Error deleting transactions:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
