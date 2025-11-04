
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

  // Verify admin authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }

  try {
    console.log('Attempting to disburse loan:', loanId);

    // 1. Fetch the loan details with user information
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select(`
        *,
        accounts!loans_account_id_fkey (
          id,
          user_id,
          account_number,
          balance,
          application_id
        )
      `)
      .eq('id', loanId)
      .single();

    if (loanError) {
      console.error('Error fetching loan:', loanError);
      return res.status(500).json({ error: 'Database error fetching loan', details: loanError.message });
    }

    if (!loan) {
      console.error('Loan not found for ID:', loanId);
      return res.status(404).json({ error: 'Loan not found' });
    }

    console.log('Loan found:', { id: loan.id, status: loan.status, principal: loan.principal });

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
    const treasuryBalance = parseFloat(treasuryAccount.balance || 0);
    const requiredAmount = parseFloat(loan.principal);
    
    console.log('Treasury check:', { treasuryBalance, requiredAmount });
    
    if (treasuryBalance < requiredAmount) {
      console.error('Insufficient treasury balance');
      return res.status(400).json({ 
        error: `Treasury balance insufficient for disbursement. Available: $${treasuryBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Required: $${requiredAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Please fund the treasury account before disbursing this loan.`
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
