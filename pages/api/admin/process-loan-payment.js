
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { loanId, amount, note } = req.body;

    if (!loanId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid loan ID and amount are required' });
    }

    // Fetch the loan
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Calculate payment breakdown
    const interestAmount = (parseFloat(loan.remaining_balance) * parseFloat(loan.interest_rate) / 100 / 12);
    const principalAmount = parseFloat(amount) - interestAmount;
    const newBalance = Math.max(0, parseFloat(loan.remaining_balance) - principalAmount);

    // Create loan payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('loan_payments')
      .insert({
        loan_id: loanId,
        amount: parseFloat(amount),
        principal_amount: principalAmount,
        interest_amount: interestAmount,
        balance_after: newBalance,
        payment_type: 'manual',
        status: 'completed',
        notes: note,
        payment_date: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      return res.status(500).json({ error: 'Failed to create payment', details: paymentError.message });
    }

    // Update loan
    const updateData = {
      remaining_balance: newBalance,
      last_payment_date: new Date().toISOString(),
      payments_made: (loan.payments_made || 0) + 1,
      is_late: false,
      updated_at: new Date().toISOString()
    };

    // Calculate next payment date (30 days from now)
    const nextPaymentDate = new Date();
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
    updateData.next_payment_date = nextPaymentDate.toISOString().split('T')[0];

    // If balance is zero, close the loan
    if (newBalance === 0) {
      updateData.status = 'closed';
    }

    const { error: updateError } = await supabaseAdmin
      .from('loans')
      .update(updateData)
      .eq('id', loanId);

    if (updateError) {
      console.error('Error updating loan:', updateError);
      return res.status(500).json({ error: 'Failed to update loan', details: updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      payment,
      newBalance
    });

  } catch (error) {
    console.error('Error in process-loan-payment:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
