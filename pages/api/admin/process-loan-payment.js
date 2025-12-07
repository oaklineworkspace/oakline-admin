
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { loanId, amount, note } = req.body;

    if (!loanId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid loan ID and amount are required' });
    }

    // Fetch the loan with user details
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select(`
        *,
        profiles!loans_user_id_fkey(email, first_name, last_name)
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const userEmail = loan.profiles?.email;
    const userName = `${loan.profiles?.first_name || ''} ${loan.profiles?.last_name || ''}`.trim();

    // Calculate payment breakdown
    const remainingBalance = parseFloat(loan.remaining_balance) || 0;
    const paymentAmount = parseFloat(amount);
    const interestAmount = parseFloat((remainingBalance * parseFloat(loan.interest_rate) / 100 / 12).toFixed(2));
    const principalAmount = parseFloat((paymentAmount - interestAmount).toFixed(2));
    
    // Fix floating-point precision by rounding to 2 decimal places
    let newBalance = parseFloat((remainingBalance - principalAmount).toFixed(2));
    
    // If balance is very small (less than $0.01), set it to zero
    if (newBalance < 0.01 && newBalance > 0) {
      newBalance = 0;
    }
    
    // Ensure balance never goes negative
    newBalance = Math.max(0, newBalance);

    // Get admin user for tracking
    const authHeader = req.headers.authorization;
    let processedBy = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) processedBy = user.id;
    }

    // Create loan payment record with all schema fields
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('loan_payments')
      .insert({
        loan_id: loanId,
        amount: paymentAmount,
        principal_amount: principalAmount,
        interest_amount: interestAmount,
        late_fee: 0,
        balance_after: newBalance,
        payment_type: 'manual',
        status: 'completed',
        notes: note,
        payment_date: new Date().toISOString().split('T')[0],
        processed_by: processedBy
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      return res.status(500).json({ error: 'Failed to create payment', details: paymentError.message });
    }

    // Update loan
    const updateData = {
      remaining_balance: newBalance,
      last_payment_date: new Date().toISOString(),
      payments_made: (loan.payments_made || 0) + 1,
      is_late: false,
      updated_at: new Date().toISOString()
    };

    // Calculate next payment date (30 days from now)
    const nextPaymentDate = new Date();
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
    updateData.next_payment_date = nextPaymentDate.toISOString().split('T')[0];

    // If balance is zero, close the loan
    if (newBalance === 0) {
      updateData.status = 'closed';
    }

    const { error: updateError } = await supabaseAdmin
      .from('loans')
      .update(updateData)
      .eq('id', loanId);

    if (updateError) {
      console.error('Error updating loan:', updateError);
      return res.status(500).json({ error: 'Failed to update loan', details: updateError.message });
    }

    // Send email notification to user
    if (userEmail) {
      try {
        const isLoanPaidOff = newBalance === 0;
        const emailSubject = isLoanPaidOff 
          ? '🎉 Congratulations! Your Loan is Paid Off - Oakline Bank'
          : '✅ Loan Payment Processed - Oakline Bank';

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="background: linear-gradient(135deg, ${isLoanPaidOff ? '#10b981 0%, #059669' : '#1e40af 0%, #3b82f6'} 100%); padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">${isLoanPaidOff ? '🎉 Loan Paid Off!' : '💰 Payment Processed'}</h1>
                <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
              </div>

              <div style="padding: 40px 32px;">
                <h2 style="color: ${isLoanPaidOff ? '#059669' : '#1e40af'}; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                  ${isLoanPaidOff ? 'Congratulations!' : 'Payment Confirmation'}
                </h2>

                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  ${isLoanPaidOff 
                    ? `Dear ${userName || 'Valued Customer'}, your ${loan.loan_type} loan has been fully paid off! 🎊`
                    : `Dear ${userName || 'Valued Customer'}, your loan payment has been successfully processed.`
                  }
                </p>

                <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0; border-radius: 8px;">
                  <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Payment Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Payment Amount:</td>
                      <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700; font-size: 18px;">
                        $${paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Principal Paid:</td>
                      <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                        $${principalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Interest Paid:</td>
                      <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                        $${interestAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr style="border-top: 2px solid #d1fae5;">
                      <td style="padding: 12px 0; color: #4a5568; font-weight: 600;">Remaining Balance:</td>
                      <td style="padding: 12px 0; text-align: right; color: ${isLoanPaidOff ? '#10b981' : '#065f46'}; font-weight: 700; font-size: 20px;">
                        $${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        ${isLoanPaidOff ? ' ✓ PAID IN FULL' : ''}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Payment Date:</td>
                      <td style="padding: 8px 0; text-align: right; color: #4a5568;">
                        ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Reference Number:</td>
                      <td style="padding: 8px 0; text-align: right; color: #4a5568; font-family: monospace;">
                        ${payment.reference_number}
                      </td>
                    </tr>
                  </table>
                </div>

                ${isLoanPaidOff ? `
                  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 8px;">
                    <p style="color: #4a5568; margin: 0; font-size: 14px; line-height: 1.6;">
                      <strong>What's Next?</strong> This loan is now closed and no further payments are required. Your excellent payment history will positively impact your credit profile with Oakline Bank. Thank you for being a valued customer!
                    </p>
                  </div>
                ` : `
                  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 8px;">
                    <p style="color: #4a5568; margin: 0; font-size: 14px; line-height: 1.6;">
                      <strong>Next Payment Due:</strong> ${updateData.next_payment_date ? new Date(updateData.next_payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'To be determined'}
                    </p>
                  </div>
                `}

                ${note ? `
                  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 8px;">
                    <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
                      <strong>Admin Note:</strong> ${note}
                    </p>
                  </div>
                ` : ''}

                <div style="text-align: center; margin: 32px 0;">
                  <a href="https://www.theoaklinebank.com/loans" 
                     style="display: inline-block; background-color: #1e40af; color: #ffffff; 
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
        `;

        await sendEmail({
          to: userEmail,
          subject: emailSubject,
          html: emailHtml,
          type: EMAIL_TYPES.LOANS
        });

        console.log(`Payment confirmation email sent to ${userEmail}`);
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      payment,
      newBalance
    });

  } catch (error) {
    console.error('Error in process-loan-payment:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
