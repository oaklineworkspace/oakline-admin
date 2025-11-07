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

    if (!depositId) {
      return res.status(400).json({ error: 'Deposit ID is required' });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (amount !== undefined) {
      updateData.amount = amount;
      updateData.net_amount = amount; // Can subtract fee if needed
    }

    if (txHash) {
      updateData.tx_hash = txHash;
    }

    if (confirmations !== undefined) {
      updateData.confirmations = confirmations;
    }

    if (status) {
      updateData.status = status;

      if (status === 'approved') {
        updateData.approved_by = adminId;
        updateData.approved_at = new Date().toISOString();
        updateData.approved_amount = amount || 0;
      }

      if (status === 'rejected') {
        updateData.rejected_by = adminId;
        updateData.rejected_at = new Date().toISOString();
        updateData.rejection_reason = rejectionReason;
      }

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }

    if (adminNotes) {
      updateData.admin_notes = adminNotes;
    }

    const { data: deposit, error } = await supabaseAdmin
      .from('account_opening_crypto_deposits')
      .update(updateData)
      .eq('id', depositId)
      .select()
      .single();

    if (error) {
      console.error('Error updating deposit:', error);
      return res.status(500).json({ error: 'Failed to update deposit' });
    }

    return res.status(200).json({
      success: true,
      deposit,
      message: 'Deposit updated successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
