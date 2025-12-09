
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userEmail, userName, loanType, principal, loanReference, accountNumber } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">💰 Loan Disbursed!</h1>
            <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
          </div>
          
          <div style="padding: 40px 32px;">
            <h2 style="color: #1e40af; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
              Hello ${userName || 'Valued Customer'}!
            </h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Your loan has been successfully disbursed to your account. The funds are now available for use.
            </p>
            
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 8px;">
              <h3 style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
                Disbursement Details
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Loan Reference:</td>
                  <td style="padding: 8px 0; text-align: right; color: #1e40af; font-weight: 700; font-family: monospace;">
                    ${loanReference}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Amount Disbursed:</td>
                  <td style="padding: 8px 0; text-align: right; color: #1e40af; font-weight: 700;">
                    $${parseFloat(principal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Loan Type:</td>
                  <td style="padding: 8px 0; text-align: right; color: #1e40af; font-weight: 700; text-transform: capitalize;">
                    ${loanType || 'Personal Loan'}
                  </td>
                </tr>
                ${accountNumber ? `
                <tr>
                  <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Credited to Account:</td>
                  <td style="padding: 8px 0; text-align: right; color: #1e40af; font-weight: 700; font-family: monospace;">
                    ****${accountNumber.slice(-4)}
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0;">
              <p style="color: #059669; font-size: 14px; margin: 0 0 8px 0;"><strong>✅ What's Next:</strong></p>
              <p style="color: #047857; font-size: 14px; margin: 4px 0;">• The funds are now available in your account</p>
              <p style="color: #047857; font-size: 14px; margin: 4px 0;">• Your first payment will be due in 30 days</p>
              <p style="color: #047857; font-size: 14px; margin: 4px 0;">• You can view your payment schedule in your dashboard</p>
            </div>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://www.theoaklinebank.com/loans" 
                 style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
                View Loan Details
              </a>
            </div>
          </div>
          
          <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0; text-align: center;">
              Oakline Bank | 12201 N May Avenue, Oklahoma City, OK 73120<br>
              Member FDIC | Routing: 075915826
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: userEmail,
      subject: '💰 Your Loan Has Been Disbursed - Oakline Bank',
      html: emailHtml,
      type: EMAIL_TYPES.LOANS
    });

    return res.status(200).json({ success: true, message: 'Loan disbursement email sent' });
  } catch (error) {
    console.error('Error sending loan disbursement email:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
