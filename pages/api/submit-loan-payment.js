import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization?.split(' ')[1]);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { loanId, amount, paymentMethod, referenceNumber } = req.body;

    if (!loanId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid loan ID and amount are required' });
    }

    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .eq('user_id', user.id)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found or you do not have permission to access it' });
    }

    const interestAmount = (parseFloat(loan.remaining_balance) * parseFloat(loan.interest_rate) / 100 / 12);
    const principalAmount = parseFloat(amount) - interestAmount;
    const balanceAfter = Math.max(0, parseFloat(loan.remaining_balance) - principalAmount);

    const { data: payment, error: paymentError } = await supabase
      .from('loan_payments')
      .insert({
        loan_id: loanId,
        amount: parseFloat(amount),
        principal_amount: principalAmount,
        interest_amount: interestAmount,
        balance_after: balanceAfter,
        payment_type: paymentMethod || 'user_payment',
        status: 'pending',
        reference_number: referenceNumber || null,
        notes: 'Submitted by user, awaiting admin approval',
        payment_date: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      return res.status(500).json({ error: 'Failed to submit payment', details: paymentError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment submitted successfully. Awaiting admin approval.',
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        payment_date: payment.payment_date
      }
    });

  } catch (error) {
    console.error('Error in submit-loan-payment:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
