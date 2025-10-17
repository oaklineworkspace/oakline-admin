
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Get OTP from database
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('otp', otp)
      .single();

    if (otpError || !otpRecord) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Check if OTP is already used
    if (otpRecord.used) {
      return res.status(400).json({ error: 'This verification code has already been used' });
    }

    // Check if OTP is expired
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);

    if (now > expiresAt) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Mark OTP as used
    const { error: updateError } = await supabaseAdmin
      .from('password_reset_otps')
      .update({ used: true })
      .eq('email', email.toLowerCase())
      .eq('otp', otp);

    if (updateError) {
      console.error('Error updating OTP:', updateError);
      return res.status(500).json({ error: 'Failed to verify code' });
    }

    // Send Supabase password reset link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theoaklinebank.com';
    const { data: linkData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${siteUrl}/reset-password`
      }
    });

    if (resetError) {
      console.error('Error generating reset link:', resetError);
      return res.status(500).json({ error: 'Failed to send reset link' });
    }

    // Send the reset link via email
    const { sendPasswordResetLink } = require('../../lib/email');
    await sendPasswordResetLink(email.toLowerCase(), linkData.properties.action_link);

    return res.status(200).json({ 
      message: 'Verification successful',
      verified: true
    });

  } catch (error) {
    console.error('Error in verify-reset-otp:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
