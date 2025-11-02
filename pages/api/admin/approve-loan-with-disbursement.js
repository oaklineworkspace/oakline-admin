
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { loanId, approvalNotes } = req.body;

    if (!loanId) {
      return res.status(400).json({ error: 'Loan ID is required' });
    }

    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('Error fetching loan:', loanError);
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'pending') {
      return res.status(400).json({ error: `Loan is already ${loan.status}` });
    }

    if (loan.deposit_required && loan.deposit_required > 0 && !loan.deposit_verified) {
      const { data: cryptoDeposits } = await supabaseAdmin
        .from('crypto_deposits')
        .select('*')
        .eq('user_id', loan.user_id)
        .gte('amount', loan.deposit_required)
        .in('status', ['confirmed', 'completed'])
        .limit(1);

      const { data: transactions } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('user_id', loan.user_id)
        .eq('account_id', loan.account_id)
        .eq('type', 'deposit')
        .gte('amount', loan.deposit_required)
        .eq('status', 'completed')
        .limit(1);

      if (!cryptoDeposits?.length && !transactions?.length) {
        return res.status(400).json({ 
          error: 'Deposit verification required',
          message: `Required deposit of $${loan.deposit_required} not found. Cannot approve loan.`
        });
      }
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', loan.account_id)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const currentBalance = parseFloat(account.balance || 0);
    const disbursementAmount = parseFloat(loan.principal);
    const newBalance = currentBalance + disbursementAmount;
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    let updatedLoan = null;
    let balanceUpdated = false;

    try {
      const { data: loanUpdate, error: updateError } = await supabaseAdmin
        .from('loans')
        .update({
          status: 'active',
          disbursed_at: new Date().toISOString(),
          remaining_balance: loan.principal,
          deposit_verified: true,
          approval_notes: approvalNotes || null,
          next_payment_date: nextPaymentDate.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', loanId)
        .eq('status', 'pending')
        .select()
        .single();

      if (updateError) {
        console.error('Error updating loan:', updateError);
        throw new Error('Failed to update loan status');
      }

      updatedLoan = loanUpdate;

      const { data: balanceUpdateResult, error: balanceError } = await supabaseAdmin
        .from('accounts')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id)
        .eq('balance', currentBalance)
        .select('id')
        .maybeSingle();

      if (balanceError) {
        console.error('Error updating account balance:', balanceError);
        throw new Error('Failed to update account balance');
      }

      if (!balanceUpdateResult) {
        console.error('Account balance update affected 0 rows - possible concurrent modification');
        throw new Error('Account balance was modified by another transaction. Please retry.');
      }

      balanceUpdated = true;

      const { error: transactionError } = await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: loan.user_id,
          account_id: loan.account_id,
          type: 'credit',
          amount: disbursementAmount,
          description: `Loan disbursement - ${loan.loan_type} loan`,
          status: 'completed',
          metadata: { loan_id: loanId, loan_type: loan.loan_type }
        });

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
        throw new Error('Failed to create transaction record');
      }

    } catch (error) {
      console.error('Error in loan approval process:', error);

      if (balanceUpdated) {
        console.log('Rolling back account balance...');
        await supabaseAdmin
          .from('accounts')
          .update({ 
            balance: currentBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id);
      }

      if (updatedLoan) {
        console.log('Rolling back loan status...');
        await supabaseAdmin
          .from('loans')
          .update({
            status: 'pending',
            disbursed_at: null,
            remaining_balance: 0,
            deposit_verified: false,
            approval_notes: null,
            next_payment_date: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', loanId);
      }

      return res.status(500).json({ 
        error: 'Failed to approve and disburse loan', 
        details: error.message 
      });
    }

    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: authResult.user.id,
        action: 'APPROVE_LOAN',
        table_name: 'loans',
        old_data: { status: loan.status },
        new_data: { 
          status: 'active', 
          disbursed_at: new Date().toISOString(),
          amount_disbursed: disbursementAmount 
        }
      });

    await supabaseAdmin
      .from('system_logs')
      .insert({
        level: 'info',
        message: `Loan ${loanId} approved and disbursed $${disbursementAmount}`,
        metadata: { 
          loan_id: loanId, 
          user_id: loan.user_id,
          admin_id: authResult.user.id,
          amount: disbursementAmount 
        }
      });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', loan.user_id)
      .single();

    if (profile?.email) {
      try {
        await sendEmail({
          to: profile.email,
          subject: '🎉 Your Loan Has Been Approved - Oakline Bank',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 24px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🎉 Loan Approved!</h1>
                  <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
                </div>
                
                <div style="padding: 40px 32px;">
                  <h2 style="color: #059669; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                    Congratulations!
                  </h2>
                  
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Your ${loan.loan_type} loan application has been approved. The funds have been disbursed to your account.
                  </p>
                  
                  <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0;">
                    <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
                      Loan Details
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Loan Amount:</td>
                        <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                          $${parseFloat(loan.principal).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Interest Rate:</td>
                        <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                          ${loan.interest_rate}%
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Term:</td>
                        <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                          ${loan.term_months} months
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Monthly Payment:</td>
                        <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                          $${parseFloat(loan.monthly_payment_amount || 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">First Payment Due:</td>
                        <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                          ${nextPaymentDate.toLocaleDateString()}
                        </td>
                      </tr>
                    </table>
                  </div>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
                    The loan amount has been credited to your account ending in ${account.account_number.slice(-4)}. Your new balance is $${newBalance.toLocaleString()}.
                  </p>

                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://theoaklinebank.com'}/login" 
                       style="display: inline-block; background-color: #10b981; color: #ffffff; 
                              padding: 14px 32px; text-decoration: none; border-radius: 8px; 
                              font-weight: 600; font-size: 16px;">
                      View Loan Details
                    </a>
                  </div>
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
          `,
          type: EMAIL_TYPES.NOTIFY
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Loan approved and disbursed successfully',
      loan: updatedLoan,
      disbursement: {
        amount: disbursementAmount,
        previousBalance: currentBalance,
        newBalance: newBalance
      }
    });

  } catch (error) {
    console.error('Error in approve-loan-with-disbursement:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
