
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (userError || !user) {
      // Don't reveal if user exists for security
      return res.status(200).json({ message: 'If an account exists with this email, a verification code has been sent.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database with 15-minute expiration
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: otpError } = await supabaseAdmin
      .from('password_reset_otps')
      .upsert({
        email: email.toLowerCase(),
        otp,
        expires_at: expiresAt,
        used: false,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      });

    if (otpError) {
      console.error('Error storing OTP:', otpError);
      return res.status(500).json({ error: 'Failed to generate verification code' });
    }

    // Send OTP via email
    await sendEmail({
      to: email,
      subject: '🔒 Password Reset Verification Code - Oakline Bank',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🔒 Password Reset</h1>
              <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank Security</p>
            </div>
            
            <div style="padding: 40px 32px;">
              <h2 style="color: #1e40af; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                Your Verification Code
              </h2>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                You requested to reset your password. Use the verification code below to continue:
              </p>
              
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">Verification Code</p>
                <p style="color: #1e40af; font-size: 48px; font-weight: 700; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
                  ${otp}
                </p>
                <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">Valid for 15 minutes</p>
              </div>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
                <p style="color: #991b1b; font-size: 14px; font-weight: 500; margin: 0;">
                  🔒 <strong>Security Alert:</strong> If you didn't request this code, please ignore this email and contact our security team immediately.
                </p>
              </div>
              
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 14px; margin: 0;">
                  <strong>Security Tips:</strong>
                </p>
                <ul style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 8px 0;">
                  <li>Never share this code with anyone</li>
                  <li>Oakline Bank will never ask for your code via phone or email</li>
                  <li>This code expires in 15 minutes</li>
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

    return res.status(200).json({ 
      message: 'Verification code sent successfully',
      expiresIn: '15 minutes'
    });

  } catch (error) {
    console.error('Error in send-reset-otp:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
