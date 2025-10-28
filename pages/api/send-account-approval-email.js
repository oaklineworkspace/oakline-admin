
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
      card_issued,
      card_last_four,
      card_brand,
      card_category,
      card_expiry,
      card_creation_failed,
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
                              🏦 ${bankInfo.name}
                            </h1>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px 20px 30px 20px; text-align: center;">
                          <h2 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">✅ Account Approved!</h2>
                          <p style="margin: 10px 0 0 0; color: #dbeafe; font-size: 16px;">Your Account is Now Active</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px 30px; background-color: #ffffff;">
                    <h3 style="margin: 0 0 20px 0; color: #10b981; font-size: 24px; font-weight: 700;">
                      Great News, ${first_name}!
                    </h3>
                    
                    <p style="margin: 0 0 25px 0; color: #334155; font-size: 16px; line-height: 1.6;">
                      Your <strong style="color: #10b981;">${accountTypeFormatted}</strong> account has been approved and is now <strong>active</strong>! You can start using it right away.
                    </p>
                    
                    <!-- Account Details Box -->
                    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px; padding: 25px; margin: 30px 0; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.2);">
                      <h4 style="margin: 0 0 15px 0; color: #ffffff; font-size: 18px; font-weight: 700;">
                        💳 Your Account Details
                      </h4>
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #dbeafe; font-size: 14px; font-weight: 600;">Account Type:</td>
                          <td style="padding: 8px 0; text-align: right; color: #ffffff; font-size: 15px; font-weight: 700;">
                            ${accountTypeFormatted}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #dbeafe; font-size: 14px; font-weight: 600;">Account Number:</td>
                          <td style="padding: 8px 0; text-align: right;">
                            <code style="background-color: rgba(255,255,255,0.2); color: #ffffff; padding: 6px 12px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 14px; font-weight: 700;">****${account_number.slice(-4)}</code>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #dbeafe; font-size: 14px; font-weight: 600;">Routing Number:</td>
                          <td style="padding: 8px 0; text-align: right;">
                            <code style="background-color: rgba(255,255,255,0.2); color: #ffffff; padding: 6px 12px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 14px; font-weight: 700;">${routing_number}</code>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #dbeafe; font-size: 14px; font-weight: 600;">Status:</td>
                          <td style="padding: 8px 0; text-align: right;">
                            <span style="background-color: #ffffff; color: #10b981; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; display: inline-block;">✅ ACTIVE</span>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Debit Card Notification -->
                    ${card_issued && !card_creation_failed ? `
                    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 8px;">
                      <h4 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px; font-weight: 700;">
                        💳 Debit Card Issued
                      </h4>
                      <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                        A <strong>${card_brand?.toUpperCase() || 'Visa'} ${card_category?.toUpperCase() || 'Debit'}</strong> card has been automatically issued for this account.
                      </p>
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <tr>
                          <td style="padding: 5px 0; color: #64748b; font-size: 13px;">Card Number:</td>
                          <td style="padding: 5px 0; text-align: right;">
                            <code style="background-color: rgba(30, 64, 175, 0.1); color: #1e40af; padding: 4px 8px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 13px;">**** **** **** ${card_last_four || '****'}</code>
                          </td>
                        </tr>
                        ${card_expiry ? `
                        <tr>
                          <td style="padding: 5px 0; color: #64748b; font-size: 13px;">Expires:</td>
                          <td style="padding: 5px 0; text-align: right;">
                            <code style="background-color: rgba(30, 64, 175, 0.1); color: #1e40af; padding: 4px 8px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 13px;">${card_expiry}</code>
                          </td>
                        </tr>
                        ` : ''}
                      </table>
                      <p style="margin: 10px 0 0 0; color: #64748b; font-size: 12px; font-style: italic;">
                        You can view full card details and manage your card through your online banking dashboard.
                      </p>
                    </div>
                    ` : card_creation_failed ? `
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 8px;">
                      <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px; font-weight: 700;">
                        ⚠️ Card Issuance Pending
                      </h4>
                      <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                        Your account is active, but there was a temporary issue issuing your debit card. Our team has been notified and will issue your card shortly. You'll receive another email once your card is ready.
                      </p>
                    </div>
                    ` : ''}
                    
                    <!-- Access Account Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" style="display: inline-block; background-color: #1e40af; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Access Your Account</a>
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
                  <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px; font-weight: 700;">
                      ${bankInfo.name}
                    </p>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
                      ${bankInfo.address || ''}
                    </p>
                    <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
                      Phone: <a href="tel:${bankInfo.phone}" style="color: #10b981; text-decoration: none; font-weight: 600;">${bankInfo.phone}</a>
                    </p>
                    <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px;">
                      Support: <a href="mailto:${bankInfo.email_contact || 'contact-us@theoaklinebank.com'}" style="color: #10b981; text-decoration: none; font-weight: 600;">${bankInfo.email_contact || 'contact-us@theoaklinebank.com'}</a>
                    </p>
                    <p style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
                      © ${new Date().getFullYear()} ${bankInfo.name}. All rights reserved.<br>
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
      from: `"${bankInfo.name}" <${bankInfo.email_notify || 'notify@theoaklinebank.com'}>`,
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
