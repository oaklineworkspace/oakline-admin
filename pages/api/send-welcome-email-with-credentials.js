
import { supabaseAdmin } from '../../lib/supabaseAdmin';
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
    const {
      email,
      first_name,
      middle_name,
      last_name,
      temp_password,
      account_numbers,
      account_types,
      application_id,
      country,
      site_url
    } = req.body;

    if (!email || !first_name || !last_name || !temp_password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const detectedSiteUrl = site_url || process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();

    const fullName = `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`;
    const loginUrl = `${detectedSiteUrl}/login`;

    const populatedAccountNumbers = account_numbers ? account_numbers.filter(num => num && num.trim() !== '') : [];
    const populatedAccountTypes = account_types ? account_types.filter(type => type && type.trim() !== '') : [];

    let accountDetailsHtml = populatedAccountNumbers.length > 0 ? `
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <h3 style="margin-top: 0; color: #1e40af; font-size: 18px;">📊 Your Account Numbers:</h3>
        ${populatedAccountNumbers.map((num, index) => `
          <p style="font-family: 'Courier New', monospace; font-size: 15px; margin: 8px 0; padding: 8px; background: white; border-radius: 4px;">
            <strong style="color: #2d3748;">${populatedAccountTypes[index] ? populatedAccountTypes[index].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Account'}:</strong> 
            <span style="color: #1e40af; font-weight: bold;">${num}</span>
          </p>
        `).join('')}
        <p style="font-family: 'Courier New', monospace; font-size: 15px; margin: 8px 0; padding: 8px; background: white; border-radius: 4px;">
          <strong style="color: #2d3748;">Routing Number:</strong> 
          <span style="color: #1e40af; font-weight: bold;">075915826</span>
        </p>
      </div>
    ` : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Oakline Bank - Your Account is Ready!</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f7fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🏦 Welcome to Oakline Bank!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your account is now active</p>
          </div>
          
          <div style="padding: 40px 30px;">
            <h2 style="color: #1e40af; font-size: 22px; margin-top: 0;">Hello ${fullName},</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Congratulations! Your Oakline Bank application has been <strong style="color: #10b981;">approved</strong> and your accounts are now ready to use.
            </p>

            ${accountDetailsHtml}

            <div style="background: #fff7ed; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <h3 style="margin-top: 0; color: #92400e; font-size: 18px;">🔐 Your Login Credentials</h3>
              <p style="margin: 10px 0; font-size: 15px; color: #78350f;">
                <strong>Email:</strong> <span style="font-family: 'Courier New', monospace;">${email}</span>
              </p>
              <p style="margin: 10px 0; font-size: 15px; color: #78350f;">
                <strong>Temporary Password:</strong> 
                <code style="background: #fef3c7; padding: 8px 12px; border-radius: 4px; font-size: 16px; color: #92400e; font-weight: bold; display: inline-block; margin-top: 5px;">${temp_password}</code>
              </p>
              <p style="margin: 15px 0 0 0; font-size: 14px; color: #92400e;">
                ⚠️ <strong>Important:</strong> Please change this password immediately after your first login for security.
              </p>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${loginUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                Login to Your Account →
              </a>
            </div>

            <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <h3 style="margin-top: 0; color: #065f46; font-size: 16px;">✅ What's Next?</h3>
              <ul style="margin: 10px 0; padding-left: 20px; color: #047857;">
                <li style="margin: 8px 0;">Log in using your email and temporary password</li>
                <li style="margin: 8px 0;">Change your password to something secure and memorable</li>
                <li style="margin: 8px 0;">Explore your dashboard and account features</li>
                <li style="margin: 8px 0;">Set up additional security options (2FA recommended)</li>
                <li style="margin: 8px 0;">Start managing your finances!</li>
              </ul>
            </div>

            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #1e40af; font-size: 16px;">💡 Need Help?</h3>
              <p style="margin: 5px 0; color: #1e3a8a;">
                Our customer support team is here to assist you 24/7. Contact us at:
              </p>
              <p style="margin: 10px 0; color: #1e3a8a;">
                📧 Email: <a href="mailto:support@oaklinebank.com" style="color: #2563eb;">support@oaklinebank.com</a><br>
                📞 Phone: 1-800-OAKLINE
              </p>
            </div>

            <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 30px;">
              Thank you for choosing Oakline Bank. We're committed to providing you with exceptional banking services.
            </p>

            <p style="font-size: 16px; color: #1e40af; font-weight: bold; margin-top: 20px;">
              Welcome aboard! 🎉<br>
              The Oakline Bank Team
            </p>
          </div>
          
          <div style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
              Member FDIC | Equal Housing Lender
            </p>
            <p style="color: #a0aec0; font-size: 11px; margin: 10px 0 0 0;">
              This email was sent to ${email}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Welcome to Oakline Bank - Your Login Credentials",
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Welcome email with credentials sent to ${email}: ${info.response}`);

    res.status(200).json({
      message: 'Welcome email with credentials sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending welcome email with credentials:', error);
    res.status(500).json({ 
      error: 'Failed to send welcome email',
      message: error.message 
    });
  }
}
