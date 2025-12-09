import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { loanId, status, reason, adminPassword, userId, userEmail } = req.body;

    if (!loanId || !status) {
      return res.status(400).json({ error: 'Loan ID and status are required' });
    }

    // Verify admin password if approving
    if (status === 'approved' && adminPassword) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized - No token provided' });
      }

      const token = authHeader.split(' ')[1];
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
      }

      // Verify the admin's password
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: user.email,
        password: adminPassword
      });

      if (signInError) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    // Get admin user ID for tracking
    const authHeader = req.headers.authorization;
    let adminUserId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        adminUserId = user.id;
      }
    }

    // Update loan status with proper tracking fields
    const { data: updatedLoan, error: updateError } = await supabaseAdmin
      .from('loans')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'approved' && {
          approved_at: new Date().toISOString()
        }),
        ...(status === 'rejected' && { 
          rejection_reason: reason
        })
      })
      .eq('id', loanId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating loan status:', updateError);
      return res.status(500).json({ error: 'Failed to update loan status', details: updateError.message });
    }

    // Record action in audit logs
    try {
      const authHeader = req.headers.authorization;
      let adminUserId = null;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          adminUserId = user.id;
        }
      }

      await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: adminUserId,
          action: `loan_${status}`,
          table_name: 'loans',
          old_data: { loan_id: loanId },
          new_data: { 
            loan_id: loanId, 
            status, 
            ...(status === 'approved' && { approved_at: updatedLoan.approved_at }),
            ...(status === 'rejected' && { rejection_reason: reason })
          }
        });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    // Send email notification for status changes
    if ((status === 'approved' || status === 'rejected') && userEmail) {
      try {
        if (status === 'approved') {
          const emailHtml = `
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
                    Your ${updatedLoan.loan_type} loan application has been approved and is now active.
                  </p>

                  <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0;">
                    <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
                      Loan Details
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Principal Amount:</td>
                        <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                          $${parseFloat(updatedLoan.principal).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Interest Rate:</td>
                        <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                          ${updatedLoan.interest_rate}%
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Term:</td>
                        <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                          ${updatedLoan.term_months} months
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Monthly Payment:</td>
                        <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                          $${parseFloat(updatedLoan.monthly_payment_amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    </table>
                  </div>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
                    The loan will be disbursed to your account shortly. You can view your loan details and payment schedule in your online banking dashboard.
                  </p>

                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://www.theoaklinebank.com/login" 
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
          `;

          await sendEmail({
            to: userEmail,
            subject: '🎉 Your Loan Has Been Approved - Oakline Bank',
            html: emailHtml,
            type: EMAIL_TYPES.NOTIFY
          });

          console.log('Loan approval email sent to:', userEmail);
        } else if (status === 'rejected') {
          const rejectionEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 32px 24px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">Loan Application Update</h1>
                  <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
                </div>

                <div style="padding: 40px 32px;">
                  <h2 style="color: #dc2626; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                    Application Status Update
                  </h2>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Thank you for applying for a ${updatedLoan.loan_type} loan with Oakline Bank. After careful review, we regret to inform you that your application has not been approved at this time.
                  </p>

                  <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 24px 0;">
                    <h3 style="color: #991b1b; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
                      Application Details
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Loan Type:</td>
                        <td style="padding: 8px 0; text-align: right; color: #991b1b; font-weight: 700;">
                          ${updatedLoan.loan_type?.toUpperCase()}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Requested Amount:</td>
                        <td style="padding: 8px 0; text-align: right; color: #991b1b; font-weight: 700;">
                          $${parseFloat(updatedLoan.principal).toLocaleString()}
                        </td>
                      </tr>
                      ${reason ? `
                      <tr>
                        <td colspan="2" style="padding: 16px 0 8px 0; color: #4a5568; font-weight: 600;">Reason:</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 0; color: #991b1b;">
                          ${reason}
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
                    We encourage you to contact our loan specialists to discuss alternative options or to understand what steps you can take to improve your eligibility for future applications.
                  </p>

                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://www.theoaklinebank.com/login" 
                       style="display: inline-block; background-color: #3b82f6; color: #ffffff; 
                              padding: 14px 32px; text-decoration: none; border-radius: 8px; 
                              font-weight: 600; font-size: 16px;">
                      Contact Support
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
            subject: 'Loan Application Update - Oakline Bank',
            html: rejectionEmailHtml,
            type: EMAIL_TYPES.NOTIFY
          });

          console.log('Loan rejection email sent to:', userEmail);
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Send email notification for loan closure
    if (status === 'closed' && userEmail) {
      try {
        const { data: bankDetails } = await supabaseAdmin
          .from('bank_details')
          .select('*')
          .limit(1)
          .single();

        const loansEmail = bankDetails?.email_loans || 'loans@theoaklinebank.com';
        const supportEmail = bankDetails?.email_support || 'support@theoaklinebank.com';
        const bankPhone = bankDetails?.phone || '+1 (636) 635-6122';

        const closedEmailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Loan Account Closed - Oakline Bank</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🎉 Congratulations!</h1>
                <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Your Loan Has Been Successfully Closed</p>
              </div>

              <div style="padding: 40px 32px;">
                <h2 style="color: #059669; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                  Dear ${updatedLoan.profiles?.first_name || 'Valued Customer'},
                </h2>

                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  We are delighted to inform you that your ${updatedLoan.loan_type} loan with Oakline Bank has been successfully closed. This achievement represents your commitment to financial responsibility and timely payment fulfillment.
                </p>

                <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 24px; margin: 24px 0; border-radius: 8px;">
                  <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                    📊 Final Loan Summary
                  </h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 10px 0; color: #4a5568; font-weight: 600; border-bottom: 1px solid #d1fae5;">Loan Type:</td>
                      <td style="padding: 10px 0; text-align: right; color: #065f46; font-weight: 700; border-bottom: 1px solid #d1fae5; text-transform: capitalize;">
                        ${updatedLoan.loan_type || 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #4a5568; font-weight: 600; border-bottom: 1px solid #d1fae5;">Original Principal Amount:</td>
                      <td style="padding: 10px 0; text-align: right; color: #065f46; font-weight: 700; border-bottom: 1px solid #d1fae5;">
                        $${parseFloat(updatedLoan.principal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #4a5568; font-weight: 600; border-bottom: 1px solid #d1fae5;">Interest Rate:</td>
                      <td style="padding: 10px 0; text-align: right; color: #065f46; font-weight: 700; border-bottom: 1px solid #d1fae5;">
                        ${updatedLoan.interest_rate}%
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #4a5568; font-weight: 600; border-bottom: 1px solid #d1fae5;">Total Payments Made:</td>
                      <td style="padding: 10px 0; text-align: right; color: #065f46; font-weight: 700; border-bottom: 1px solid #d1fae5;">
                        ${updatedLoan.payments_made || 0} payment${(updatedLoan.payments_made || 0) !== 1 ? 's' : ''}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #4a5568; font-weight: 600;">Final Status:</td>
                      <td style="padding: 10px 0; text-align: right; color: #065f46; font-weight: 700;">
                        ✅ PAID IN FULL
                      </td>
                    </tr>
                  </table>
                </div>

                <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 8px;">
                  <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                    📌 Important Information
                  </h3>
                  <ul style="color: #4a5568; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                    <li>This specific loan has been paid in full and closed</li>
                    <li>No further payments are required for this loan</li>
                    <li>Your banking relationship with Oakline Bank remains active</li>
                    <li>This closure will be reflected in your loan history</li>
                    <li>Your payment history may positively impact your credit profile</li>
                  </ul>
                </div>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="https://www.theoaklinebank.com/dashboard" 
                     style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(30, 64, 175, 0.2);">
                    View Account Dashboard
                  </a>
                </div>

                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 8px;">
                  <p style="color: #92400e; margin: 0 0 8px 0; font-size: 14px; line-height: 1.6; font-weight: 600;">
                    💬 Need Assistance?
                  </p>
                  <p style="color: #4a5568; margin: 0; font-size: 14px; line-height: 1.6;">
                    For any questions regarding your loan closure or to explore additional financial services, please contact our Loan Services Department at <a href="mailto:${loansEmail}" style="color: #1e40af; text-decoration: none; font-weight: 600;">${loansEmail}</a> or call us at <strong>${bankPhone}</strong>.
                  </p>
                </div>

                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
                  Thank you for choosing Oakline Bank as your trusted financial partner. We appreciate your business and look forward to serving your future banking needs.
                </p>
              </div>

              <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0; text-align: center;">
                  <strong>Oakline Bank</strong><br>
                  12201 N May Avenue, Oklahoma City, OK 73120<br>
                  Member FDIC | Routing Number: 075915826
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0; text-align: center;">
                  This is an automated notification from Oakline Bank. Please do not reply to this email.<br>
                  For assistance, contact us at <a href="mailto:${supportEmail}" style="color: #3b82f6; text-decoration: none;">${supportEmail}</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail({
          to: userEmail,
          subject: '✅ Loan Account Closed - Oakline Bank',
          html: closedEmailHtml,
          type: EMAIL_TYPES.LOANS,
          from: `Oakline Bank <${loansEmail}>`
        });

        console.log('Loan closure email sent to:', userEmail);
      } catch (emailError) {
        console.error('Error sending loan closure email:', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Loan ${status} successfully`,
      loan: updatedLoan // Returning the updatedLoan object
    });

  } catch (error) {
    console.error('Error in update-loan-status:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}