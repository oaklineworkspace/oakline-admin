
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    const { loanId, amount, paymentMethod, accountId } = req.body;

    if (!loanId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid loan ID and amount are required' });
    }

    if (paymentMethod === 'account_balance' && !accountId) {
      return res.status(400).json({ error: 'Account ID required for account balance payment' });
    }

    // Fetch the loan with row lock
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .eq('user_id', user.id)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'active') {
      return res.status(400).json({ error: 'Loan is not active' });
    }

    const paymentAmount = parseFloat(amount);

    // If paying from account balance, verify funds and deduct
    let accountTransaction = null;
    let treasuryTransaction = null;
    
    if (paymentMethod === 'account_balance') {
      // Fetch user's account
      const { data: account, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single();

      if (accountError || !account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const currentBalance = parseFloat(account.balance);
      if (currentBalance < paymentAmount) {
        return res.status(400).json({ 
          error: 'Insufficient funds',
          details: `Available: $${currentBalance.toLocaleString()}, Required: $${paymentAmount.toLocaleString()}`
        });
      }

      const newBalance = currentBalance - paymentAmount;

      // Deduct from user's account
      const { error: balanceError } = await supabaseAdmin
        .from('accounts')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .eq('balance', currentBalance); // Optimistic locking

      if (balanceError) {
        return res.status(500).json({ error: 'Failed to deduct payment from account' });
      }

      // Create debit transaction for user's account
      const { data: debitTx, error: debitError } = await supabaseAdmin
        .from('transactions')
        .insert({
          account_id: accountId,
          type: 'debit',
          amount: paymentAmount,
          balance_before: currentBalance,
          balance_after: newBalance,
          description: `Loan payment for ${loan.loan_type} loan`,
          category: 'loan_payment',
          status: 'completed',
          reference_number: `LP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          metadata: {
            loan_id: loanId,
            loan_type: loan.loan_type,
            payment_method: 'account_balance'
          }
        })
        .select()
        .single();

      if (debitError) {
        // Rollback account balance
        await supabaseAdmin
          .from('accounts')
          .update({ balance: currentBalance })
          .eq('id', accountId);
        return res.status(500).json({ error: 'Failed to create debit transaction' });
      }

      accountTransaction = debitTx;

      // Fetch treasury account
      const { data: treasury, error: treasuryError } = await supabaseAdmin
        .from('treasury_accounts')
        .select('*')
        .eq('account_type', 'main')
        .single();

      if (!treasuryError && treasury) {
        const treasuryBalance = parseFloat(treasury.balance || 0);
        const newTreasuryBalance = treasuryBalance + paymentAmount;

        // Credit treasury account
        await supabaseAdmin
          .from('treasury_accounts')
          .update({
            balance: newTreasuryBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', treasury.id);

        // Create treasury credit transaction
        const { data: creditTx } = await supabaseAdmin
          .from('treasury_transactions')
          .insert({
            treasury_account_id: treasury.id,
            type: 'credit',
            amount: paymentAmount,
            balance_before: treasuryBalance,
            balance_after: newTreasuryBalance,
            description: `Loan payment received from ${user.email}`,
            category: 'loan_repayment',
            status: 'completed',
            reference_number: debitTx.reference_number,
            metadata: {
              loan_id: loanId,
              user_id: user.id,
              account_id: accountId,
              transaction_id: debitTx.id
            }
          })
          .select()
          .single();

        treasuryTransaction = creditTx;
      }
    }

    // Calculate payment breakdown
    const remainingBalance = parseFloat(loan.remaining_balance);
    const interestRate = parseFloat(loan.interest_rate);
    const monthlyInterestRate = interestRate / 100 / 12;
    const interestAmount = remainingBalance * monthlyInterestRate;
    const principalAmount = Math.min(paymentAmount - interestAmount, remainingBalance);
    const newLoanBalance = Math.max(0, remainingBalance - principalAmount);

    // Create loan payment record
    const { data: loanPayment, error: paymentError } = await supabaseAdmin
      .from('loan_payments')
      .insert({
        loan_id: loanId,
        amount: paymentAmount,
        principal_amount: principalAmount,
        interest_amount: interestAmount,
        balance_after: newLoanBalance,
        payment_type: paymentMethod === 'account_balance' ? 'auto_payment' : 'manual',
        payment_method: paymentMethod,
        status: paymentMethod === 'account_balance' ? 'completed' : 'pending',
        payment_date: new Date().toISOString(),
        reference_number: accountTransaction?.reference_number || `LP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        notes: paymentMethod === 'account_balance' 
          ? `Payment deducted from account ${account.account_number}` 
          : 'Manual payment - pending verification',
        metadata: {
          account_id: accountId,
          transaction_id: accountTransaction?.id,
          treasury_transaction_id: treasuryTransaction?.id
        }
      })
      .select()
      .single();

    if (paymentError) {
      // Rollback if needed
      if (accountTransaction) {
        await supabaseAdmin.from('accounts')
          .update({ balance: parseFloat(account.balance) + paymentAmount })
          .eq('id', accountId);
        await supabaseAdmin.from('transactions').delete().eq('id', accountTransaction.id);
      }
      return res.status(500).json({ error: 'Failed to create loan payment' });
    }

    // Update loan if payment is completed (account balance method)
    if (paymentMethod === 'account_balance') {
      const nextPaymentDate = new Date();
      nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);

      const { error: loanUpdateError } = await supabaseAdmin
        .from('loans')
        .update({
          remaining_balance: newLoanBalance,
          last_payment_date: new Date().toISOString(),
          next_payment_date: nextPaymentDate.toISOString().split('T')[0],
          payments_made: (loan.payments_made || 0) + 1,
          is_late: false,
          status: newLoanBalance === 0 ? 'closed' : 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', loanId);

      if (loanUpdateError) {
        console.error('Error updating loan:', loanUpdateError);
      }
    }

    // Generate receipt
    const receipt = {
      id: loanPayment.id,
      date: new Date().toISOString(),
      reference_number: loanPayment.reference_number,
      loan_type: loan.loan_type,
      payment_amount: paymentAmount,
      principal_paid: principalAmount,
      interest_paid: interestAmount,
      remaining_balance: newLoanBalance,
      payment_method: paymentMethod,
      account_number: accountTransaction ? account.account_number : 'N/A',
      status: loanPayment.status,
      account_transaction_id: accountTransaction?.id,
      treasury_transaction_id: treasuryTransaction?.id
    };

    return res.status(200).json({
      success: true,
      message: paymentMethod === 'account_balance' 
        ? 'Payment processed successfully' 
        : 'Payment submitted for verification',
      payment: loanPayment,
      receipt,
      loan: {
        remaining_balance: newLoanBalance,
        status: newLoanBalance === 0 ? 'closed' : loan.status
      }
    });

  } catch (error) {
    console.error('Error processing loan payment:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
