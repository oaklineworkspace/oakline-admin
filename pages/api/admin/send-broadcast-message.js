
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check SMTP configuration
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
    const { subject, message, recipients, bank_details } = req.body;

    if (!subject || !message || !recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get current admin user
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify admin role - check admin_profiles table
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminProfile) {
      console.error('Admin verification failed:', adminError);
      return res.status(403).json({ error: 'Admin access required' });
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

    // Create email transporter
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
    try {
      await transporter.verify();
    } catch (smtpError) {
      console.error('SMTP connection failed:', smtpError.message);
      return res.status(500).json({
        error: 'Email service connection failed',
        message: smtpError.message
      });
    }

    // Send emails to all recipients
    const emailPromises = recipients.map(async (recipient) => {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Segoe UI Symbol', 'Segoe UI Emoji', 'Apple Color Emoji', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; min-height: 100vh;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <!-- Main Container -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 650px; border-collapse: collapse; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 45px 40px; text-align: center; position: relative;">
                      ${bankInfo.logo_url ? `
                        <div style="background-color: #ffffff; display: inline-block; padding: 15px 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                          <img src="${bankInfo.logo_url}" alt="${bankInfo.name}" style="height: 55px; width: auto; display: block;">
                        </div>
                      ` : `
                        <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">🏦</div>
                      `}
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                        ${bankInfo.name || 'Oakline Bank'}
                      </h1>
                      <div style="margin-top: 12px; padding: 8px 20px; background-color: #ffffff; border-radius: 20px; display: inline-block;">
                        <p style="margin: 0; color: #3b82f6; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                          Important Notification
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Subject Banner -->
                  <tr>
                    <td style="background: linear-gradient(to right, #f8fafc, #e2e8f0); padding: 25px 40px; border-bottom: 3px solid #d4af37;">
                      <h2 style="margin: 0; color: #0a1a2f; font-size: 24px; font-weight: 700; text-align: center; letter-spacing: -0.3px;">
                        📢 ${subject}
                      </h2>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 45px 40px;">
                      <div style="color: #1f2937; font-size: 17px; line-height: 1.8; letter-spacing: 0.2px;">
                        ${message}
                      </div>
                      
                      <!-- Call to Action (if needed) -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 35px;">
                        <tr>
                          <td align="center">
                            <div style="background: linear-gradient(135deg, #0a1a2f 0%, #1e3a5f 100%); padding: 16px 40px; border-radius: 12px; display: inline-block; box-shadow: 0 6px 20px rgba(10, 26, 47, 0.25);">
                              <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">
                                Need assistance? Contact our support team 24/7
                              </p>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Divider -->
                  <tr>
                    <td style="padding: 0 40px;">
                      <div style="height: 2px; background: linear-gradient(to right, transparent, #d4af37, transparent);"></div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background: linear-gradient(to bottom, #f8fafc, #f1f5f9); padding: 40px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                        <tr>
                          <td align="center">
                            <p style="margin: 0 0 15px 0; color: #0a1a2f; font-size: 18px; font-weight: 700;">
                              ${bankInfo.name || 'Oakline Bank'}
                            </p>
                            <p style="margin: 0 0 8px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                              📍 ${bankInfo.address || '12201 N May Avenue, Oklahoma City, OK 73120'}
                            </p>
                            <p style="margin: 0 0 8px 0; color: #475569; font-size: 14px;">
                              📞 ${bankInfo.phone || '+1 (636) 635-6122'}
                            </p>
                            <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px;">
                              ✉️ <a href="mailto:${bankInfo.email_contact || 'support@theoaklinebank.com'}" style="color: #0066cc; text-decoration: none;">${bankInfo.email_contact || 'support@theoaklinebank.com'}</a>
                            </p>
                            
                            <div style="margin: 20px 0; padding-top: 20px; border-top: 2px solid #e2e8f0;">
                              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                                <strong>Member FDIC</strong> | Routing Number: ${bankInfo.routing_number || '075915826'}<br>
                                SWIFT: ${bankInfo.swift_code || 'OAKLUS33'} | NMLS ID: ${bankInfo.nmls_id || '574160'}
                              </p>
                              <p style="margin: 15px 0 0 0; color: #94a3b8; font-size: 11px;">
                                © ${new Date().getFullYear()} ${bankInfo.name || 'Oakline Bank'}. All rights reserved.<br>
                                This is an automated message from a secure system. Please do not reply to this email.
                              </p>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                </table>
                
                <!-- Security Notice -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 650px; margin-top: 20px;">
                  <tr>
                    <td align="center">
                      <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                        🔒 Your security is our priority. ${bankInfo.name || 'Oakline Bank'} will never ask for your password via email.
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
        from: `"${bankInfo.name || 'Oakline Bank'}" <${bankInfo.email_contact || 'support@theoaklinebank.com'}>`,
        to: recipient.email,
        subject: subject,
        html: emailHtml
      };

      return transporter.sendMail(mailOptions);
    });

    // Wait for all emails to be sent
    await Promise.all(emailPromises);

    // Store notification in database for registered users only
    const registeredRecipients = recipients.filter(r => !r.isCustom);
    
    if (registeredRecipients.length > 0) {
      const notificationInserts = registeredRecipients.map(recipient => ({
        user_id: recipient.id,
        type: 'broadcast',
        title: subject,
        message: message,
        read: false
      }));

      const { error: dbError } = await supabaseAdmin
        .from('notifications')
        .insert(notificationInserts);

      if (dbError) {
        console.error('Failed to store notification:', dbError);
        // Don't fail the request if emails were sent successfully
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully sent ${recipients.length} messages`,
      count: recipients.length
    });

  } catch (error) {
    console.error('Error sending broadcast message:', error);
    return res.status(500).json({
      error: 'Failed to send broadcast message',
      details: error.message
    });
  }
}
