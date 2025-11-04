
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
    const { paymentId, action, rejectionReason } = req.body;

    if (!paymentId || !action) {
      return res.status(400).json({ error: 'Payment ID and action are required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be either "approve" or "reject"' });
    }

    // Fetch payment with loan and account details
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('loan_payments')
      .select(`
        *,
        loans!inner(
          id,
          user_id,
          account_id,
          loan_type,
          remaining_balance,
          principal,
          interest_rate,
          payments_made,
          term_months,
          status,
          accounts!inner(
            id,
            account_number,
            balance,
            user_id
          )
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if already processed
    if (payment.status === 'completed') {
      return res.status(400).json({ 
        error: 'Payment already completed',
        details: 'This payment has already been approved and processed'
      });
    }

    if (payment.status === 'failed') {
      return res.status(400).json({ 
        error: 'Payment already rejected',
        details: 'This payment has already been rejected'
      });
    }

    if (action === 'reject') {
      // Reject the payment
      const { error: rejectError } = await supabaseAdmin
        .from('loan_payments')
        .update({
          status: 'failed',
          notes: rejectionReason || 'Rejected by admin',
          processed_by: authResult.adminId,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (rejectError) {
        return res.status(500).json({ error: 'Failed to reject payment' });
      }

      return res.status(200).json({
        success: true,
        message: 'Payment rejected successfully',
        payment_id: paymentId,
        status: 'failed'
      });
    }

    // APPROVE ACTION - Process the payment
    const paymentAmount = parseFloat(payment.amount);
    const paymentMethod = payment.metadata?.payment_method || payment.payment_method;
    const accountId = payment.metadata?.account_id || payment.loans.account_id;

    let transactionId = null;
    let treasuryTransactionId = null;

    // If payment method is account balance, deduct funds
    if (paymentMethod === 'account_balance') {
      const userAccount = payment.loans.accounts;
      const currentBalance = parseFloat(userAccount.balance);

      // Verify funds are still available
      if (currentBalance < paymentAmount) {
        return res.status(400).json({
          error: 'Insufficient funds',
          details: `User account balance is now $${currentBalance.toLocaleString()}, but payment requires $${paymentAmount.toLocaleString()}`
        });
      }

      const newBalance = currentBalance - paymentAmount;

      // Deduct from user account
      const { error: balanceError } = await supabaseAdmin
        .from('accounts')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (balanceError) {
        return res.status(500).json({ error: 'Failed to deduct from user account' });
      }

      // Create user debit transaction
      const { data: userTx, error: userTxError } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: payment.loans.user_id,
          account_id: accountId,
          type: 'debit',
          amount: paymentAmount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: `Loan payment for ${payment.loans.loan_type} loan`,
          category: 'loan_payment',
          status: 'completed',
          reference: payment.reference_number,
          metadata: {
            loan_id: payment.loan_id,
            payment_id: paymentId,
            approved_by: authResult.adminId
          }
        })
        .select()
        .single();

      if (userTxError) {
        // Rollback account balance
        await supabaseAdmin
          .from('accounts')
          .update({ balance: currentBalance })
          .eq('id', accountId);
        return res.status(500).json({ error: 'Failed to create user transaction' });
      }

      transactionId = userTx.id;

      // Credit treasury account
      const { data: treasury, error: treasuryError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('account_type', 'treasury')
        .single();

      if (!treasuryError && treasury) {
        const treasuryBalance = parseFloat(treasury.balance || 0);
        const newTreasuryBalance = treasuryBalance + paymentAmount;

        await supabaseAdmin
          .from('accounts')
          .update({
            balance: newTreasuryBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', treasury.id);

        // Create treasury credit transaction
        const { data: treasuryTx } = await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: treasury.user_id,
            account_id: treasury.id,
            type: 'credit',
            amount: paymentAmount,
            balance_before: treasuryBalance,
            balance_after: newTreasuryBalance,
            description: `Loan repayment from ${userAccount.account_number}`,
            category: 'loan_repayment',
            status: 'completed',
            reference: payment.reference_number,
            metadata: {
              loan_id: payment.loan_id,
              payment_id: paymentId,
              user_transaction_id: transactionId,
              approved_by: authResult.adminId
            }
          })
          .select()
          .single();

        treasuryTransactionId = treasuryTx?.id;
      }
    }

    // Update loan balance and payment schedule
    const remainingBalance = parseFloat(payment.loans.remaining_balance);
    const principalPaid = parseFloat(payment.principal_amount);
    const newLoanBalance = Math.max(0, remainingBalance - principalPaid);

    // Calculate how many months this payment covers (matching atomic function logic)
    const monthlyPayment = parseFloat(payment.loans.monthly_payment_amount) || 0;
    const monthsCovered = monthlyPayment > 0 ? Math.floor(paymentAmount / monthlyPayment) : 1;
    
    // Set next payment date based on months covered (30-day months for consistency)
    const currentNextPaymentDate = new Date(payment.loans.next_payment_date || new Date());
    const nextPaymentDate = new Date(currentNextPaymentDate);
    nextPaymentDate.setDate(nextPaymentDate.getDate() + (30 * monthsCovered));

    // Determine new loan status with proper logic
    let newLoanStatus = payment.loans.status;
    if (newLoanBalance === 0) {
      newLoanStatus = 'closed';
    } else if (payment.loans.status === 'approved' || payment.loans.status === 'pending') {
      newLoanStatus = 'active';
    }

    const { error: loanUpdateError } = await supabaseAdmin
      .from('loans')
      .update({
        remaining_balance: newLoanBalance,
        last_payment_date: new Date().toISOString(),
        next_payment_date: nextPaymentDate.toISOString().split('T')[0],
        payments_made: (payment.loans.payments_made || 0) + monthsCovered,
        is_late: false,
        status: newLoanStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.loan_id);

    if (loanUpdateError) {
      console.error('Error updating loan:', loanUpdateError);
    }

    // Update payment status to completed with comprehensive metadata
    const { error: updateError } = await supabaseAdmin
      .from('loan_payments')
      .update({
        status: 'completed',
        balance_after: newLoanBalance,
        processed_by: authResult.adminId,
        updated_at: new Date().toISOString(),
        notes: `${payment.notes || ''}\nApproved: ${new Date().toISOString()}\nMonths covered: ${monthsCovered}\nNew balance: $${newLoanBalance.toLocaleString()}`,
        metadata: {
          ...payment.metadata,
          approved_at: new Date().toISOString(),
          approved_by: authResult.adminId,
          transaction_id: transactionId,
          treasury_transaction_id: treasuryTransactionId,
          months_covered: monthsCovered,
          payment_method: paymentMethod,
          previous_balance: remainingBalance,
          new_balance: newLoanBalance,
          next_payment_date: nextPaymentDate.toISOString().split('T')[0]
        }
      })
      .eq('id', paymentId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update payment status' });
    }

    return res.status(200).json({
      success: true,
      message: `Payment approved successfully. ${monthsCovered} month${monthsCovered > 1 ? 's' : ''} covered.`,
      payment: {
        id: paymentId,
        status: 'completed',
        amount: paymentAmount,
        months_covered: monthsCovered,
        processed_at: new Date().toISOString()
      },
      loan: {
        id: payment.loan_id,
        previous_balance: remainingBalance,
        new_balance: newLoanBalance,
        next_payment_date: nextPaymentDate.toISOString().split('T')[0],
        payments_made: (payment.loans.payments_made || 0) + monthsCovered,
        status: newLoanStatus,
        is_closed: newLoanBalance === 0
      },
      transactions: {
        user_transaction_id: transactionId,
        treasury_transaction_id: treasuryTransactionId
      }
    });

  } catch (error) {
    console.error('Error in approve-loan-payment:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
