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
          monthly_payment_amount,
          next_payment_date,
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

    // Get user profile for email notification
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', payment.loans.user_id)
      .single();

    const userName = userProfile 
      ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email
      : 'Valued Customer';

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

    const isDepositPayment = payment.payment_type === 'deposit' || payment.is_deposit;
    const paymentAmount = parseFloat(payment.amount);

    if (action === 'reject') {
      const paymentMethod = payment.metadata?.payment_method || payment.payment_method;
      const accountId = payment.metadata?.account_id || payment.loans.account_id;
      let refunded = false;
      let refundTransactionId = null;

      // Refund the user if payment was from account balance
      if (paymentMethod === 'account_balance' && accountId) {
        try {
          // Get current account balance
          const { data: userAccount, error: accountError } = await supabaseAdmin
            .from('accounts')
            .select('id, balance, account_number')
            .eq('id', accountId)
            .single();

          if (!accountError && userAccount) {
            const currentBalance = parseFloat(userAccount.balance || 0);
            const newBalance = currentBalance + paymentAmount;

            // Credit back to user account
            const { error: refundError } = await supabaseAdmin
              .from('accounts')
              .update({
                balance: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq('id', accountId);

            if (!refundError) {
              // Create refund transaction record
              const { data: refundTx } = await supabaseAdmin
                .from('transactions')
                .insert({
                  user_id: payment.loans.user_id,
                  account_id: accountId,
                  type: 'credit',
                  amount: paymentAmount,
                  balance_before: currentBalance,
                  balance_after: newBalance,
                  description: `Refund: ${isDepositPayment ? 'Loan deposit' : 'Loan payment'} rejected - ${payment.loans.loan_type} loan`,
                  category: 'loan_payment_refund',
                  status: 'completed',
                  reference: payment.reference_number,
                  metadata: {
                    loan_id: payment.loan_id,
                    payment_id: paymentId,
                    rejection_reason: rejectionReason,
                    refunded_by: authResult.adminId,
                    original_payment_method: paymentMethod
                  }
                })
                .select()
                .single();

              refundTransactionId = refundTx?.id;
              refunded = true;
              console.log(`Refunded $${paymentAmount} to account ${userAccount.account_number}`);
            }
          }
        } catch (refundErr) {
          console.error('Error processing refund:', refundErr);
        }
      }

      // Update payment status with refund info
      const { error: rejectError } = await supabaseAdmin
        .from('loan_payments')
        .update({
          status: 'failed',
          notes: `Rejected: ${rejectionReason || 'Payment rejected by admin'}${refunded ? '\nRefund processed and credited to user account.' : ''}`,
          processed_by: authResult.adminId,
          updated_at: new Date().toISOString(),
          metadata: {
            ...payment.metadata,
            rejected_at: new Date().toISOString(),
            rejected_by: authResult.adminId,
            rejection_reason: rejectionReason,
            refunded: refunded,
            refund_transaction_id: refundTransactionId,
            refund_amount: refunded ? paymentAmount : null
          }
        })
        .eq('id', paymentId);

      if (rejectError) {
        return res.status(500).json({ error: 'Failed to reject payment' });
      }

      // Send rejection email notification
      let emailSent = false;
      if (userProfile?.email) {
        try {
          await sendEmail({
            to: userProfile.email,
            subject: `Loan Payment Update - ${isDepositPayment ? 'Deposit' : 'Payment'} Not Approved`,
            html: generatePaymentEmailHtml({
              userName,
              paymentAmount,
              loanType: payment.loans.loan_type,
              status: 'rejected',
              rejectionReason: rejectionReason || 'Payment could not be verified',
              isDeposit: isDepositPayment,
              referenceNumber: payment.reference_number,
              refunded: refunded
            }),
            type: EMAIL_TYPES.LOANS
          });
          emailSent = true;
          console.log('Rejection notification email sent to:', userProfile.email);
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError);
        }
      }

      return res.status(200).json({
        success: true,
        message: `Payment rejected successfully${refunded ? '. Funds refunded to user account.' : ''}`,
        payment: {
          id: paymentId,
          status: 'failed',
          refunded: refunded,
          refund_amount: refunded ? paymentAmount : null,
          refund_transaction_id: refundTransactionId
        },
        email_sent: emailSent
      });
    }

    // APPROVE ACTION - Process the payment
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
          description: `${isDepositPayment ? '10% Loan Deposit' : 'Loan payment'} for ${payment.loans.loan_type} loan`,
          category: isDepositPayment ? 'loan_deposit' : 'loan_payment',
          status: 'completed',
          reference: payment.reference_number,
          metadata: {
            loan_id: payment.loan_id,
            payment_id: paymentId,
            approved_by: authResult.adminId,
            is_deposit: isDepositPayment
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
    }

    // Credit treasury account for ALL approved payments (including deposits and crypto payments)
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
          description: isDepositPayment 
            ? `10% Loan deposit from ${payment.loans.accounts?.account_number || 'user'}` 
            : `Loan repayment from ${payment.loans.accounts?.account_number || 'user'}`,
          category: isDepositPayment ? 'loan_deposit_received' : 'loan_repayment',
          status: 'completed',
          reference: payment.reference_number,
          metadata: {
            loan_id: payment.loan_id,
            payment_id: paymentId,
            user_transaction_id: transactionId,
            approved_by: authResult.adminId,
            is_deposit: isDepositPayment,
            payment_method: paymentMethod
          }
        })
        .select()
        .single();

      treasuryTransactionId = treasuryTx?.id;
      console.log(`Treasury credited $${paymentAmount} for ${isDepositPayment ? 'deposit' : 'payment'}`);
    } else {
      console.warn('Treasury account not found, skipping treasury credit');
    }

    // Update loan balance and payment schedule
    const remainingBalance = parseFloat(payment.loans.remaining_balance);
    const principalPaid = parseFloat(payment.principal_amount || 0);
    const newLoanBalance = Math.max(0, remainingBalance - principalPaid);

    // Calculate how many months this payment covers (matching atomic function logic)
    const monthlyPayment = parseFloat(payment.loans.monthly_payment_amount) || 0;
    const monthsCovered = monthlyPayment > 0 ? Math.max(1, Math.floor(paymentAmount / monthlyPayment)) : 1;

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

    // For deposit payments, mark the deposit as confirmed and potentially activate the loan
    if (isDepositPayment) {
      // Update loan to active if this was the required deposit
      if (payment.loans.status === 'pending' || payment.loans.status === 'approved') {
        const { error: loanActivateError } = await supabaseAdmin
          .from('loans')
          .update({
            status: 'active',
            deposit_paid: true,
            deposit_paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.loan_id);

        if (loanActivateError) {
          console.error('Error activating loan after deposit:', loanActivateError);
        } else {
          newLoanStatus = 'active';
          console.log(`Loan ${payment.loan_id} activated after 10% deposit confirmation`);
        }
      }
    } else {
      // Regular payment - update loan balance
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
    }

    // Update payment status to completed with comprehensive metadata
    const { error: updateError } = await supabaseAdmin
      .from('loan_payments')
      .update({
        status: 'completed',
        balance_after: isDepositPayment ? remainingBalance : newLoanBalance,
        processed_by: authResult.adminId,
        updated_at: new Date().toISOString(),
        notes: `${payment.notes || ''}\nApproved: ${new Date().toISOString()}${isDepositPayment ? '\n10% Deposit confirmed and credited to treasury' : `\nMonths covered: ${monthsCovered}\nNew balance: $${newLoanBalance.toLocaleString()}`}`,
        metadata: {
          ...payment.metadata,
          approved_at: new Date().toISOString(),
          approved_by: authResult.adminId,
          transaction_id: transactionId,
          treasury_transaction_id: treasuryTransactionId,
          months_covered: isDepositPayment ? 0 : monthsCovered,
          payment_method: paymentMethod,
          previous_balance: remainingBalance,
          new_balance: isDepositPayment ? remainingBalance : newLoanBalance,
          next_payment_date: nextPaymentDate.toISOString().split('T')[0],
          is_deposit: isDepositPayment,
          treasury_credited: !!treasuryTransactionId
        }
      })
      .eq('id', paymentId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update payment status' });
    }

    // Send approval email notification
    let emailSent = false;
    if (userProfile?.email) {
      try {
        await sendEmail({
          to: userProfile.email,
          subject: `Loan ${isDepositPayment ? 'Deposit' : 'Payment'} Approved - Oakline Bank`,
          html: generatePaymentEmailHtml({
            userName,
            paymentAmount,
            loanType: payment.loans.loan_type,
            status: 'approved',
            isDeposit: isDepositPayment,
            referenceNumber: payment.reference_number,
            newBalance: isDepositPayment ? remainingBalance : newLoanBalance,
            nextPaymentDate: nextPaymentDate.toISOString().split('T')[0],
            monthsCovered: isDepositPayment ? null : monthsCovered,
            loanActivated: isDepositPayment && newLoanStatus === 'active'
          }),
          type: EMAIL_TYPES.LOANS
        });
        emailSent = true;
        console.log('Approval notification email sent to:', userProfile.email);
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: isDepositPayment 
        ? 'Deposit approved and credited to treasury. Loan activated.' 
        : `Payment approved successfully. ${monthsCovered} month${monthsCovered > 1 ? 's' : ''} covered.`,
      payment: {
        id: paymentId,
        status: 'completed',
        amount: paymentAmount,
        months_covered: isDepositPayment ? 0 : monthsCovered,
        processed_at: new Date().toISOString(),
        is_deposit: isDepositPayment,
        treasury_credited: !!treasuryTransactionId
      },
      loan: {
        id: payment.loan_id,
        previous_balance: remainingBalance,
        new_balance: isDepositPayment ? remainingBalance : newLoanBalance,
        next_payment_date: nextPaymentDate.toISOString().split('T')[0],
        payments_made: (payment.loans.payments_made || 0) + (isDepositPayment ? 0 : monthsCovered),
        status: newLoanStatus,
        is_closed: newLoanBalance === 0
      },
      email_sent: emailSent,
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

function generatePaymentEmailHtml({ 
  userName, 
  paymentAmount, 
  loanType, 
  status, 
  rejectionReason,
  isDeposit,
  referenceNumber,
  newBalance,
  nextPaymentDate,
  monthsCovered,
  loanActivated,
  refunded
}) {
  const isApproved = status === 'approved';
  const statusColor = isApproved ? '#059669' : '#dc2626';
  const statusBg = isApproved ? '#d1fae5' : '#fee2e2';
  const statusIcon = isApproved ? '✅' : '❌';
  const statusText = isApproved ? 'Approved' : 'Not Approved';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
          <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">
            🏦 Oakline Bank
          </div>
          <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">
            Loan ${isDeposit ? 'Deposit' : 'Payment'} Update
          </div>
        </div>
        
        <div style="padding: 40px 32px;">
          <h1 style="color: #1a365d; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
            Hello, ${userName}!
          </h1>
          
          <div style="background: ${statusBg}; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 8px;">${statusIcon}</div>
            <div style="color: ${statusColor}; font-size: 20px; font-weight: 700;">
              ${isDeposit ? '10% Deposit' : 'Payment'} ${statusText}
            </div>
          </div>
          
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #1a365d; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">
              💳 ${isDeposit ? 'Deposit' : 'Payment'} Details
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount:</td>
                <td style="padding: 8px 0; color: #1a365d; font-size: 16px; font-weight: 600; text-align: right;">
                  $${paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Loan Type:</td>
                <td style="padding: 8px 0; color: #1a365d; font-size: 14px; text-align: right; text-transform: capitalize;">
                  ${loanType}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Reference:</td>
                <td style="padding: 8px 0; color: #1a365d; font-size: 14px; text-align: right;">
                  ${referenceNumber || 'N/A'}
                </td>
              </tr>
              ${isApproved && !isDeposit && newBalance !== undefined ? `
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Remaining Balance:</td>
                <td style="padding: 8px 0; color: #059669; font-size: 16px; font-weight: 700; text-align: right;">
                  $${parseFloat(newBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
              ` : ''}
              ${isApproved && !isDeposit && monthsCovered ? `
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Months Covered:</td>
                <td style="padding: 8px 0; color: #1a365d; font-size: 14px; text-align: right;">
                  ${monthsCovered} month${monthsCovered > 1 ? 's' : ''}
                </td>
              </tr>
              ` : ''}
              ${isApproved && !isDeposit && nextPaymentDate ? `
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Next Payment Due:</td>
                <td style="padding: 8px 0; color: #1a365d; font-size: 14px; text-align: right;">
                  ${new Date(nextPaymentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${isApproved && isDeposit && loanActivated ? `
          <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0;">
            <p style="color: #1e40af; font-size: 14px; font-weight: 500; margin: 0;">
              🎉 <strong>Great news!</strong> Your 10% deposit has been confirmed and your loan is now active. 
              You can start using your loan funds immediately.
            </p>
          </div>
          ` : ''}
          
          ${!isApproved && rejectionReason ? `
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
            <p style="color: #991b1b; font-size: 14px; font-weight: 500; margin: 0 0 8px 0;">
              ⚠️ <strong>Reason:</strong>
            </p>
            <p style="color: #7f1d1d; font-size: 14px; margin: 0;">
              ${rejectionReason}
            </p>
          </div>
          ${refunded ? `
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0;">
            <p style="color: #065f46; font-size: 14px; font-weight: 500; margin: 0;">
              💰 <strong>Refund Processed:</strong> The payment amount of $${paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been credited back to your account.
            </p>
          </div>
          ` : ''}
          <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 16px 0;">
            If you believe this is an error or need assistance, please contact our loan support team.
          </p>
          ` : ''}
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theoaklinebank.com'}/dashboard" 
               style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #2c5aa0 100%); 
                      color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; 
                      font-weight: 600; font-size: 14px;">
              View Your Loan Details
            </a>
          </div>
        </div>
        
        <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
            Member FDIC | NMLS #574160
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
