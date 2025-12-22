import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('📧 Broadcast message request received');
  console.log('📧 Headers:', Object.keys(req.headers));

  // Check if at least one email provider is configured
  const hasProvider = process.env.SMTP_HOST || process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY || process.env.BREVO_API_KEY;

  if (!hasProvider) {
    console.error('❌ No email provider configured');
    return res.status(500).json({
      error: 'Email service not configured',
      message: 'Please configure at least one email provider in Secrets'
    });
  }

  try {
    const { subject, message, recipients, bank_details } = req.body;

    console.log('📝 Request details:', {
      subject: subject?.substring(0, 50),
      messageLength: message?.length,
      recipientCount: recipients?.length,
      hasRecipients: !!recipients,
      recipientsIsArray: Array.isArray(recipients)
    });

    if (!subject || !message || !recipients || recipients.length === 0) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          subject: !!subject,
          message: !!message,
          recipients: !!recipients,
          recipientCount: recipients?.length || 0
        }
      });
      });
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

    console.log('📤 Starting to send emails...');

    // Send emails to all recipients with multi-provider fallback
    const emailPromises = recipients.map(async (recipient, index) => {
      console.log(`📧 Sending to ${index + 1}/${recipients.length}: ${recipient.email}`);

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
                    <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 25px 40px; border-bottom: 3px solid #d4af37;">
                      <h2 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center; letter-spacing: -0.3px;">
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
                            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 18px 40px; border-radius: 12px; display: inline-block; box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3); border: 2px solid #60a5fa;">
                              <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
                                💬 Need assistance? Contact our support team 24/7
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
                            <p style="margin: 0 0 8px 0; color: #475569; font-size: 14px;">
                              📞 ${bankInfo.phone || '+1 (636) 635-6122'}
                            </p>
                            <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px;">
                              ✉️ <a href="mailto:${bankInfo.email_contact || 'contact-us@theoaklinebank.com'}" style="color: #0066cc; text-decoration: none;">${bankInfo.email_contact || 'contact-us@theoaklinebank.com'}</a>
                            </p>

                            <div style="padding-top: 20px; border-top: 2px solid #e2e8f0;">
                              <p style="margin: 0; color: #94a3b8; font-size: 11px; line-height: 1.6;">
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

      return sendEmail({
        to: recipient.email,
        subject: subject,
        html: emailHtml,
        from: `"${bankInfo.name || 'Oakline Bank'}" <${bankInfo.email_contact || 'support@theoaklinebank.com'}>`,
        type: EMAIL_TYPES.NOTIFY
      });
    });

    // Wait for all emails to be sent
    console.log('⏳ Waiting for all emails to send...');
    let emailResults;
    try {
      emailResults = await Promise.all(emailPromises);
      console.log('✅ All emails sent successfully:', emailResults.length);
      console.log('📧 Email results:', JSON.stringify(emailResults, null, 2));
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      console.error('❌ Error stack:', emailError.stack);
      return res.status(500).json({
        error: 'Failed to send emails',
        details: emailError.message
      });
    }

    // Store notification in database for registered users only
    // Registered users are those without isCustom flag OR where isCustom is explicitly false
    const registeredRecipients = recipients.filter(r => {
      // Check if it's a custom email (starts with 'custom_')
      const isCustomId = typeof r.id === 'string' && r.id.startsWith('custom_');
      // Check the isCustom flag
      const hasCustomFlag = r.isCustom === true;
      // Only include if it's NOT a custom recipient
      return !isCustomId && !hasCustomFlag;
    });
    
    console.log(`💾 Storing notifications for ${registeredRecipients.length} registered users out of ${recipients.length} total recipients`);
    console.log('Registered recipients:', registeredRecipients.map(r => ({ id: r.id, email: r.email, isCustom: r.isCustom })));

    if (registeredRecipients.length > 0) {
      // Insert notifications one by one to better handle errors
      let successCount = 0;
      let failCount = 0;

      for (const recipient of registeredRecipients) {
        console.log(`💾 Attempting to store notification for user ${recipient.id} (${recipient.email})`);

        const { error: dbError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: recipient.id,
            type: 'broadcast',
            title: subject,
            message: message,
            read: false
          });

        if (dbError) {
          console.error(`❌ Failed to store notification for user ${recipient.id} (${recipient.email}):`, dbError);
          failCount++;
        } else {
          console.log(`✅ Notification stored for user ${recipient.id} (${recipient.email})`);
          successCount++;
        }
      }

      console.log(`📊 Notification storage complete: ${successCount} success, ${failCount} failed out of ${registeredRecipients.length} total`);
    } else {
      console.log('⚠️ No registered users to store notifications for');
    }

    console.log('✅ Broadcast complete');
    return res.status(200).json({
      success: true,
      message: `Successfully sent ${recipients.length} messages`,
      count: recipients.length
    });

  } catch (error) {
    console.error('❌ Error sending broadcast message:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Failed to send broadcast message',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}