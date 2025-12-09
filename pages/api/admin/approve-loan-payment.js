
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

const TREASURY_USER_ID = '7f62c3ec-31fe-4952-aa00-2c922064d56a';

async function sendPaymentApprovalEmail(payment, user, status, loanType) {
  try {
    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    const statusText = status === 'completed' ? 'Completed' : 'Approved';
    const statusColor = status === 'completed' ? '#059669' : '#10b981';
    const statusEmoji = status === 'completed' ? '🎉' : '✅';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Loan Payment ${statusText} - Oakline Bank</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🏦 Oakline Bank</h1>
            <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Loan Payment Update</p>
          </div>
          
          <div style="padding: 40px 32px;">
            <h2 style="color: #1e40af; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
              Hello ${user?.first_name || 'Valued Customer'}!
            </h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Great news! Your loan payment has been ${statusText.toLowerCase()}.
            </p>
            
            <div style="background: #f0fdf4; border-left: 4px solid ${statusColor}; padding: 20px; margin: 24px 0; border-radius: 8px;">
              <div style="display: flex; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 24px; margin-right: 12px;">${statusEmoji}</span>
                <h3 style="color: ${statusColor}; font-size: 18px; margin: 0; font-weight: 600;">Payment ${statusText}</h3>
              </div>
              <table style="width: 100%; color: #4a5568; font-size: 15px; line-height: 1.8;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Amount:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; text-align: right;">$${parseFloat(payment.payment_amount || payment.amount || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Loan Type:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; text-align: right;">${loanType || 'Personal Loan'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Reference:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; text-align: right;">${payment.reference_number || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Payment Type:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; text-align: right;">${payment.is_deposit ? 'Loan Deposit' : 'Regular Payment'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Status:</strong></td>
                  <td style="padding: 8px 0; text-align: right;">
                    <span style="background-color: ${statusColor}20; color: ${statusColor}; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">
                      ${statusText.toUpperCase()}
                    </span>
                  </td>
                </tr>
              </table>
            </div>
            
            ${!payment.is_deposit ? `
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 8px;">
              <h4 style="color: #1e40af; margin: 0 0 8px 0; font-size: 14px;">Payment Breakdown</h4>
              <p style="color: #4a5568; margin: 0; font-size: 14px; line-height: 1.6;">
                Principal: <strong>$${parseFloat(payment.principal_amount || 0).toFixed(2)}</strong> | 
                Interest: <strong>$${parseFloat(payment.interest_amount || 0).toFixed(2)}</strong>
                ${payment.late_fee > 0 ? ` | Late Fee: <strong>$${parseFloat(payment.late_fee).toFixed(2)}</strong>` : ''}
              </p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://www.theoaklinebank.com/loans" 
                 style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
                View Loan Details
              </a>
            </div>

            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 8px;">
              <p style="color: #4a5568; margin: 0; font-size: 14px; line-height: 1.6;">
                <strong>Thank you for your payment!</strong> Your loan balance has been updated. You can view your full loan details in your online banking dashboard.
              </p>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 8px;">
              <p style="color: #4a5568; margin: 0; font-size: 14px; line-height: 1.6;">
                <strong>Need Help?</strong> Contact our support team at ${bankDetails?.email_loans || 'loans@theoaklinebank.com'} or call ${bankDetails?.phone || '+1 (636) 635-6122'}.
              </p>
            </div>
          </div>
          
          <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0; text-align: center;">
              Oakline Bank | 12201 N May Avenue, Oklahoma City, OK 73120<br>
              Member FDIC | Routing: 075915826
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: user.email,
      subject: `${statusEmoji} Loan Payment ${statusText} - Oakline Bank`,
      html: emailHtml,
      type: EMAIL_TYPES.LOANS
    });

    console.log(`Payment ${status} email sent to ${user.email}`);
    return true;
  } catch (emailError) {
    console.error('Failed to send payment approval email:', emailError);
    return false;
  }
}

async function creditTreasury(amount, paymentId, referenceNumber) {
  try {
    const idempotencyRef = `TRSRY-FEE-${paymentId}`;
    
    const { data: existingTx } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('reference', idempotencyRef)
      .single();

    if (existingTx) {
      console.log(`Treasury already credited for payment ${paymentId}, skipping duplicate`);
      return { success: true, alreadyCredited: true, message: 'Already credited' };
    }

    const { data: treasuryAccount, error: treasuryFetchError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', TREASURY_USER_ID)
      .single();

    if (treasuryFetchError || !treasuryAccount) {
      console.error('Treasury account not found:', treasuryFetchError);
      return { success: false, error: 'Treasury account not found' };
    }

    const currentBalance = parseFloat(treasuryAccount.balance || 0);
    const creditAmount = parseFloat(amount);
    const newBalance = currentBalance + creditAmount;

    const { error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: TREASURY_USER_ID,
        account_id: treasuryAccount.id,
        type: 'treasury_credit',
        amount: creditAmount,
        description: `Loan deposit fee (10%) - Payment Ref: ${referenceNumber || paymentId}`,
        status: 'completed',
        balance_before: currentBalance,
        balance_after: newBalance,
        reference: idempotencyRef
      });

    if (txError) {
      if (txError.code === '23505') {
        console.log(`Treasury transaction already exists for payment ${paymentId}`);
        return { success: true, alreadyCredited: true, message: 'Already credited' };
      }
      console.error('Failed to create treasury transaction:', txError);
      return { success: false, error: txError.message };
    }

    const { error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', treasuryAccount.id);

    if (updateError) {
      console.error('Failed to credit treasury balance:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`Treasury credited with $${creditAmount.toFixed(2)} for payment ${paymentId}`);
    return { success: true, newBalance, creditedAmount: creditAmount };
  } catch (error) {
    console.error('Error crediting treasury:', error);
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentId, action, rejectionReason, refundReason, adminId, targetStatus } = req.body;

    if (!paymentId || !action) {
      return res.status(400).json({ error: 'Payment ID and action are required' });
    }

    if (!['approve', 'reject', 'fail', 'refund_request', 'refund_approve', 'refund_reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('loan_payments')
      .select(`
        *,
        loans (
          id,
          user_id,
          loan_type,
          remaining_balance,
          status,
          monthly_payment_amount,
          next_payment_date
        )
      `)
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      console.error('Payment fetch error:', fetchError);
      return res.status(404).json({ error: 'Payment not found' });
    }

    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', payment.loans?.user_id)
      .single();

    let updateData = {
      updated_at: new Date().toISOString()
    };

    let loanUpdate = null;
    let treasuryResult = null;

    switch (action) {
      case 'approve':
        if (payment.status !== 'pending') {
          return res.status(400).json({ error: `Payment is already ${payment.status}. Only pending payments can be approved.` });
        }

        const finalStatus = targetStatus === 'completed' ? 'completed' : 'approved';

        updateData = {
          ...updateData,
          status: finalStatus,
          approved_at: new Date().toISOString(),
          approved_by: adminId,
          processed_by: adminId
        };

        if (!payment.is_deposit) {
          const newBalance = Math.max(0, payment.loans.remaining_balance - (payment.principal_amount || 0));
          const isFullyPaid = newBalance === 0;

          loanUpdate = {
            remaining_balance: newBalance,
            status: isFullyPaid ? 'paid' : 'active',
            updated_at: new Date().toISOString()
          };

          if (!isFullyPaid && payment.loans.next_payment_date) {
            const nextPaymentDate = new Date(payment.loans.next_payment_date);
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
            loanUpdate.next_payment_date = nextPaymentDate.toISOString().split('T')[0];
          }

          const { error: txError } = await supabaseAdmin
            .from('transactions')
            .insert({
              user_id: payment.loans.user_id,
              account_id: payment.account_id,
              type: 'debit',
              amount: payment.payment_amount || payment.amount,
              description: `Loan payment ${finalStatus} - Principal: $${payment.principal_amount || 0}, Interest: $${payment.interest_amount || 0}`,
              status: 'completed',
              reference_number: payment.reference_number,
              created_at: new Date().toISOString()
            });

          if (txError) {
            console.error('Transaction creation error:', txError);
          }
        } else {
          // For deposit approvals, only update loan_payments table, not loans table
          // Loan status should be updated separately by admin through the loan approval flow
          const depositAmount = parseFloat(payment.payment_amount || payment.amount || 0);
          const treasuryFee = depositAmount * 0.10;
          treasuryResult = await creditTreasury(treasuryFee, paymentId, payment.reference_number);
          
          if (treasuryResult.success) {
            console.log(`Treasury credited with 10% fee: $${treasuryFee.toFixed(2)}`);
          } else {
            console.error('Failed to credit treasury:', treasuryResult.error);
          }
        }

        if (userProfile?.email) {
          sendPaymentApprovalEmail(payment, userProfile, finalStatus, payment.loans?.loan_type);
        }
        break;

      case 'reject':
        if (payment.status !== 'pending') {
          return res.status(400).json({ error: `Payment is already ${payment.status}. Only pending payments can be rejected.` });
        }

        updateData = {
          ...updateData,
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: adminId,
          rejection_reason: rejectionReason || 'No reason provided'
        };
        break;

      case 'fail':
        if (payment.status !== 'pending' && payment.status !== 'processing') {
          return res.status(400).json({ error: `Cannot mark ${payment.status} payment as failed.` });
        }

        updateData = {
          ...updateData,
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: rejectionReason || 'Payment processing failed',
          retry_count: (payment.retry_count || 0) + 1
        };
        break;

      case 'refund_request':
        if (!['approved', 'completed'].includes(payment.status)) {
          return res.status(400).json({ error: 'Only approved/completed payments can be refunded' });
        }

        updateData = {
          ...updateData,
          status: 'refund_requested',
          refund_requested_at: new Date().toISOString(),
          refund_reason: refundReason || 'Refund requested',
          refund_amount: payment.payment_amount
        };
        break;

      case 'refund_approve':
        if (payment.status !== 'refund_requested') {
          return res.status(400).json({ error: 'Only refund requested payments can be approved for refund' });
        }

        updateData = {
          ...updateData,
          status: 'refund_completed',
          refund_processed_at: new Date().toISOString(),
          refund_method: 'account_credit'
        };

        loanUpdate = {
          remaining_balance: payment.loans.remaining_balance + payment.principal_amount,
          updated_at: new Date().toISOString()
        };

        const { error: refundTxError } = await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: payment.user_id,
            account_id: payment.account_id,
            type: 'refund',
            amount: payment.payment_amount,
            description: `Loan payment refund - Ref: ${payment.reference_number}`,
            status: 'completed',
            created_at: new Date().toISOString()
          });

        if (refundTxError) {
          console.error('Refund transaction error:', refundTxError);
        }
        break;

      case 'refund_reject':
        if (payment.status !== 'refund_requested') {
          return res.status(400).json({ error: 'Only refund requested payments can be rejected' });
        }

        updateData = {
          ...updateData,
          status: 'refund_rejected',
          refund_notes: rejectionReason || 'Refund request rejected'
        };
        break;
    }

    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('loan_payments')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError) {
      console.error('Payment update error:', updateError);
      return res.status(500).json({ error: 'Failed to update payment', details: updateError.message });
    }

    if (loanUpdate && payment.loans) {
      const { error: loanUpdateError } = await supabaseAdmin
        .from('loans')
        .update(loanUpdate)
        .eq('id', payment.loans.id);

      if (loanUpdateError) {
        console.error('Loan update error:', loanUpdateError);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Payment ${action} successful`,
      payment: updatedPayment,
      treasuryCredit: treasuryResult
    });

  } catch (error) {
    console.error('Error in approve-loan-payment:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
