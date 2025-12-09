
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

    const { loanId, amount, paymentMethod, accountId, txHash } = req.body;

    if (!loanId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid loan ID and amount are required' });
    }

    if (paymentMethod === 'account_balance' && !accountId) {
      return res.status(400).json({ error: 'Account ID required for account balance payment' });
    }

    // Validate crypto payment has tx_hash
    if (paymentMethod && paymentMethod !== 'account_balance' && !txHash) {
      console.warn('Crypto payment submitted without tx_hash');
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

    // If paying from account balance, verify funds (but don't deduct yet - pending admin approval)
    let account = null;
    
    if (paymentMethod === 'account_balance') {
      // Fetch user's account
      const { data: accountData, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single();

      if (accountError || !accountData) {
        return res.status(404).json({ error: 'Account not found' });
      }

      account = accountData;
      const currentBalance = parseFloat(account.balance);
      if (currentBalance < paymentAmount) {
        return res.status(400).json({ 
          error: 'Insufficient funds',
          details: `Available: $${currentBalance.toLocaleString()}, Required: $${paymentAmount.toLocaleString()}`
        });
      }

      // Funds will be deducted upon admin approval
      // No immediate deduction here
    }

    // Calculate payment breakdown
    const remainingBalance = parseFloat(loan.remaining_balance);
    const interestRate = parseFloat(loan.interest_rate);
    const monthlyInterestRate = interestRate / 100 / 12;
    const interestAmount = remainingBalance * monthlyInterestRate;
    const principalAmount = Math.min(paymentAmount - interestAmount, remainingBalance);
    const newLoanBalance = Math.max(0, remainingBalance - principalAmount);

    // Create loan payment record - ALL payments now pending admin confirmation
    const referenceNumber = `LP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const paymentData = {
      loan_id: loanId,
      amount: paymentAmount,
      principal_amount: principalAmount,
      interest_amount: interestAmount,
      balance_after: newLoanBalance,
      payment_type: paymentMethod === 'account_balance' ? 'auto_payment' : 'manual',
      payment_method: paymentMethod || 'account_balance',
      status: 'pending',
      payment_date: new Date().toISOString(),
      reference_number: referenceNumber,
      notes: paymentMethod === 'account_balance' 
        ? `Payment from account ${account?.account_number || accountId} - Pending admin confirmation` 
        : `${paymentMethod || 'Manual'} payment - Pending admin verification`,
      metadata: {
        account_id: accountId,
        user_account_balance: account ? parseFloat(account.balance) : null,
        payment_method: paymentMethod,
        tx_hash: txHash
      }
    };

    // Add tx_hash if provided (for crypto payments)
    if (txHash) {
      paymentData.tx_hash = txHash;
    }
    
    const { data: loanPayment, error: paymentError } = await supabaseAdmin
      .from('loan_payments')
      .insert(paymentData)
      .select()
      .single();

    if (paymentError) {
      return res.status(500).json({ error: 'Failed to create loan payment' });
    }

    // Loan will be updated upon admin approval
    // No immediate loan balance update

    // Generate receipt
    const receipt = {
      id: loanPayment.id,
      date: new Date().toISOString(),
      reference_number: loanPayment.reference_number,
      loan_type: loan.loan_type,
      payment_amount: paymentAmount,
      principal_paid: principalAmount,
      interest_paid: interestAmount,
      remaining_balance: loan.remaining_balance, // Current balance, not updated yet
      payment_method: paymentMethod,
      account_number: account ? account.account_number : 'N/A',
      status: 'pending_admin_confirmation',
      note: 'This payment is pending admin confirmation. Funds will be processed once approved.'
    };

    return res.status(200).json({
      success: true,
      message: 'Payment submitted successfully. Pending admin confirmation.',
      payment: loanPayment,
      receipt,
      loan: {
        remaining_balance: loan.remaining_balance,
        status: loan.status
      }
    });

  } catch (error) {
    console.error('Error processing loan payment:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
