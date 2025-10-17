import { supabaseAdmin } from '../../lib/supabaseAdmin';
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
    const {
      email,
      first_name,
      middle_name,
      last_name,
      account_numbers,
      account_types,
      application_id,
      country,
      enrollment_token,
      site_url
    } = req.body;

    // Validate required fields
    if (!email || !first_name || !last_name || !application_id || !enrollment_token) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine site URL dynamically
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const detectedSiteUrl = site_url || process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    
    console.log('Using site URL for enrollment:', detectedSiteUrl);

    // SMTP transporter
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
    console.log('Testing SMTP connection...');
    try {
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (smtpError) {
      console.error('SMTP connection failed:', smtpError.message);
      return res.status(500).json({ 
        error: 'Email service connection failed',
        message: smtpError.message
      });
    }

    // Generate Supabase magic link for enrollment
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${detectedSiteUrl}/enroll?application_id=${application_id}`,
        data: {
          application_id: application_id,
          first_name: first_name,
          last_name: last_name
        }
      }
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      return res.status(500).json({ error: 'Failed to generate enrollment link' });
    }

    const enrollLink = linkData.properties.action_link;

    // Clean up account numbers and types
    const populatedAccountNumbers = account_numbers ? account_numbers.filter(num => num && num.trim() !== '') : [];
    const populatedAccountTypes = account_types ? account_types.filter(type => type && type.trim() !== '') : [];

    // Build full name
    const fullName = `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`;

    // Prepare account details HTML
    let accountDetailsHtml = populatedAccountNumbers.length > 0 ? `
      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Your Account Numbers:</h3>
        ${populatedAccountNumbers.map((num, index) => `
          <p style="font-family: monospace; font-size: 16px; margin: 5px 0;">
            <strong>${populatedAccountTypes[index] ? populatedAccountTypes[index].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Account'}:</strong> ${num}
          </p>
        `).join('')}
        <p style="font-family: monospace; font-size: 16px; margin: 5px 0;">
          <strong>Routing Number:</strong> 075915826
        </p>
      </div>
    ` : '';

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Your Oakline Bank Enrollment</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .button { display: inline-block; padding: 15px 30px; background: #1e40af; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Oakline Bank!</h1>
          </div>
          <div class="content">
            <h2>Complete Your Enrollment</h2>
            <p>Hello ${fullName},</p>
            <p>Your application has been processed and your accounts are ready for activation.</p>

            ${accountDetailsHtml}

            <p>To complete your enrollment and activate your accounts, please click the button below:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${enrollLink}" class="button">
                Complete Enrollment
              </a>
            </div>

            <p><strong>Important:</strong> During enrollment, you'll need to:</p>
            <ul>
              <li>Set your account password</li>
              <li>Provide your ${country === 'US' ? 'Social Security Number (SSN)' : 'Government ID Number'}</li>
              <li>Select one of your account numbers listed above</li>
              <li>Agree to our Terms of Service and Privacy Policy</li>
            </ul>

            <p><em>This link will expire in 7 days for security purposes.</em></p>

            <p>If you have any questions, please contact our customer support team.</p>
            <p>Thank you for choosing Oakline Bank!</p>
            <p><strong>The Oakline Bank Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2024 Oakline Bank. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create or update enrollment record - only set created_at for new records
    const { data: existingEnrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id, created_at')
      .eq('email', email.trim().toLowerCase())
      .eq('application_id', application_id)
      .maybeSingle();

    if (existingEnrollment) {
      // Update existing enrollment - keep original created_at
      const { error: updateError } = await supabaseAdmin
        .from('enrollments')
        .update({
          token: linkData.properties.action_link,
          is_used: false,
          click_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEnrollment.id);

      if (updateError) {
        console.error('Error updating enrollment record:', updateError);
      }
    } else {
      // Create new enrollment record (no user_id column in enrollments table)
      const { error: insertError } = await supabaseAdmin
        .from('enrollments')
        .insert([{
          email: email.trim().toLowerCase(),
          application_id: application_id,
          token: linkData.properties.action_link,
          is_used: false,
          click_count: 0,
          created_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error('Error creating enrollment record:', insertError);
      }
    }

    // Send email
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Complete Your Oakline Bank Enrollment",
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Welcome email with magic link sent to ${email}: ${info.response}`);

    res.status(200).json({
      message: 'Welcome email sent successfully',
      messageId: info.messageId,
      enrollmentLink: enrollLink
    });

  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ 
      error: 'Failed to send welcome email',
      message: error.message 
    });
  }
}
