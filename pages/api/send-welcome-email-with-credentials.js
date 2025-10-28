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

  console.log('🔍 Checking SMTP configuration...');
  console.log('SMTP_HOST:', process.env.SMTP_HOST ? '✅ Set' : '❌ Missing');
  console.log('SMTP_PORT:', process.env.SMTP_PORT ? '✅ Set' : '❌ Missing');
  console.log('SMTP_USER:', process.env.SMTP_USER ? '✅ Set' : '❌ Missing');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set' : '❌ Missing');

  if (missingVars.length > 0) {
    console.error('❌ Missing SMTP environment variables:', missingVars);
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
      temp_password, // Renamed for consistency with new email template
      account_numbers,
      account_types,
      has_pending_accounts,
      pending_account_types,
      application_id,
      country,
      site_url,
      bank_details // Assuming this contains all bank info
    } = req.body;

    // Basic validation
    if (!email || !first_name || !last_name || !temp_password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch bank details if not provided (assuming it's needed for email)
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
    const siteUrl = detectedSiteUrl; // Use detectedSiteUrl for email template

    // Format account info for the new email template
    const populatedAccountNumbers = account_numbers || [];
    const accountDetailsHtml = populatedAccountNumbers.length > 0
      ? `
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr>
            <th style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; padding: 15px 20px; text-align: left; font-size: 15px; font-weight: 700;">Account Type</th>
            <th style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; padding: 15px 20px; text-align: right; font-size: 15px; font-weight: 700;">Account Number</th>
          </tr>
        </thead>
        <tbody>
          ${populatedAccountNumbers.map((num, idx) => {
              const type = account_types && account_types[idx]
                ? account_types[idx].replace(/_/g, ' ').toUpperCase()
                : 'ACCOUNT';
              return `
                <tr>
                  <td style="padding: 15px 20px; color: #334155; font-size: 15px; font-weight: 600;">${type}</td>
                  <td style="padding: 15px 20px; font-family: 'Courier New', monospace; color: #4b5563; font-size: 15px; font-weight: 700; text-align: right;">****${num.slice(-4)}</td>
                </tr>
              `;
            }).join('')}
        </tbody>
      </table>
      ` : '<p style="margin: 20px 0; color: #6b7280; font-size: 15px;">Your account has been created.</p>';

    // Prepare pending accounts for the new email template
    const pendingAccounts = pending_account_types || [];

    // Create email HTML using the updated structure and styles
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${bankInfo.name || 'Oakline Bank'}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0f4f8;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(30, 64, 175, 0.15);">

                <!-- Professional Header with Logo -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 0; text-align: center;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 30px 20px 20px 20px; text-align: center;">
                          <div style="background-color: white; display: inline-block; padding: 15px 25px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #1e40af; letter-spacing: -0.5px;">
                              🏦 ${bankInfo.name || 'OAKLINE BANK'}
                            </h1>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px 20px 30px 20px; text-align: center;">
                          <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Welcome to Your Financial Future</h2>
                          <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">Your Account is Ready!</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content Body -->
                <tr>
                  <td style="padding: 40px 30px; background-color: #ffffff;">
                    <h3 style="margin: 0 0 20px 0; color: #1e40af; font-size: 22px; font-weight: 700;">
                      Hello ${first_name} ${last_name},
                    </h3>

                    <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
                      Congratulations! Your application has been <strong style="color: #1e40af;">approved</strong> and your account${populatedAccountNumbers.length > 1 ? 's are' : ' is'} ready for activation.
                    </p>

                    ${accountDetailsHtml}

                    ${has_pending_accounts && pendingAccounts.length > 0 ? `
                    <!-- Pending Accounts Notice -->
                    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 8px;">
                      <h4 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px; font-weight: 700;">
                        📋 Additional Accounts Pending Approval
                      </h4>
                      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">
                        Your <strong>${pendingAccounts.join(', ').replace(/_/g, ' ').toUpperCase()}</strong> ${pendingAccounts.length > 1 ? 'accounts are' : 'account is'} currently under review. You will receive a notification email once ${pendingAccounts.length > 1 ? 'they are' : 'it is'} approved and ready to use.
                      </p>
                    </div>
                    ` : ''}

                    <!-- Login Credentials Box -->
                    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px; padding: 30px; margin: 30px 0; box-shadow: 0 8px 24px rgba(30, 64, 175, 0.4); border: 3px solid #ffffff;">
                      <h4 style="margin: 0 0 20px 0; color: #ffffff; font-size: 22px; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
                        🔐 YOUR LOGIN CREDENTIALS
                      </h4>
                      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: rgba(255,255,255,0.15); border-radius: 8px; padding: 15px;">
                        <tr>
                          <td style="padding: 12px; color: #ffffff; font-size: 15px; font-weight: 700;">Email:</td>
                          <td style="padding: 12px; text-align: right;">
                            <code style="background-color: #ffffff; color: #1e40af; padding: 8px 16px; border-radius: 6px; font-size: 15px; font-family: 'Courier New', monospace; font-weight: 700;">${email}</code>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="height: 10px;"></td>
                        </tr>
                        <tr>
                          <td style="padding: 12px; color: #ffffff; font-size: 15px; font-weight: 700;">Temporary Password:</td>
                          <td style="padding: 12px; text-align: right;">
                            <code style="background-color: #ffffff; color: #1e40af; padding: 10px 18px; border-radius: 6px; font-size: 16px; font-weight: 900; font-family: 'Courier New', monospace; letter-spacing: 2px; border: 2px solid #fbbf24;">${temp_password}</code>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Security Warning -->
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 25px 0; border-radius: 8px;">
                      <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">
                        ⚠️ <strong>Important Security Notice:</strong> Please change your password immediately after your first login.
                      </p>
                    </div>

                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 6px 20px rgba(30, 64, 175, 0.3);">
                            Login to Your Account
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- What's Next Section -->
                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin: 30px 0;">
                      <h4 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px; font-weight: 700;">
                        🚀 What's Next?
                      </h4>
                      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 15px; line-height: 1.8;">
                        <li>Login with your credentials above</li>
                        <li>Set up a secure password</li>
                        <li>Explore your account dashboard</li>
                        <li>Set up direct deposits and bill payments</li>
                        <li>Download our mobile app for banking on the go</li>
                      </ul>
                    </div>

                    <p style="margin: 30px 0 10px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                      If you have any questions, our support team is here to help 24/7.
                    </p>
                    <p style="margin: 0; color: #1e40af; font-size: 16px; font-weight: 700;">
                      Welcome aboard!<br>
                      The ${bankInfo.name || 'Oakline Bank'} Team
                    </p>
                  </td>
                </tr>

                <!-- Professional Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px; font-weight: 700;">
                      ${bankInfo.name || 'Oakline Bank'}
                    </p>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
                      ${bankInfo.address || ''}
                    </p>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
                      Phone: ${bankInfo.phone || ''} | Email: ${bankInfo.email_contact || 'contact-us@theoaklinebank.com'}
                    </p>
                    <p style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
                      © ${new Date().getFullYear()} ${bankInfo.name || 'Oakline Bank'}. All rights reserved.<br>
                      Member FDIC | Routing: ${bankInfo.routing_number || '075915826'}
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
      from: `"${bankInfo.name || 'Oakline Bank'}" <${bankInfo.email_welcome || 'welcome@theoaklinebank.com'}>`,
      to: email,
      subject: `Welcome to ${bankInfo.name || 'Oakline Bank'} — Your Account Has Been Approved`,
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', info.messageId);

    // Note: Debit card generation and specific user notification logic beyond this email
    // are not included as there were no corresponding code changes provided in the snippet.
    // This would typically involve additional API calls or service integrations.

    return res.status(200).json({
      success: true,
      message: 'Welcome email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error processing account approval:', error);
    return res.status(500).json({
      error: 'Failed to process account approval',
      details: error.message
    });
  }
}