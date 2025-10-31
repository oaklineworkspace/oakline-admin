
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
    const { email, firstName, lastName, tempPassword, bankDetails } = req.body;

    if (!email || !tempPassword) {
      return res.status(400).json({ error: 'Email and password are required' });
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
        <title>Your Oakline Bank Credentials</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🏦 Oakline Bank</h1>
            <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Your Account Credentials</p>
          </div>
          
          <div style="padding: 40px 32px;">
            <h2 style="color: #1e40af; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
              Welcome, ${firstName} ${lastName}!
            </h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Your enrollment has been completed successfully. Below are your login credentials:
            </p>
            
            <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 24px; margin: 24px 0; border-radius: 8px;">
              <h3 style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                🔐 Your Login Credentials
              </h3>
              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px; font-weight: 600; display: block; margin-bottom: 4px;">Email:</span>
                <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${email}</span>
              </div>
              <div>
                <span style="color: #64748b; font-size: 14px; font-weight: 600; display: block; margin-bottom: 4px;">Temporary Password:</span>
                <code style="background-color: #e0f2fe; color: #0c4a6e; padding: 8px 12px; border-radius: 6px; font-size: 18px; font-weight: 700; display: inline-block; letter-spacing: 1px;">${tempPassword}</code>
              </div>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 24px 0; border-radius: 8px;">
              <p style="color: #92400e; font-size: 14px; font-weight: 500; margin: 0;">
                ⚠️ <strong>Important Security Notice:</strong> Please use the button below to securely log in and set your permanent password. This temporary password will expire in 24 hours.
              </p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="https://www.theoaklinebank.com/security" 
                 style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
                        color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; 
                        font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);">
                🔐 Set Your Password
              </a>
            </div>

            <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 8px;">
              <p style="color: #1e40af; font-size: 14px; font-weight: 500; margin: 0;">
                💡 <strong>Next Steps:</strong> After logging in with your temporary password, you'll be prompted to create a new secure password. Once set, you'll be redirected to your dashboard.
              </p>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
              <h4 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                📞 Need Help?
              </h4>
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                Contact our support team:<br/>
                <strong>Email:</strong> ${bankDetails?.email_support || 'support@theoaklinebank.com'}<br/>
                <strong>Phone:</strong> ${bankDetails?.phone || '+1 (636) 635-6122'}
              </p>
            </div>
          </div>
          
          <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br/>
              Member FDIC | Routing: ${bankDetails?.routing_number || '075915826'}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: bankDetails?.email_welcome || process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: '🔐 Your Oakline Bank Login Credentials',
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Enrollment credentials sent to ${email}: ${info.response}`);

    res.status(200).json({ 
      success: true,
      message: 'Credentials sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending enrollment credentials:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      message: error.message 
    });
  }
}
