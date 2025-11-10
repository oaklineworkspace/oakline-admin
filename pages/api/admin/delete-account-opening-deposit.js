import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  // The original code only allowed DELETE and POST methods.
  // The intention is to ensure this handling is correct and to add authorization.
  // The original code already checks for these methods.
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    // The changes are in the client-side fetch logic, not this API handler.
    // This handler correctly processes the request body and performs the deletion.
    const { depositId } = req.body;

    console.log('Delete deposit request:', depositId);

    if (!depositId) {
      return res.status(400).json({ error: 'Deposit ID is required' });
    }

    // First, fetch the deposit to ensure it exists
    const { data: deposit, error: fetchError } = await supabaseAdmin
      .from('account_opening_crypto_deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (fetchError || !deposit) {
      console.error('Deposit not found:', fetchError);
      return res.status(404).json({ error: 'Deposit not found' });
    }

    // Prevent deletion of completed or confirmed deposits that have been credited
    if (['confirmed', 'completed', 'approved'].includes(deposit.status) && deposit.approved_at) {
      return res.status(400).json({
        error: 'Cannot delete deposits that have been approved or completed. Please reject them first.'
      });
    }

    // Delete the deposit
    const { error: deleteError } = await supabaseAdmin
      .from('account_opening_crypto_deposits')
      .delete()
      .eq('id', depositId);

    if (deleteError) {
      console.error('Error deleting deposit:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete deposit',
        details: deleteError.message
      });
    }

    console.log('Deposit deleted successfully:', depositId);

    // Log the deletion
    await supabaseAdmin
      .from('system_logs')
      .insert({
        level: 'warning',
        type: 'transaction',
        message: `Account opening crypto deposit deleted by admin`,
        details: {
          deposit_id: depositId,
          deleted_by: authResult.user.id,
          deleted_by_email: authResult.user.email,
          deposit_amount: deposit.amount,
          deposit_status: deposit.status,
          user_id: deposit.user_id,
          application_id: deposit.application_id,
          timestamp: new Date().toISOString()
        },
        admin_id: authResult.user.id
      });

    return res.status(200).json({
      success: true,
      message: 'Deposit deleted successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}