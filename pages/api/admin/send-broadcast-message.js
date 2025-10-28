
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

    // Verify admin role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
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
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f0f4f8;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(10, 26, 47, 0.15);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #0a1a2f 0%, #1e3a5f 100%); padding: 30px; text-align: center; border-bottom: 4px solid #d4af37;">
                      ${bankInfo.logo_url ? `
                        <div style="background-color: white; display: inline-block; padding: 10px 20px; border-radius: 8px; margin-bottom: 15px;">
                          <img src="${bankInfo.logo_url}" alt="${bankInfo.name}" style="height: 50px; width: auto; display: block;">
                        </div>
                      ` : ''}
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                        ${bankInfo.name || 'Oakline Bank'}
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 20px 0; color: #0a1a2f; font-size: 22px; font-weight: 700;">
                        ${subject}
                      </h2>
                      
                      <div style="color: #374151; font-size: 16px; line-height: 1.8;">
                        ${message}
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 10px 0; color: #0a1a2f; font-size: 16px; font-weight: 700;">
                        ${bankInfo.name || 'Oakline Bank'}
                      </p>
                      <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
                        ${bankInfo.address || ''}
                      </p>
                      <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
                        Phone: ${bankInfo.phone || ''} | Support: ${bankInfo.email_contact || 'support@theoaklinebank.com'}
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
        from: `"${bankInfo.name || 'Oakline Bank'}" <${bankInfo.email_contact || 'support@theoaklinebank.com'}>`,
        to: recipient.email,
        subject: subject,
        html: emailHtml
      };

      return transporter.sendMail(mailOptions);
    });

    // Wait for all emails to be sent
    await Promise.all(emailPromises);

    // Store notification in database for each recipient
    const notificationInserts = recipients.map(recipient => ({
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
