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

    console.log('📥 Received request body:', { 
      hasSubject: !!subject, 
      hasMessage: !!message, 
      emailCount: emails?.length 
    });

    if (!subject || !message || !emails || emails.length === 0) {
      console.error('❌ Validation failed:', {
        subject: !!subject,
        message: !!message,
        emails: !!emails,
        emailCount: emails?.length || 0
      });
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
    const { data: bankDetails, error: bankError } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    if (bankError) {
      console.error('⚠️ Could not fetch bank details:', bankError);
    }

    console.log('==========================================');
    console.log(`📧 STARTING BROADCAST TO ${emails.length} RECIPIENTS`);
    console.log('==========================================');
    console.log('Subject:', subject);
    console.log('Recipients:', emails);
    console.log('==========================================');

    // Send emails
    const results = [];
    for (const email of emails) {
      console.log(`\n📤 Attempting to send to: ${email}`);
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
                ${bankDetails?.logo_url ? `
                  <div style="background-color: #ffffff; display: inline-block; padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                    <img src="${bankDetails.logo_url}" alt="${bankDetails.name}" style="height: 50px; width: auto;">
                  </div>
                ` : ''}
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                  ${bankDetails?.name || 'Oakline Bank'}
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
                  © ${new Date().getFullYear()} ${bankDetails?.name || 'Oakline Bank'}. All rights reserved.
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
          from: `"${bankDetails?.name || 'Oakline Bank'}" <${bankDetails?.email_notify || 'notify@theoaklinebank.com'}>`,
          type: EMAIL_TYPES.NOTIFY
        });

        console.log(`✅ Successfully sent to ${email}`);
        results.push({ email, success: true });
      } catch (error) {
        console.error(`❌ Failed to send to ${email}`);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        results.push({ email, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    console.log('==========================================');
    console.log(`✅ BROADCAST COMPLETE`);
    console.log(`Successful: ${successCount}/${emails.length}`);
    console.log(`Failed: ${failedCount}/${emails.length}`);
    console.log('==========================================');

    // Return appropriate status based on results
    if (successCount === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send any messages',
        message: `0 out of ${emails.length} messages sent`,
        results
      });
    } else if (successCount < emails.length) {
      return res.status(207).json({
        success: true,
        partial: true,
        message: `Partial success: ${successCount} out of ${emails.length} messages sent`,
        results
      });
    } else {
      return res.status(200).json({
        success: true,
        message: `Successfully sent ${successCount} out of ${emails.length} messages`,
        results
      });
    }

  } catch (error) {
    console.error('❌ Error sending broadcast:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Failed to send broadcast message',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}