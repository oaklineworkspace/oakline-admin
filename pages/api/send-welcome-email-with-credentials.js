
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
      site_url,
      bank_details
    } = req.body;

    if (!email || !first_name || !last_name || !temp_password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch bank details if not provided
    let bankInfo = bank_details;
    if (!bankInfo) {
      const { data, error } = await supabaseAdmin
        .from('bank_details')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Failed to fetch bank details:', error);
        return res.status(500).json({ error: 'Failed to fetch bank details' });
      }
      bankInfo = data;
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const detectedSiteUrl = site_url || process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    
    console.log('Using site URL for login:', detectedSiteUrl);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Test SMTP connection
    console.log('Testing SMTP connection...');
    try {
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (smtpError) {
      console.error('SMTP connection failed:', smtpError.message);
      return res.status(500).json({ 
        error: 'Email service connection failed',
        message: smtpError.message
      });
    }

    const fullName = middle_name 
      ? `${first_name} ${middle_name} ${last_name}`
      : `${first_name} ${last_name}`;

    const loginUrl = `${detectedSiteUrl}/login`;

    // Format account info
    const accountInfo = account_numbers && account_numbers.length > 0
      ? account_numbers.map((num, idx) => {
          const type = account_types && account_types[idx] 
            ? account_types[idx].replace('_', ' ').toUpperCase() 
            : 'ACCOUNT';
          return `<li><strong>${type}:</strong> ****${num.slice(-4)}</li>`;
        }).join('')
      : '<li>Your account has been created</li>';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #0056b3 0%, #003d82 100%); padding: 32px 24px; text-align: center; }
          .header h1 { color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; }
          .header p { color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0; }
          .content { padding: 40px 32px; }
          .content h2 { color: #0056b3; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; }
          .content p { color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
          .credentials-box { background-color: #f0f9ff; border-left: 4px solid #0056b3; padding: 20px; margin: 24px 0; }
          .credentials-box h3 { color: #0056b3; margin-top: 0; }
          .credentials-box p { margin: 8px 0; }
          .credentials-box code { background-color: #e0f2fe; padding: 5px 10px; border-radius: 4px; font-family: monospace; }
          .button { display: inline-block; background-color: #0056b3; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
          .warning-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; }
          .warning-box p { margin: 0; color: #92400e; font-size: 14px; }
          .footer { background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
          .footer p { color: #718096; font-size: 12px; margin: 4px 0; }
          .footer a { color: #0056b3; text-decoration: none; }
          ul { padding-left: 20px; }
          li { margin-bottom: 8px; color: #4a5568; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏦 ${bankInfo.name}</h1>
            <p>Welcome to Your Financial Future</p>
          </div>
          
          <div class="content">
            <h2>Welcome, ${fullName}!</h2>
            
            <p>Your application has been approved! Your ${bankInfo.name} account is now active and ready to use.</p>
            
            <div class="credentials-box">
              <h3>Your Login Credentials</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong> <code>${temp_password}</code></p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" class="button">Sign In Now</a>
            </div>

            <h3>Your Account Information:</h3>
            <ul>
              ${accountInfo}
            </ul>

            <div class="warning-box">
              <p><strong>⚠️ Important:</strong> Please change your password immediately after your first login for security purposes. You can do this in your account settings.</p>
            </div>

            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Sign in using the credentials above</li>
              <li>Change your temporary password</li>
              <li>Set up security questions</li>
              <li>Explore your dashboard and account features</li>
            </ul>

            <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
            
            <p>Thank you for choosing ${bankInfo.name}!</p>
            <p><strong>The ${bankInfo.name} Team</strong></p>
          </div>
          
          <div class="footer">
            <p><strong>${bankInfo.name}</strong></p>
            <p>${bankInfo.branch_name}</p>
            <p>${bankInfo.address}</p>
            <p>Phone: <a href="tel:${bankInfo.phone}">${bankInfo.phone}</a></p>
            <p>Email: <a href="mailto:${bankInfo.email_info}">${bankInfo.email_info}</a></p>
            <p style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
              Routing Number: ${bankInfo.routing_number} | SWIFT: ${bankInfo.swift_code}
            </p>
            <p>NMLS ID: ${bankInfo.nmls_id}</p>
            <p style="margin-top: 16px;">© ${new Date().getFullYear()} ${bankInfo.name}. All rights reserved.</p>
            <p>Member FDIC | Equal Housing Lender</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${bankInfo.name}" <${bankInfo.email_welcome || bankInfo.email_notify}>`,
      to: email,
      subject: `Welcome to ${bankInfo.name} - Your Account is Active!`,
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', info.messageId);

    return res.status(200).json({ 
      success: true, 
      message: 'Welcome email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending welcome email:', error);
    return res.status(500).json({ 
      error: 'Failed to send welcome email',
      details: error.message 
    });
  }
}
