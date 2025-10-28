
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import nodemailer from 'nodemailer';

// Generate a secure password with the specified rules:
// - Starts with capital letter
// - Followed by small letters and numbers
// - Special characters: $ & @ #
// - Total length 10-12 characters
function generateSecurePassword() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const specials = ['$', '&', '@', '#'];

  // Start with one uppercase letter
  const first = upper[Math.floor(Math.random() * upper.length)];

  // Generate 6-8 lowercase letters and digits
  const pick = (str, n) => {
    let out = '';
    for (let i = 0; i < n; i++) {
      out += str[Math.floor(Math.random() * str.length)];
    }
    return out;
  };

  const middleLength = 6 + Math.floor(Math.random() * 3); // 6-8 characters
  const middle = pick(lower + digits, middleLength);

  // Add 1-2 special characters
  const specialCount = 1 + Math.floor(Math.random() * 2);
  let specialPart = '';
  for (let i = 0; i < specialCount; i++) {
    specialPart += specials[Math.floor(Math.random() * specials.length)];
  }

  return first + middle + specialPart;
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
      has_pending_accounts,
      pending_account_types,
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
            ? account_types[idx].replace(/_/g, ' ').toUpperCase() 
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

    const logoUrl = `${detectedSiteUrl}/images/Oakline_Bank_logo_design_c1b04ae0.png`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${bankInfo.name}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);">
                
                <!-- Header with Logo -->
                <tr>
                  <td style="background: linear-gradient(135deg, #004aad 0%, #0066dd 100%); padding: 50px 30px; text-align: center;">
                    <img src="${logoUrl}" alt="${bankInfo.name}" style="max-width: 240px; height: auto; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto;" />
                    <h1 style="margin: 20px 0 0 0; color: #ffffff; font-size: 38px; font-weight: bold; letter-spacing: 0.5px;">${bankInfo.name}</h1>
                    <p style="margin: 16px 0 0 0; color: #ffffff; font-size: 20px; opacity: 0.95; font-weight: 500;">Your Account Has Been Approved</p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 50px 40px; background-color: #ffffff;">
                    <h2 style="margin: 0 0 24px 0; color: #1f2937; font-size: 32px; font-weight: bold;">
                      Welcome, ${first_name} ${last_name}!
                    </h2>
                    
                    <p style="margin: 0 0 28px 0; color: #374151; font-size: 19px; line-height: 1.7;">
                      Your Oakline Bank account is now active and ready to use. We're excited to provide you with secure, convenient banking services.
                    </p>
                    
                    <!-- Login Credentials Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 12px; margin: 35px 0; border: 2px solid #004aad;">
                      <tr>
                        <td style="padding: 32px;">
                          <h3 style="margin: 0 0 20px 0; color: #004aad; font-size: 24px; font-weight: bold;">
                            🔐 Your Login Credentials
                          </h3>
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 12px 0; color: #374151; font-size: 18px; width: 42%;">
                                <strong>Email:</strong>
                              </td>
                              <td style="padding: 12px 0; color: #1f2937; font-size: 18px;">
                                ${email}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0; color: #374151; font-size: 18px;">
                                <strong>Temporary Password:</strong>
                              </td>
                              <td style="padding: 12px 0;">
                                <code style="background-color: #e5e7eb; padding: 12px 18px; border-radius: 6px; font-family: 'Courier New', monospace; color: #1f2937; font-size: 20px; font-weight: bold; display: inline-block; letter-spacing: 1px;">${temp_password}</code>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Sign In Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 35px 0;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" style="display: inline-block; background-color: #004aad; color: #ffffff; padding: 20px 60px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 20px; box-shadow: 0 4px 8px rgba(0, 74, 173, 0.3); transition: all 0.3s ease;">🚀 Sign In Now</a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Account Information -->
                    <h3 style="margin: 35px 0 20px 0; color: #1f2937; font-size: 24px; font-weight: bold;">
                      💳 Your Account Information
                    </h3>
                    <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                      ${accountInfo}
                    </table>
                    
                    ${has_pending_accounts ? `
                    <!-- Pending Accounts Notice -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #dbeafe; border-left: 5px solid #3b82f6; border-radius: 8px; margin: 35px 0;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 12px 0; color: #1e40af; font-size: 18px; line-height: 1.6; font-weight: bold;">
                            📋 Additional Accounts Pending Approval
                          </p>
                          <p style="margin: 0; color: #1e40af; font-size: 17px; line-height: 1.6;">
                            Your ${pending_account_types.map(t => t.replace(/_/g, ' ').toUpperCase()).join(', ')} account${pending_account_types.length > 1 ? 's are' : ' is'} currently under review. You will receive a notification email once ${pending_account_types.length > 1 ? 'they are' : 'it is'} approved and ready to use.
                          </p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                    
                    <!-- Security Warning -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef3c7; border-left: 5px solid #f59e0b; border-radius: 8px; margin: 35px 0;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0; color: #92400e; font-size: 17px; line-height: 1.6;">
                            <strong>⚠️ Important Security Notice:</strong> Please change your temporary password immediately after your first login for security purposes. You can do this in your account settings.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Next Steps -->
                    <h3 style="margin: 35px 0 20px 0; color: #1f2937; font-size: 24px; font-weight: bold;">
                      📝 Next Steps
                    </h3>
                    <ul style="margin: 0; padding-left: 24px; color: #374151; font-size: 18px; line-height: 2;">
                      <li style="margin-bottom: 10px;">Sign in using the credentials above</li>
                      <li style="margin-bottom: 10px;">Change your temporary password immediately</li>
                      <li style="margin-bottom: 10px;">Set up security questions</li>
                      <li>Explore your dashboard and account features</li>
                    </ul>
                    
                    <p style="margin: 35px 0 24px 0; color: #374151; font-size: 18px; line-height: 1.7;">
                      If you have any questions or need assistance, please don't hesitate to contact us.
                    </p>
                    
                    <p style="margin: 0; color: #374151; font-size: 19px;">
                      Thank you for choosing ${bankInfo.name}!
                    </p>
                    <p style="margin: 8px 0 0 0; color: #374151; font-size: 19px; font-weight: bold;">
                      The ${bankInfo.name} Team
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 40px 30px; text-align: center; border-top: 2px solid #e5e7eb;">
                    <p style="margin: 0 0 12px 0; color: #1f2937; font-size: 20px; font-weight: bold;">
                      ${bankInfo.name}
                    </p>
                    <p style="margin: 0 0 18px 0; color: #6b7280; font-size: 17px;">
                      ${bankInfo.branch_name || ''}
                    </p>
                    ${bankInfo.address ? `
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 16px;">
                      ${bankInfo.address}
                    </p>
                    ` : ''}
                    ${bankInfo.phone ? `
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 16px;">
                      Phone: <a href="tel:${bankInfo.phone}" style="color: #004aad; text-decoration: none; font-weight: 500;">${bankInfo.phone}</a>
                    </p>
                    ` : ''}
                    <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px;">
                      Email: <a href="mailto:${bankInfo.email_welcome || 'welcome@theoaklinebank.com'}" style="color: #004aad; text-decoration: none; font-weight: 500;">${bankInfo.email_welcome || 'welcome@theoaklinebank.com'}</a>
                    </p>
                    <p style="margin: 24px 0 0 0; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 15px;">
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
