import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Generate a 10-character temp password meeting rules
function generateTempPassword() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const specials = ['#', '$'];

  const first = upper[Math.floor(Math.random() * upper.length)];

  const pick = (str, n) => {
    let out = '';
    for (let i = 0; i < n; i++) {
      out += str[Math.floor(Math.random() * str.length)];
    }
    return out;
  };

  const lowerPart = pick(lower, 3);
  const digitPart = pick(digits, 3);
  const specialPart = specials[Math.floor(Math.random() * specials.length)];
  const remaining = pick(lower + digits, 2);

  const arr = (lowerPart + digitPart + specialPart + remaining).split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const rest = arr.join('');
  return first + rest;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, applicationId } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
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
      return res.status(404).json({ error: 'User not found with this email' });
    }

    const completedAt = new Date().toISOString();

    // Generate new temporary password
    const tempPassword = generateTempPassword();

    // Update the user's password
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: tempPassword }
    );

    if (passwordError) {
      console.error('Error updating password:', passwordError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    // Update profile to mark enrollment as completed
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        enrollment_completed: true,
        enrollment_completed_at: completedAt,
        password_set: true,
        application_status: 'completed',
        updated_at: completedAt
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return res.status(500).json({ error: 'Failed to update profile enrollment status' });
    }

    // Update application status if applicationId is provided
    if (applicationId) {
      const { error: applicationError } = await supabaseAdmin
        .from('applications')
        .update({
          application_status: 'completed',
          enrollment_completed: true,
          password_set: true,
          processed_at: completedAt
        })
        .eq('id', applicationId);

      if (applicationError) {
        console.error('Error updating application:', applicationError);
      }
    }

    // Mark enrollment record as used
    const { error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .update({ 
        is_used: true,
        completed_at: completedAt
      })
      .eq('email', email);

    if (enrollmentError) {
      console.error('Error updating enrollment:', enrollmentError);
    }

    // Fetch bank details for email
    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    // Get user details
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    // Send email with credentials
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

      const emailResponse = await fetch(`${siteUrl}/api/send-enrollment-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          tempPassword: tempPassword,
          bankDetails: bankDetails
        })
      });

      if (!emailResponse.ok) {
        console.error('Failed to send credentials email');
      }
    } catch (emailError) {
      console.error('Error sending credentials email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Credentials sent successfully',
      credentialsSent: true,
      passwordResetLink: 'https://www.theoaklinebank.com/reset-password'
    });

  } catch (error) {
    console.error('Error completing enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}