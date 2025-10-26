
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import nodemailer from 'nodemailer';

function generateSecurePassword() {
  const capitalLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '#$';
  
  const randomCapital = capitalLetters[Math.floor(Math.random() * capitalLetters.length)];
  const randomSpecial = specialChars[Math.floor(Math.random() * specialChars.length)];
  
  let password = randomCapital;
  
  const wordLength = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < wordLength; i++) {
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
  }
  
  const numberLength = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < numberLength; i++) {
    password += numbers[Math.floor(Math.random() * numbers.length)];
  }
  
  password += randomSpecial;
  
  return password;
}

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
          return `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #1f2937;">${type}</strong>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-family: 'Courier New', monospace; color: #4b5563;">
                ****${num.slice(-4)}
              </td>
            </tr>
          `;
        }).join('')
      : '<tr><td colspan="2" style="padding: 12px; text-align: center; color: #6b7280;">Your account has been created</td></tr>';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Oakline Bank</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #ffffff;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff;">
                
                <!-- Header -->
                <tr>
                  <td style="background-color: #004aad; padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">${bankInfo.name}</h1>
                    <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.95;">Your Account Has Been Approved</p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: bold;">
                      Welcome, ${first_name} ${last_name}!
                    </h2>
                    
                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                      Welcome to ${bankInfo.name}! Your account is now active and ready to use. We're excited to have you on board and provide you with secure, convenient banking services.
                    </p>
                    
                    <!-- Login Credentials Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; border-radius: 8px; margin: 30px 0;">
                      <tr>
                        <td style="padding: 25px;">
                          <h3 style="margin: 0 0 15px 0; color: #004aad; font-size: 18px; font-weight: bold;">
                            Your Login Credentials
                          </h3>
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 8px 0; color: #374151; font-size: 15px;">
                                <strong>Email:</strong>
                              </td>
                              <td style="padding: 8px 0; color: #1f2937; font-size: 15px;">
                                ${email}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #374151; font-size: 15px;">
                                <strong>Temporary Password:</strong>
                              </td>
                              <td style="padding: 8px 0;">
                                <code style="background-color: #e5e7eb; padding: 6px 12px; border-radius: 4px; font-family: 'Courier New', monospace; color: #1f2937; font-size: 15px; font-weight: bold;">${temp_password}</code>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Sign In Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" style="display: inline-block; background-color: #004aad; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Sign In Now</a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Account Information -->
                    <h3 style="margin: 30px 0 15px 0; color: #1f2937; font-size: 18px; font-weight: bold;">
                      Your Account Information
                    </h3>
                    <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                      ${accountInfo}
                    </table>
                    
                    <!-- Warning Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef3c7; border-left: 4px solid #f59e0b; margin: 30px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                            <strong>⚠️ Important Security Notice:</strong> Please change your temporary password immediately after your first login for security purposes. You can do this in your account settings.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Next Steps -->
                    <h3 style="margin: 30px 0 15px 0; color: #1f2937; font-size: 18px; font-weight: bold;">
                      Next Steps
                    </h3>
                    <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 15px; line-height: 1.8;">
                      <li>Sign in using the credentials above</li>
                      <li>Change your temporary password immediately</li>
                      <li>Set up security questions</li>
                      <li>Explore your dashboard and account features</li>
                    </ul>
                    
                    <p style="margin: 30px 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                      If you have any questions or need assistance, please don't hesitate to contact us.
                    </p>
                    
                    <p style="margin: 0; color: #374151; font-size: 16px;">
                      Thank you for choosing ${bankInfo.name}!
                    </p>
                    <p style="margin: 5px 0 0 0; color: #374151; font-size: 16px; font-weight: bold;">
                      The ${bankInfo.name} Team
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: bold;">
                      ${bankInfo.name}
                    </p>
                    <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">
                      ${bankInfo.branch_name}
                    </p>
                    <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">
                      ${bankInfo.address}
                    </p>
                    <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">
                      Phone: <a href="tel:${bankInfo.phone}" style="color: #004aad; text-decoration: none;">${bankInfo.phone}</a>
                    </p>
                    <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px;">
                      Support: <a href="mailto:${bankInfo.email_contact || 'contact-us@theoaklinebank.com'}" style="color: #004aad; text-decoration: none;">${bankInfo.email_contact || 'contact-us@theoaklinebank.com'}</a>
                    </p>
                    <p style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
                      © ${new Date().getFullYear()} ${bankInfo.name}. All rights reserved.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${bankInfo.name}" <${bankInfo.email_welcome || 'welcome@theoaklinebank.com'}>`,
      to: email,
      subject: `Welcome to ${bankInfo.name} — Your Account Has Been Approved`,
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
