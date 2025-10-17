
import { sendEmail } from '../../lib/email';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get user profile for personalization
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('email', email.toLowerCase())
      .single();

    const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Valued Customer';

    await sendEmail({
      to: email,
      subject: '✅ Password Successfully Changed - Oakline Bank',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">✅ Password Changed</h1>
              <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Security Confirmation</p>
            </div>
            
            <div style="padding: 40px 32px;">
              <h2 style="color: #16a34a; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                Password Successfully Updated
              </h2>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Dear ${userName},
              </p>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Your Oakline Bank account password was successfully changed on ${new Date().toLocaleString('en-US', { 
                  dateStyle: 'full', 
                  timeStyle: 'short' 
                })}.
              </p>
              
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <p style="color: #16a34a; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">✓ Security Update Complete</p>
                <ul style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                  <li>Your password has been updated</li>
                  <li>All existing sessions remain active</li>
                  <li>Your account security is maintained</li>
                </ul>
              </div>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
                <p style="color: #991b1b; font-size: 14px; font-weight: 500; margin: 0 0 8px 0;">
                  ⚠️ <strong>Didn't make this change?</strong>
                </p>
                <p style="color: #991b1b; font-size: 14px; margin: 0;">
                  If you did not authorize this password change, please contact our security team immediately at:
                </p>
                <p style="color: #991b1b; font-size: 14px; font-weight: 600; margin: 8px 0 0 0;">
                  📞 1-800-OAKLINE or 📧 security@theoaklinebank.com
                </p>
              </div>
              
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">
                  <strong>Security Best Practices:</strong>
                </p>
                <ul style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
                  <li>Use a unique password for your bank account</li>
                  <li>Enable two-factor authentication</li>
                  <li>Never share your password with anyone</li>
                  <li>Change your password regularly</li>
                </ul>
              </div>
            </div>
            
            <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br/>
                Member FDIC | Routing: 075915826
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    return res.status(200).json({ message: 'Notification sent successfully' });

  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
