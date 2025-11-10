
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
    const { depositId } = req.body;

    if (!depositId) {
      return res.status(400).json({ error: 'Deposit ID is required' });
    }

    // Fetch the deposit to check if it exists and its status
    const { data: deposit, error: depositError } = await supabaseAdmin
      .from('crypto_deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (depositError || !deposit) {
      console.error('Error fetching deposit:', depositError);
      return res.status(404).json({ error: 'Deposit not found' });
    }

    // Prevent deletion of completed or confirmed deposits that have been credited
    if (['confirmed', 'completed'].includes(deposit.status) && deposit.approved_at) {
      return res.status(400).json({ 
        error: 'Cannot delete deposits that have been confirmed or completed. Please reverse them first.' 
      });
    }

    // Delete related audit logs first (if any)
    await supabaseAdmin
      .from('crypto_deposit_audit_logs')
      .delete()
      .eq('deposit_id', depositId);

    // Delete the deposit
    const { error: deleteError } = await supabaseAdmin
      .from('crypto_deposits')
      .delete()
      .eq('id', depositId);

    if (deleteError) {
      console.error('Error deleting deposit:', deleteError);
      return res.status(500).json({ error: 'Failed to delete deposit' });
    }

    // Log the deletion
    await supabaseAdmin
      .from('system_logs')
      .insert({
        level: 'warning',
        type: 'transaction',
        message: `Crypto deposit deleted by admin`,
        details: {
          deposit_id: depositId,
          deleted_by: authResult.user.id,
          deleted_by_email: authResult.user.email,
          deposit_amount: deposit.amount,
          deposit_status: deposit.status,
          user_id: deposit.user_id,
          timestamp: new Date().toISOString()
        },
        admin_id: authResult.user.id
      });

    return res.status(200).json({ 
      success: true,
      message: 'Deposit deleted successfully'
    });

  } catch (error) {
    console.error('Error in delete-crypto-deposit API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
