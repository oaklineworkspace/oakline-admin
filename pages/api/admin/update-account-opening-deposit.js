import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      depositId,
      amount,
      txHash,
      confirmations,
      status,
      rejectionReason,
      adminNotes,
      adminId
    } = req.body;

    console.log('Update deposit request:', { depositId, status, amount, adminId });

    if (!depositId) {
      return res.status(400).json({ error: 'Deposit ID is required' });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (amount !== undefined && amount !== null && amount !== '') {
      updateData.amount = parseFloat(amount);
      updateData.net_amount = parseFloat(amount);
    }

    if (txHash) {
      updateData.tx_hash = txHash;
    }

    if (confirmations !== undefined && confirmations !== null && confirmations !== '') {
      updateData.confirmations = parseInt(confirmations);
    }

    if (status) {
      updateData.status = status;

      if (status === 'approved' || status === 'completed') {
        updateData.approved_by = adminId;
        updateData.approved_at = new Date().toISOString();
        if (amount !== undefined && amount !== null && amount !== '') {
          updateData.approved_amount = parseFloat(amount);
        }
      }

      if (status === 'rejected' || status === 'failed') {
        updateData.rejected_by = adminId;
        updateData.rejected_at = new Date().toISOString();
        if (rejectionReason) {
          updateData.rejection_reason = rejectionReason;
        }
      }

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }

    if (adminNotes !== undefined && adminNotes !== null) {
      updateData.admin_notes = adminNotes;
    }

    console.log('Update data:', updateData);

    const { data: deposit, error } = await supabaseAdmin
      .from('account_opening_crypto_deposits')
      .update(updateData)
      .eq('id', depositId)
      .select('*, crypto_assets(*), admin_assigned_wallets(*)')
      .single();

    if (error) {
      console.error('Error updating deposit:', error);
      return res.status(500).json({ 
        error: 'Failed to update deposit',
        details: error.message 
      });
    }

    console.log('Deposit updated successfully:', deposit.id);

    return res.status(200).json({
      success: true,
      deposit,
      message: 'Deposit updated successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
