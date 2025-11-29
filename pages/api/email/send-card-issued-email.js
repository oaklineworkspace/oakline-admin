import nodemailer from 'nodemailer';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('Missing SMTP environment variables:', missingVars);
    return res.status(500).json({ 
      error: 'Email service not configured',
      message: `Missing environment variables: ${missingVars.join(', ')}`
    });
  }

  try {
    const { email, firstName, lastName, cardBrand, cardCategory, accountNumber, cardLastFour, expiryDate, dailyLimit, monthlyLimit } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Fetch bank details
    const { data: bankDetails, error: bankError } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    if (bankError) {
      console.error('Failed to fetch bank details:', bankError);
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const cardTypeDisplay = cardCategory === 'debit' ? 'Debit Card' : 'Credit Card';
    const cardBrandDisplay = cardBrand ? cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1) : 'Visa';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your New Card is Ready - Oakline Bank</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🏦 Oakline Bank</h1>
            <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Your New Card is Ready!</p>
          </div>
          
          <div style="padding: 40px 32px;">
            <h2 style="color: #0f766e; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
              Hello ${firstName || 'Valued Customer'}!
            </h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Great news! Your new ${cardBrandDisplay} ${cardTypeDisplay} has been issued and is ready to use. Please review the details below.
            </p>
            
            <div style="background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 20px; margin: 24px 0; border-radius: 8px;">
              <h3 style="color: #0f766e; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">Card Details</h3>
              <table style="width: 100%; color: #4a5568; font-size: 15px; line-height: 1.8;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Card Type:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; text-align: right;">${cardBrandDisplay} ${cardTypeDisplay}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Card Number:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; text-align: right;">•••• •••• •••• ${cardLastFour}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Expiry Date:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; text-align: right;">${expiryDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Linked Account:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; text-align: right;">${accountNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Daily Limit:</strong></td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #d1fae5; text-align: right;">$${dailyLimit.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Monthly Limit:</strong></td>
                  <td style="padding: 8px 0; text-align: right;">$${monthlyLimit.toLocaleString()}</td>
                </tr>
              </table>
            </div>
            
            <h3 style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 24px 0 12px 0;">
              ✓ What's Next?
            </h3>
            
            <ul style="color: #4a5568; font-size: 15px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
              <li>Activate your card through your online banking dashboard</li>
              <li>Set up your PIN at an ATM or through the mobile app</li>
              <li>Add your card to digital wallets (Apple Pay, Google Pay, etc.)</li>
              <li>Review your transaction history regularly</li>
              <li>Contact us if you have any questions</li>
            </ul>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 8px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⚠ Security Tip:</strong> Never share your card number, PIN, or CVC with anyone. Oakline Bank staff will never ask for this information.
              </p>
            </div>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://theoaklinebank.com'}/login" 
                 style="background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
                Access Your Account
              </a>
            </div>

            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 8px;">
              <p style="color: #4a5568; margin: 0; font-size: 14px; line-height: 1.6;">
                <strong>Need Help?</strong> Our customer support team is available 24/7. Contact us at ${bankDetails?.email_notify || 'support@theoaklinebank.com'} or call ${bankDetails?.phone || '+1 (636) 635-6122'}.
              </p>
            </div>
          </div>
          
          <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0; text-align: center;">
              Oakline Bank | 12201 N May Avenue, Oklahoma City, OK 73120<br>
              Member FDIC | Routing: 075915826
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
              This email was sent to ${email}. If you did not request a card, please contact us immediately.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${bankDetails?.name || 'Oakline Bank'}" <${bankDetails?.email_cards || `cards@${process.env.BANK_EMAIL_DOMAIN || 'theoaklinebank.com'}`}>`,
      to: email,
      subject: '💳 Your New Oakline Bank Card is Ready to Use',
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Card issued email sent to ${email}: ${info.response}`);

    return res.status(200).json({ 
      success: true,
      message: 'Card issuance email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending card issued email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      message: error.message 
    });
  }
}
