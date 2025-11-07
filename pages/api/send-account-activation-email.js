import nodemailer from 'nodemailer';

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
    const { email, firstName, lastName, accountNumber, accountType } = req.body;

    if (!email || !accountNumber) {
      return res.status(400).json({ error: 'Email and account number are required' });
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

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Activated - Oakline Bank</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🏦 Oakline Bank</h1>
            <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Account Activated!</p>
          </div>
          
          <div style="padding: 40px 32px;">
            <h2 style="color: #10b981; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
              Congratulations, ${firstName || 'Valued Customer'}!
            </h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Your account has been successfully activated! Thank you for completing the minimum deposit requirement.
            </p>
            
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0;">
              <h3 style="color: #059669; font-size: 18px; margin: 0 0 12px 0;">Account Details</h3>
              <p style="color: #4a5568; margin: 4px 0;"><strong>Account Number:</strong> ${accountNumber}</p>
              <p style="color: #4a5568; margin: 4px 0;"><strong>Account Type:</strong> ${accountType || 'Checking'}</p>
              <p style="color: #4a5568; margin: 4px 0;"><strong>Status:</strong> <span style="color: #10b981; font-weight: 600;">Active</span></p>
            </div>
            
            <h3 style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 24px 0 12px 0;">
              What's Next?
            </h3>
            
            <ul style="color: #4a5568; font-size: 15px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
              <li>Log in to your online banking account</li>
              <li>Set up your profile and security preferences</li>
              <li>Explore our mobile banking app</li>
              <li>Link external accounts if needed</li>
              <li>Start using your account for transactions</li>
            </ul>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://theoaklinebank.com'}/login" 
                 style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
                Access Your Account
              </a>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Need Help?</strong> Contact our customer support team at support@theoaklinebank.com or call +1 (636) 635-6122.
              </p>
            </div>
          </div>
          
          <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0; text-align: center;">
              Oakline Bank | 12201 N May Avenue, Oklahoma City, OK 73120<br>
              Member FDIC | Routing: 075915826
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
              This email was sent to ${email}. If you did not request this, please contact us immediately.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Oakline Bank" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🎉 Your Oakline Bank Account is Now Active!',
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Account activation email sent to ${email}: ${info.response}`);

    res.status(200).json({ 
      success: true,
      message: 'Account activation email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending account activation email:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      message: error.message 
    });
  }
}
