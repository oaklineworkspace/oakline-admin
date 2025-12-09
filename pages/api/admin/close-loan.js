
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
    const { loanId } = req.body;

    if (!loanId) {
      return res.status(400).json({ error: 'Loan ID is required' });
    }

    // Fetch the loan details
    const { data: loan, error: loanFetchError } = await supabaseAdmin
      .from('loans')
      .select(`
        *,
        profiles (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', loanId)
      .single();

    if (loanFetchError || !loan) {
      console.error('Loan fetch error:', loanFetchError);
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Validate loan can be closed
    if (loan.status === 'closed') {
      return res.status(400).json({ error: 'Loan is already closed' });
    }

    const remainingBalance = parseFloat(loan.remaining_balance || 0);
    if (remainingBalance > 0) {
      return res.status(400).json({ 
        error: `Cannot close loan with remaining balance of $${remainingBalance.toFixed(2)}. Please ensure all payments are processed first.` 
      });
    }

    // Close the loan
    const { data: updatedLoan, error: updateError } = await supabaseAdmin
      .from('loans')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', loanId)
      .select()
      .single();

    if (updateError) {
      console.error('Error closing loan:', updateError);
      return res.status(500).json({ error: 'Failed to close loan', details: updateError.message });
    }

    // Send email notification
    if (loan.profiles?.email) {
      try {
        const { data: bankDetails } = await supabaseAdmin
          .from('bank_details')
          .select('*')
          .limit(1)
          .single();

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Loan Closed - Congratulations! - Oakline Bank</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🎉 Congratulations!</h1>
                <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Loan Successfully Closed</p>
              </div>
              
              <div style="padding: 40px 32px;">
                <h2 style="color: #1e40af; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                  Hello ${loan.profiles?.first_name || 'Valued Customer'}!
                </h2>
                
                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  We're pleased to inform you that your ${loan.loan_type} loan has been successfully closed. You've completed all payments and fulfilled your loan obligations.
                </p>
                
                <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0; border-radius: 8px;">
                  <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
                    Final Loan Summary
                  </h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Loan Type:</td>
                      <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                        ${loan.loan_type || 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Original Principal:</td>
                      <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                        $${parseFloat(loan.principal).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Total Payments Made:</td>
                      <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                        ${loan.payments_made || 0}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Final Status:</td>
                      <td style="padding: 8px 0; text-align: right; color: #065f46; font-weight: 700;">
                        PAID IN FULL ✓
                      </td>
                    </tr>
                  </table>
                </div>
                
                <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 8px;">
                  <p style="color: #4a5568; margin: 0; font-size: 14px; line-height: 1.6;">
                    <strong>What's Next?</strong> This specific loan has been paid in full and closed. No further payments are required for this loan. Your banking relationship with Oakline Bank remains active, and your loan history will continue to reflect this completed loan. Thank you for being a valued customer!
                  </p>
                </div>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="https://www.theoaklinebank.com/loans" 
                     style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
                    View Loan History
                  </a>
                </div>

                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 8px;">
                  <p style="color: #4a5568; margin: 0; font-size: 14px; line-height: 1.6;">
                    <strong>Questions?</strong> Contact us at ${bankDetails?.email_loans || 'loans@theoaklinebank.com'} or call ${bankDetails?.phone || '+1 (636) 635-6122'}.
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
          to: loan.profiles.email,
          subject: '🎉 Congratulations! Your Loan Has Been Closed - Oakline Bank',
          html: emailHtml,
          type: EMAIL_TYPES.LOANS
        });
      } catch (emailError) {
        console.error('Failed to send loan closure email:', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Loan closed successfully',
      loan: updatedLoan
    });

  } catch (error) {
    console.error('Error in close-loan:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
