
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
      .from('account_opening_crypto_deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (depositError || !deposit) {
      console.error('Error fetching account opening deposit:', depositError);
      return res.status(404).json({ 
        error: 'Account opening deposit not found',
        details: depositError?.message 
      });
    }

    // Prevent deletion of completed or confirmed deposits that have been credited
    if (['confirmed', 'completed', 'approved'].includes(deposit.status) && deposit.approved_at) {
      return res.status(400).json({ 
        error: 'Cannot delete deposits that have been approved or completed. Please reject them first.' 
      });
    }

    console.log('Deleting account opening deposit:', depositId);

    // Delete the deposit
    const { error: deleteError } = await supabaseAdmin
      .from('account_opening_crypto_deposits')
      .delete()
      .eq('id', depositId);

    if (deleteError) {
      console.error('Error deleting account opening deposit:', deleteError);
      return res.status(500).json({ 
        error: 'Failed to delete account opening deposit',
        details: deleteError.message 
      });
    }

    console.log('Account opening deposit deleted successfully:', depositId);

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
      message: 'Account opening deposit deleted successfully'
    });

  } catch (error) {
    console.error('Error in delete-account-opening-deposit API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
