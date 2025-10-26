
import nodemailer from 'nodemailer';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

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
      last_name,
      account_type,
      account_number,
      routing_number,
      site_url,
      bank_details
    } = req.body;

    if (!email || !first_name || !last_name || !account_type || !account_number) {
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
    const loginUrl = `${detectedSiteUrl}/login`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const accountTypeFormatted = account_type.replace('_', ' ').toUpperCase();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Approved - ${bankInfo.name}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #ffffff;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff;">
                
                <!-- Header -->
                <tr>
                  <td style="background-color: #10b981; padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">✅ Account Approved!</h1>
                    <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.95;">${bankInfo.name}</p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: bold;">
                      Great News, ${first_name}!
                    </h2>
                    
                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                      Your ${accountTypeFormatted} account has been approved and is now active! You can start using it right away.
                    </p>
                    
                    <!-- Account Details Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0fdf4; border-radius: 8px; margin: 30px 0;">
                      <tr>
                        <td style="padding: 25px;">
                          <h3 style="margin: 0 0 15px 0; color: #10b981; font-size: 18px; font-weight: bold;">
                            Your New Account Details
                          </h3>
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 8px 0; color: #374151; font-size: 15px;">
                                <strong>Account Type:</strong>
                              </td>
                              <td style="padding: 8px 0; color: #1f2937; font-size: 15px;">
                                ${accountTypeFormatted}
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #374151; font-size: 15px;">
                                <strong>Account Number:</strong>
                              </td>
                              <td style="padding: 8px 0;">
                                <code style="background-color: #e5e7eb; padding: 6px 12px; border-radius: 4px; font-family: 'Courier New', monospace; color: #1f2937; font-size: 15px; font-weight: bold;">****${account_number.slice(-4)}</code>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #374151; font-size: 15px;">
                                <strong>Routing Number:</strong>
                              </td>
                              <td style="padding: 8px 0;">
                                <code style="background-color: #e5e7eb; padding: 6px 12px; border-radius: 4px; font-family: 'Courier New', monospace; color: #1f2937; font-size: 15px; font-weight: bold;">${routing_number}</code>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #374151; font-size: 15px;">
                                <strong>Status:</strong>
                              </td>
                              <td style="padding: 8px 0;">
                                <span style="background-color: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 4px; font-size: 13px; font-weight: bold;">ACTIVE</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Access Account Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Access Your Account</a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- What You Can Do -->
                    <h3 style="margin: 30px 0 15px 0; color: #1f2937; font-size: 18px; font-weight: bold;">
                      What You Can Do Now
                    </h3>
                    <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 15px; line-height: 1.8;">
                      <li>View your account balance and transaction history</li>
                      <li>Transfer funds between your accounts</li>
                      <li>Set up direct deposits and automatic payments</li>
                      <li>Manage your account preferences and settings</li>
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
                      Phone: <a href="tel:${bankInfo.phone}" style="color: #10b981; text-decoration: none;">${bankInfo.phone}</a>
                    </p>
                    <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px;">
                      Support: <a href="mailto:${bankInfo.email_contact || 'contact-us@theoaklinebank.com'}" style="color: #10b981; text-decoration: none;">${bankInfo.email_contact || 'contact-us@theoaklinebank.com'}</a>
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
      subject: `✅ Your ${accountTypeFormatted} Account Has Been Approved!`,
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Account approval email sent successfully:', info.messageId);

    return res.status(200).json({ 
      success: true, 
      message: 'Account approval email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending account approval email:', error);
    return res.status(500).json({ 
      error: 'Failed to send account approval email',
      details: error.message 
    });
  }
}
