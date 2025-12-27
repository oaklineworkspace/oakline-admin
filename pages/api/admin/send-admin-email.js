import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: adminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { subject, message, emails } = req.body;

    if (!subject || !message || !emails || emails.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    const bankName = bankDetails?.name || 'Oakline Bank';
    const bankAddress = bankDetails?.address || '12201 N May Avenue, Oklahoma City, OK 73120, United States';
    const bankPhone = bankDetails?.phone || '+1 (636) 635-6122';
    const bankEmail = bankDetails?.email_contact || 'contact-us@theoaklinebank.com';
    const bankWebsite = bankDetails?.website || 'www.theoaklinebank.com';

    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f7fa;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #f5f7fa;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                    
                    <!-- Header with Logo -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center;">
                        ${bankDetails?.logo_url ? `
                          <div style="display: inline-block; background-color: #ffffff; padding: 15px 20px; border-radius: 12px; margin-bottom: 16px;">
                            <img src="${bankDetails.logo_url}" alt="${bankName}" style="height: 50px; width: auto; display: block;">
                          </div>
                        ` : `
                          <div style="font-size: 48px; margin-bottom: 12px;">🏦</div>
                        `}
                        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">
                          ${bankName}
                        </h1>
                      </td>
                    </tr>

                    <!-- Subject Banner -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 20px 30px;">
                        <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; text-align: center;">
                          ${subject}
                        </h2>
                      </td>
                    </tr>

                    <!-- Message Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <div style="color: #374151; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">
                          ${message}
                        </div>
                      </td>
                    </tr>

                    <!-- Contact Information -->
                    <tr>
                      <td style="padding: 0 30px 30px 30px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #f8fafc; border-radius: 12px; padding: 20px;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">
                                Need assistance? Contact us:
                              </p>
                              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                  <td style="padding: 6px 0; color: #475569; font-size: 13px;">
                                    📍 ${bankAddress}
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 6px 0; color: #475569; font-size: 13px;">
                                    📞 ${bankPhone}
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 6px 0; color: #475569; font-size: 13px;">
                                    ✉️ <a href="mailto:${bankEmail}" style="color: #2563eb; text-decoration: none;">${bankEmail}</a>
                                  </td>
                                </tr>
                                ${bankWebsite ? `
                                <tr>
                                  <td style="padding: 6px 0; color: #475569; font-size: 13px;">
                                    🌐 <a href="https://${bankWebsite}" style="color: #2563eb; text-decoration: none;">${bankWebsite}</a>
                                  </td>
                                </tr>
                                ` : ''}
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #1e293b; padding: 24px 30px; text-align: center;">
                        <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px;">
                          © ${new Date().getFullYear()} ${bankName}. All rights reserved.
                        </p>
                        <p style="margin: 0; color: #64748b; font-size: 11px;">
                          This email was sent by ${bankName}. Please do not reply directly to this email.
                        </p>
                        ${bankDetails?.routing_number ? `
                          <p style="margin: 8px 0 0 0; color: #64748b; font-size: 11px;">
                            Routing Number: ${bankDetails.routing_number} | Member FDIC
                          </p>
                        ` : ''}
                      </td>
                    </tr>

                  </table>

                  <!-- Security Notice -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; margin-top: 16px;">
                    <tr>
                      <td align="center">
                        <p style="margin: 0; color: #64748b; font-size: 11px;">
                          🔒 ${bankName} will never ask for your password or PIN via email.
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

        await sendEmail({
          to: email,
          subject: subject,
          html: emailHtml,
          from: `"${bankName}" <${bankDetails?.email_notify || 'notify@theoaklinebank.com'}>`,
          type: EMAIL_TYPES.NOTIFY
        });

        sent++;
        console.log(`✅ Email sent to ${email}`);
      } catch (err) {
        failed++;
        console.error(`❌ Failed to send to ${email}:`, err.message);
      }
    }

    console.log(`📧 Email send complete: ${sent} sent, ${failed} failed`);

    return res.status(200).json({
      success: true,
      sent,
      failed,
      total: emails.length
    });

  } catch (error) {
    console.error('❌ Error in send-admin-email:', error);
    return res.status(500).json({
      error: 'Failed to send emails',
      details: error.message
    });
  }
}
