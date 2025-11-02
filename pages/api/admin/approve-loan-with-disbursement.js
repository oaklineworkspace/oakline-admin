
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const TREASURY_USER_ID = '7f62c3ec-31fe-4952-aa00-2c922064d56a';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { loanId } = req.body;

  if (!loanId) {
    return res.status(400).json({ error: 'Loan ID is required' });
  }

  try {
    // 1. Fetch the loan details
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*, accounts(*)')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Check if loan is approved but not yet disbursed
    if (loan.status !== 'approved') {
      return res.status(400).json({ error: 'Loan must be approved before disbursement' });
    }

    if (loan.disbursed_at) {
      return res.status(400).json({ error: 'Loan has already been disbursed' });
    }

    // 2. Fetch treasury account
    const { data: treasuryAccount, error: treasuryError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', TREASURY_USER_ID)
      .single();

    if (treasuryError || !treasuryAccount) {
      return res.status(500).json({ error: 'Treasury account not found' });
    }

    // 3. Check treasury balance
    if (treasuryAccount.balance < loan.principal) {
      return res.status(400).json({ 
        error: `Insufficient Treasury Balance. Available: $${treasuryAccount.balance.toFixed(2)}, Required: $${loan.principal.toFixed(2)}. Please fund the treasury account before disbursing this loan.`
      });
    }

    // 4. Generate loan reference number
    const loanReference = `OAKLN-${Date.now()}`;

    // 5. Deduct from treasury
    const newTreasuryBalance = parseFloat(treasuryAccount.balance) - parseFloat(loan.principal);
    
    const { error: treasuryUpdateError } = await supabaseAdmin
      .from('accounts')
      .update({ 
        balance: newTreasuryBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', treasuryAccount.id);

    if (treasuryUpdateError) {
      throw new Error('Failed to deduct from treasury account');
    }

    // 6. Create treasury debit transaction
    await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: TREASURY_USER_ID,
        account_id: treasuryAccount.id,
        type: 'treasury_debit',
        amount: loan.principal,
        description: `Loan disbursement to user (${loanReference})`,
        status: 'completed',
        balance_before: treasuryAccount.balance,
        balance_after: newTreasuryBalance,
        reference: `TRSRY-${Date.now()}`
      });

    // 7. Credit user account
    const userBalance = parseFloat(loan.accounts.balance) + parseFloat(loan.principal);
    
    const { error: userAccountError } = await supabaseAdmin
      .from('accounts')
      .update({ 
        balance: userBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', loan.account_id);

    if (userAccountError) {
      // Rollback treasury deduction
      await supabaseAdmin
        .from('accounts')
        .update({ balance: treasuryAccount.balance })
        .eq('id', treasuryAccount.id);
      
      throw new Error('Failed to credit user account');
    }

    // 8. Create user credit transaction
    await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: loan.user_id,
        account_id: loan.account_id,
        type: 'loan_disbursement',
        amount: loan.principal,
        description: `Loan disbursement - ${loan.loan_type} (${loanReference})`,
        status: 'completed',
        balance_before: loan.accounts.balance,
        balance_after: userBalance,
        reference: loanReference
      });

    // 9. Update loan status to active
    const { error: loanUpdateError } = await supabaseAdmin
      .from('loans')
      .update({
        status: 'active',
        disbursed_at: new Date().toISOString(),
        remaining_balance: loan.total_amount || loan.principal,
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
      .eq('id', loanId);

    if (loanUpdateError) {
      throw new Error('Failed to update loan status');
    }

    // 10. Send notification email to user
    try {
      const { data: bankDetails } = await supabaseAdmin
        .from('bank_details')
        .select('*')
        .single();

      const { data: application } = await supabaseAdmin
        .from('applications')
        .select('email, first_name, last_name')
        .eq('id', loan.accounts.application_id)
        .single();

      if (application && bankDetails) {
        await supabaseAdmin
          .from('email_queue')
          .insert({
            user_id: loan.user_id,
            email: application.email,
            subject: 'Your Loan Has Been Disbursed',
            body: `
              <h2>Loan Disbursement Confirmation</h2>
              <p>Dear ${application.first_name} ${application.last_name},</p>
              <p>Your loan has been successfully disbursed to your account.</p>
              <h3>Loan Details:</h3>
              <ul>
                <li>Loan Reference: ${loanReference}</li>
                <li>Amount Disbursed: $${loan.principal.toFixed(2)}</li>
                <li>Loan Type: ${loan.loan_type}</li>
                <li>Total Amount to Repay: $${(loan.total_amount || loan.principal).toFixed(2)}</li>
                <li>Monthly Payment: $${(loan.monthly_payment_amount || 0).toFixed(2)}</li>
              </ul>
              <p>The funds are now available in your account.</p>
              <p>Thank you for choosing ${bankDetails.name}.</p>
            `
          });
      }
    } catch (emailError) {
      console.error('Failed to queue email:', emailError);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Loan disbursed successfully',
      loanReference,
      disbursedAmount: loan.principal,
      newTreasuryBalance
    });

  } catch (error) {
    console.error('Error disbursing loan:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to disburse loan'
    });
  }
}
