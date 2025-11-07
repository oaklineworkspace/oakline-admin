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
    const { accountId, status, reason } = req.body;

    if (!accountId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate status against schema
    const validStatuses = ['pending_application', 'approved', 'pending_funding', 'active', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }

    // Prepare update data
    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };

    // Add rejection reason if status is rejected
    if (status === 'rejected' && reason) {
      updateData.rejection_reason = reason;
    }

    // Update account status
    const { data, error: updateError } = await supabaseAdmin
      .from('accounts')
      .update(updateData)
      .eq('id', accountId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update account: ${updateError.message}`);
    }

    // Log the action in audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: authResult.user.id,
      action: `Account status changed to ${status}`,
      table_name: 'accounts',
      old_data: { account_id: accountId },
      new_data: data
    });

    res.status(200).json({
      success: true,
      message: 'Account status updated successfully',
      account: data
    });

  } catch (error) {
    console.error('Error updating account status:', error);
    res.status(500).json({
      error: error.message || 'Failed to update account status'
    });
  }
}
