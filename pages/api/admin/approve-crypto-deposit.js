import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';
import { verifyAdminAuth } from '../../../lib/adminAuth';

const TREASURY_USER_ID = '7f62c3ec-31fe-4952-aa00-2c922064d56a';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { depositId } = req.body;

    if (!depositId) {
      return res.status(400).json({ error: 'Deposit ID is required' });
    }

    const { data: deposit, error: depositError } = await supabaseAdmin
      .from('crypto_deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (depositError || !deposit) {
      console.error('Error fetching deposit:', depositError);
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (deposit.status !== 'pending' && deposit.status !== 'awaiting_confirmations') {
      return res.status(400).json({ 
        error: `Deposit has already been ${deposit.status}` 
      });
    }

    // Fetch treasury account details if it's a loan deposit
    let treasuryAccount = null;
    const isLoanDeposit = deposit.purpose === 'loan_requirement' && deposit.loan_id;
    
    if (isLoanDeposit) {
      const { data: treasuryData, error: treasuryError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('user_id', TREASURY_USER_ID)
        .single();

      if (treasuryError || !treasuryData) {
        console.error('Error fetching treasury account:', treasuryError);
        return res.status(500).json({ error: 'Treasury account not found' });
      }
      treasuryAccount = treasuryData;
    }

    // 3. Credit appropriate account based on deposit purpose
    const targetAccountId = isLoanDeposit ? treasuryAccount.id : deposit.account_id;

    const { data: targetAccount, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', targetAccountId)
      .single();

    if (accountError || !targetAccount) {
      await supabaseAdmin
        .from('crypto_deposits')
        .update({ status: 'pending' })
        .eq('id', depositId);
      return res.status(500).json({ error: 'Failed to fetch target account' });
    }

    const newBalance = parseFloat(targetAccount.balance || 0) + parseFloat(deposit.amount);

    const { error: balanceError } = await supabaseAdmin
      .from('accounts')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetAccount.id);

    if (balanceError) {
      await supabaseAdmin
        .from('crypto_deposits')
        .update({ status: 'pending' })
        .eq('id', depositId);
      return res.status(500).json({ error: 'Failed to update account balance' });
    }

    // Update loan table if it's a loan deposit
    if (isLoanDeposit) {
      const { error: loanUpdateError } = await supabaseAdmin
        .from('loans')
        .update({ 
          deposit_status: 'completed',
          deposit_paid: true,
          deposit_amount: parseFloat(deposit.amount),
          deposit_date: new Date().toISOString(),
          deposit_method: 'crypto',
          updated_at: new Date().toISOString()
        })
        .eq('id', deposit.loan_id);

      if (loanUpdateError) {
        console.error('Error updating loan deposit status:', loanUpdateError);
        return res.status(500).json({ 
          error: 'Failed to update loan deposit status', 
          details: loanUpdateError.message 
        });
      }
    }

    const { error: depositUpdateError } = await supabaseAdmin
      .from('crypto_deposits')
      .update({ 
        status: 'approved',
        approved_by: authResult.user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', depositId);

    if (depositUpdateError) {
      console.error('Error updating deposit status:', depositUpdateError);
      return res.status(500).json({ error: 'Failed to update deposit status' });
    }

    // Log the approval in audit logs
    await supabaseAdmin
      .from('crypto_deposit_audit_logs')
      .insert({
        deposit_id: depositId,
        changed_by: authResult.user.id,
        old_status: deposit.status,
        new_status: 'approved',
        note: `Deposit approved and credited to ${isLoanDeposit ? 'treasury account' : 'user account'}`,
        metadata: {
          credited_amount: parseFloat(deposit.amount),
          account_id: targetAccount.id,
          is_loan_deposit: isLoanDeposit,
          loan_id: deposit.loan_id || null
        }
      });

    const transactionType = isLoanDeposit ? 'treasury_credit' : 'crypto_deposit';
    const transactionDescription = isLoanDeposit 
      ? `Loan requirement deposit - 10% deposit received for loan ${deposit.loan_id}`
      : `Crypto deposit - ${deposit.crypto_type}`;

    await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: isLoanDeposit ? TREASURY_USER_ID : deposit.user_id,
        account_id: targetAccount.id,
        type: transactionType,
        amount: parseFloat(deposit.amount),
        description: transactionDescription,
        status: 'completed',
        balance_before: parseFloat(targetAccount.balance || 0),
        balance_after: newBalance,
        reference: `CRYPTO-${Date.now()}`,
        metadata: {
          crypto_type: deposit.crypto_type,
          network_type: deposit.network_type,
          wallet_address: deposit.wallet_address,
          transaction_hash: deposit.transaction_hash,
          is_loan_deposit: isLoanDeposit,
          loan_id: deposit.loan_id || null
        }
      });

    // Fetch bank details for email configuration
    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('email_loans, email_info, name')
      .single();

    const loanEmail = bankDetails?.email_loans || bankDetails?.email_info || 'loans@theoaklinebank.com';
    const bankName = bankDetails?.name || 'Oakline Bank';

    const { data: user } = await supabaseAdmin.auth.admin.getUserById(deposit.user_id);

    if (user && user.user.email) {
      try {
        const emailSubject = isLoanDeposit 
          ? `✅ Loan Requirement Deposit Confirmed - ${deposit.crypto_type}`
          : `✅ Crypto Deposit Approved - ${deposit.crypto_type}`;

        const emailBody = isLoanDeposit 
          ? `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">✅ Loan Deposit Confirmed</h1>
                  <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">${bankName}</p>
                </div>

                <div style="padding: 40px 32px;">
                  <h2 style="color: #059669; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                    Your 10% loan requirement deposit has been confirmed!
                  </h2>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Great news! Your loan requirement deposit has been successfully verified and <strong style="color: #059669;">credited to the bank's treasury account</strong>. Your loan application is now ready for final approval.
                  </p>

                  <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 20px; margin: 24px 0;">
                    <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
                      <strong>⚠️ Important:</strong> This deposit has been credited to our bank treasury to secure your loan application. These funds are <strong>NOT</strong> added to your personal account balance. Once your loan is approved and disbursed, the loan principal will be credited to your account.
                    </p>
                  </div>

                  <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0;">
                    <p style="color: #065f46; font-size: 16px; margin: 0 0 12px 0;"><strong>Transaction Details:</strong></p>
                    <p style="color: #065f46; font-size: 14px; margin: 4px 0;"><strong>Purpose:</strong> Loan Requirement Deposit (Treasury)</p>
                    <p style="color: #065f46; font-size: 14px; margin: 4px 0;"><strong>Cryptocurrency:</strong> ${deposit.crypto_type}</p>
                    <p style="color: #065f46; font-size: 14px; margin: 4px 0;"><strong>Amount Deposited:</strong> $${parseFloat(deposit.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p style="color: #065f46; font-size: 14px; margin: 4px 0;"><strong>Status:</strong> Confirmed & Verified</p>
                  </div>

                  <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0;">
                    <p style="color: #1e40af; font-size: 14px; margin: 0 0 8px 0;"><strong>📋 Next Steps:</strong></p>
                    <p style="color: #1e40af; font-size: 14px; margin: 4px 0;">• Your loan application will be reviewed by our team</p>
                    <p style="color: #1e40af; font-size: 14px; margin: 4px 0;">• You'll receive an approval notification via email</p>
                    <p style="color: #1e40af; font-size: 14px; margin: 4px 0;">• Once approved, funds will be disbursed to your account</p>
                  </div>

                  <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                    If you have any questions, please contact our loan department at <strong>${loanEmail}</strong>
                  </p>
                </div>

                <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #718096; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} ${bankName}. All rights reserved.<br/>
                    Member FDIC | Routing: 075915826
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
          : `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">✅ Deposit Approved</h1>
                  <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
                </div>

                <div style="padding: 40px 32px;">
                  <h2 style="color: #059669; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                    Your ${deposit.crypto_type} deposit has been approved!
                  </h2>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Good news! Your cryptocurrency deposit has been successfully processed and credited to your account.
                  </p>

                  <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0;">
                    <p style="color: #065f46; font-size: 16px; margin: 0 0 12px 0;"><strong>Deposit Details:</strong></p>
                    <p style="color: #065f46; font-size: 14px; margin: 4px 0;"><strong>Cryptocurrency:</strong> ${deposit.crypto_type}</p>
                    <p style="color: #065f46; font-size: 14px; margin: 4px 0;"><strong>Amount:</strong> $${parseFloat(deposit.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p style="color: #065f46; font-size: 14px; margin: 4px 0;"><strong>Account Number:</strong> ${deposit.account_number}</p>
                    <p style="color: #065f46; font-size: 14px; margin: 4px 0;"><strong>New Balance:</strong> $${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>

                  <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                    The funds are now available in your account and ready to use.
                  </p>
                </div>

                <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #718096; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br/>
                    Member FDIC | Routing: 075915826
                  </p>
                </div>
              </div>
            </body>
            </html>
          `;

        // Use loan email for loan deposits, notify email for general deposits
        const fromEmail = isLoanDeposit ? loanEmail : undefined;
        
        await sendEmail({
          to: user.user.email,
          subject: emailSubject,
          html: emailBody,
          type: EMAIL_TYPES.NOTIFY,
          ...(fromEmail && { from: `${bankName} Loans <${fromEmail}>` })
        });
      } catch (emailError) {
        console.error('Error sending approval email:', emailError);
      }
    }

    return res.status(200).json({ 
      success: true,
      message: isLoanDeposit 
        ? 'Loan deposit received and credited to treasury successfully'
        : 'Deposit approved and funds credited successfully',
      newBalance,
      isLoanDeposit,
      loanId: deposit.loan_id || null
    });

  } catch (error) {
    console.error('Error in approve-crypto-deposit API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}