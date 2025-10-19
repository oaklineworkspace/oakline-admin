
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, sendEmail } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Find the user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to find user' });
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: password }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    // Update profile to mark password as set
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        password_set: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Don't fail the request for this
    }

    // Send email if requested
    if (sendEmail) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const userName = user.user_metadata?.first_name 
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
          : 'User';

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Oakline Bank Login Credentials</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🔐 Your Login Credentials</h1>
                <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
              </div>
              
              <div style="padding: 40px 32px;">
                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  Hello ${userName},
                </p>
                
                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  Your account password has been set. You can now log in to your Oakline Bank account using the following credentials:
                </p>

                <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0;">
                  <p style="margin: 0 0 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">Email:</p>
                  <p style="margin: 0 0 20px 0; color: #1e293b; font-size: 16px; font-family: monospace;">${email}</p>
                  
                  <p style="margin: 0 0 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">Password:</p>
                  <p style="margin: 0; color: #1e293b; font-size: 16px; font-family: monospace;">${password}</p>
                </div>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://theoaklinebank.com'}/login" 
                     style="display: inline-block; padding: 14px 32px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Log In Now
                  </a>
                </div>

                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
                  <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                    <strong>⚠️ Important Security Note:</strong> We recommend changing this password after your first login for security purposes.
                  </p>
                </div>

                <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                  If you did not request this password or have any questions, please contact our support team immediately.
                </p>

                <p style="color: #4a5568; font-size: 16px; margin: 32px 0 0 0;">
                  <strong>The Oakline Bank Team</strong>
                </p>
              </div>
              
              <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #64748b; font-size: 12px;">
                  © 2024 Oakline Bank. All rights reserved.
                </p>
                <p style="margin: 8px 0 0 0; color: #64748b; font-size: 12px;">
                  This email was sent to ${email}
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        const mailOptions = {
          from: `"Oakline Bank" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Your Oakline Bank Login Credentials',
          html: emailHtml
        };

        await transporter.sendMail(mailOptions);
        console.log(`Password email sent to ${email}`);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.status(200).json({
      message: sendEmail ? 'Password assigned and sent successfully' : 'Password assigned successfully',
      email: email
    });

  } catch (error) {
    console.error('Error assigning password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
