import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header');
      return res.status(401).json({ error: 'Unauthorized - Invalid authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      console.error('❌ Empty token');
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError) {
      console.error('❌ Auth error:', userError);
      return res.status(401).json({ error: 'Unauthorized - Invalid token', details: userError.message });
    }

    if (!user) {
      console.error('❌ No user found');
      return res.status(401).json({ error: 'Unauthorized - User not found' });
    }

    console.log('✅ User authenticated:', user.email);

    // Verify admin role
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('admin_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminProfile) {
      console.error('❌ Not an admin:', adminError);
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('✅ Admin verified:', adminProfile.role);

    const { subject, message, emails } = req.body;

    if (!subject || !message || !emails || emails.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          subject: !!subject,
          message: !!message,
          emails: !!emails,
          emailCount: emails?.length || 0
        }
      });
    }

    // Get bank details
    const { data: bankInfo } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    console.log(`📧 Sending broadcast to ${emails.length} recipients...`);

    // Send emails
    const results = [];
    for (const email of emails) {
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px; text-align: center;">
                ${bankInfo?.logo_url ? `
                  <div style="background-color: #ffffff; display: inline-block; padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                    <img src="${bankInfo.logo_url}" alt="${bankInfo.name}" style="height: 50px; width: auto;">
                  </div>
                ` : ''}
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                  ${bankInfo?.name || 'Oakline Bank'}
                </h1>
              </div>

              <div style="background: #1e40af; padding: 20px;">
                <h2 style="margin: 0; color: #ffffff; font-size: 22px; text-align: center;">
                  ${subject}
                </h2>
              </div>

              <div style="padding: 40px;">
                <div style="color: #1f2937; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">
                  ${message}
                </div>
              </div>

              <div style="background: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #718096; font-size: 12px;">
                  © ${new Date().getFullYear()} ${bankInfo?.name || 'Oakline Bank'}. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail({
          to: email,
          subject: subject,
          html: emailHtml,
          from: `"${bankInfo?.name || 'Oakline Bank'}" <${bankInfo?.email_contact || 'info@theoaklinebank.com'}>`,
          type: EMAIL_TYPES.NOTIFY
        });

        console.log(`✅ Sent to ${email}`);
        results.push({ email, success: true });
      } catch (error) {
        console.error(`❌ Failed to send to ${email}:`, error.message);
        results.push({ email, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Broadcast complete: ${successCount}/${emails.length} sent`);

    return res.status(200).json({
      success: true,
      message: `Successfully sent ${successCount} out of ${emails.length} messages`,
      results
    });

  } catch (error) {
    console.error('❌ Error sending broadcast:', error);
    return res.status(500).json({
      error: 'Failed to send broadcast message',
      details: error.message
    });
  }
}