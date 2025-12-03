
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentId, action, rejectionReason, refundReason, adminId } = req.body;

    if (!paymentId || !action) {
      return res.status(400).json({ error: 'Payment ID and action are required' });
    }

    if (!['approve', 'reject', 'fail', 'refund_request', 'refund_approve', 'refund_reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Fetch the payment with loan details
    const { data: payment, error: fetchError } = await supabase
      .from('loan_payments')
      .select(`
        *,
        loans (
          id,
          user_id,
          remaining_balance,
          status,
          monthly_payment,
          next_payment_date
        )
      `)
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      console.error('Payment fetch error:', fetchError);
      return res.status(404).json({ error: 'Payment not found' });
    }

    let updateData = {
      updated_at: new Date().toISOString()
    };

    let loanUpdate = null;

    // Handle different actions
    switch (action) {
      case 'approve':
        if (payment.status !== 'pending') {
          return res.status(400).json({ error: `Payment is already ${payment.status}. Only pending payments can be approved.` });
        }

        updateData = {
          ...updateData,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: adminId,
          processed_at: new Date().toISOString()
        };

        // Calculate new loan balance
        const newBalance = Math.max(0, payment.loans.remaining_balance - payment.principal_amount);
        const isFullyPaid = newBalance === 0;

        loanUpdate = {
          remaining_balance: newBalance,
          status: isFullyPaid ? 'paid' : 'active',
          updated_at: new Date().toISOString()
        };

        // If not fully paid, calculate next payment date
        if (!isFullyPaid) {
          const nextPaymentDate = new Date(payment.loans.next_payment_date);
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          loanUpdate.next_payment_date = nextPaymentDate.toISOString().split('T')[0];
        }

        // Create transaction record for approved payment
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: payment.user_id,
            account_id: payment.account_id,
            type: 'loan_payment',
            amount: payment.payment_amount,
            description: `Loan payment approved - Principal: $${payment.principal_amount}, Interest: $${payment.interest_amount}`,
            status: 'completed',
            reference_number: payment.reference_number,
            created_at: new Date().toISOString()
          });

        if (txError) {
          console.error('Transaction creation error:', txError);
        }
        break;

      case 'reject':
        if (payment.status !== 'pending') {
          return res.status(400).json({ error: `Payment is already ${payment.status}. Only pending payments can be rejected.` });
        }

        updateData = {
          ...updateData,
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: adminId,
          rejection_reason: rejectionReason || 'No reason provided'
        };
        break;

      case 'fail':
        if (payment.status !== 'pending' && payment.status !== 'processing') {
          return res.status(400).json({ error: `Cannot mark ${payment.status} payment as failed.` });
        }

        updateData = {
          ...updateData,
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: rejectionReason || 'Payment processing failed',
          retry_count: (payment.retry_count || 0) + 1
        };
        break;

      case 'refund_request':
        if (!['approved', 'completed'].includes(payment.status)) {
          return res.status(400).json({ error: 'Only approved/completed payments can be refunded' });
        }

        updateData = {
          ...updateData,
          status: 'refund_requested',
          refund_requested_at: new Date().toISOString(),
          refund_reason: refundReason || 'Refund requested',
          refund_amount: payment.payment_amount
        };
        break;

      case 'refund_approve':
        if (payment.status !== 'refund_requested') {
          return res.status(400).json({ error: 'Only refund requested payments can be approved for refund' });
        }

        updateData = {
          ...updateData,
          status: 'refund_completed',
          refund_processed_at: new Date().toISOString(),
          refund_method: 'account_credit'
        };

        // Restore loan balance
        loanUpdate = {
          remaining_balance: payment.loans.remaining_balance + payment.principal_amount,
          updated_at: new Date().toISOString()
        };

        // Create refund transaction
        const { error: refundTxError } = await supabase
          .from('transactions')
          .insert({
            user_id: payment.user_id,
            account_id: payment.account_id,
            type: 'refund',
            amount: payment.payment_amount,
            description: `Loan payment refund - Ref: ${payment.reference_number}`,
            status: 'completed',
            created_at: new Date().toISOString()
          });

        if (refundTxError) {
          console.error('Refund transaction error:', refundTxError);
        }
        break;

      case 'refund_reject':
        if (payment.status !== 'refund_requested') {
          return res.status(400).json({ error: 'Only refund requested payments can be rejected' });
        }

        updateData = {
          ...updateData,
          status: 'refund_rejected',
          refund_notes: rejectionReason || 'Refund request rejected'
        };
        break;
    }

    // Update the payment
    const { data: updatedPayment, error: updateError } = await supabase
      .from('loan_payments')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError) {
      console.error('Payment update error:', updateError);
      return res.status(500).json({ error: 'Failed to update payment', details: updateError.message });
    }

    // Update loan if needed
    if (loanUpdate && payment.loans) {
      const { error: loanUpdateError } = await supabase
        .from('loans')
        .update(loanUpdate)
        .eq('id', payment.loans.id);

      if (loanUpdateError) {
        console.error('Loan update error:', loanUpdateError);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Payment ${action} successful`,
      payment: updatedPayment
    });

  } catch (error) {
    console.error('Error in approve-loan-payment:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
