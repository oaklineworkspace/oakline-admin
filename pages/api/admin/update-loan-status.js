
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { loanId, status, reason } = req.body;

    if (!loanId || !status) {
      return res.status(400).json({ error: 'Loan ID and status are required' });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    // Add rejection reason if provided
    if (status === 'rejected' && reason) {
      updateData.rejection_reason = reason;
    }

    // If approving, set disbursed_at and activate the loan
    if (status === 'approved') {
      updateData.status = 'active';
      updateData.disbursed_at = new Date().toISOString();
      updateData.remaining_balance = updateData.principal;
    }

    const { data: loan, error } = await supabaseAdmin
      .from('loans')
      .update(updateData)
      .eq('id', loanId)
      .select()
      .single();

    if (error) {
      console.error('Error updating loan status:', error);
      return res.status(500).json({ error: 'Failed to update loan status', details: error.message });
    }

    return res.status(200).json({
      success: true,
      message: `Loan ${status} successfully`,
      loan
    });

  } catch (error) {
    console.error('Error in update-loan-status:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
