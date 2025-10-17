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
    const { applicationId, email, firstName, middleName, lastName, country } = req.body;

    // Validate required fields
    if (!applicationId && !email) {
      return res.status(400).json({ error: 'Either application ID or email is required' });
    }

    // Get application data - allow lookup by email if applicationId is missing
    let applicationData;
    if (applicationId) {
      const { data, error: applicationError } = await supabaseAdmin
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (applicationError || !data) {
        return res.status(404).json({ error: 'Application not found' });
      }
      applicationData = data;
    } else if (email) {
      const { data, error: applicationError } = await supabaseAdmin
        .from('applications')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (applicationError || !data) {
        return res.status(404).json({ error: 'No application found for this email' });
      }
      applicationData = data;
    }

    // Get user's accounts
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('account_number, account_type')
      .eq('application_id', applicationId);

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
    }

    // Check if auth user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let authUser = existingUsers?.users?.find(user => user.email === email);

    if (!authUser) {
      // Create auth user first
      const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: false, // Don't auto-confirm - they'll use the magic link
        user_metadata: {
          first_name: firstName || applicationData.first_name,
          last_name: lastName || applicationData.last_name,
          application_id: applicationId
        }
      });

      if (createError) {
        console.error('Error creating auth user:', createError);
        return res.status(500).json({ error: 'Failed to create user account' });
      }

      authUser = newUser.user;
    }

    // Detect site URL dynamically from multiple sources
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

    console.log('Using site URL for redirect:', siteUrl);
    console.log('Detected from headers - Protocol:', protocol, 'Host:', host);

    // Generate magic link using Supabase Admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${siteUrl}/enroll?application_id=${applicationId}`,
        data: {
          application_id: applicationId,
          first_name: firstName || applicationData.first_name,
          last_name: lastName || applicationData.last_name
        }
      }
    });

    console.log('Magic link generated:', linkData ? 'Success' : 'Failed');
    console.log('Redirect URL:', `${siteUrl}/enroll?application_id=${applicationId}`);

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      return res.status(500).json({ error: 'Failed to generate enrollment link' });
    }

    // Create SMTP transporter - fixed method call
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

    // Build full name
    const fullName = `${firstName || applicationData.first_name} ${middleName || applicationData.middle_name ? (middleName || applicationData.middle_name) + ' ' : ''}${lastName || applicationData.last_name}`;

    // Prepare account details HTML
    let accountDetailsHtml = '';
    if (accounts && accounts.length > 0) {
      const validAccounts = accounts.filter(acc => acc.account_number);
      if (validAccounts.length > 0) {
        accountDetailsHtml = `
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Your Account Numbers:</h3>
            ${validAccounts.map(acc => `
              <p style="font-family: monospace; font-size: 16px; margin: 5px 0;">
                <strong>${acc.account_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> ${acc.account_number}
              </p>
            `).join('')}
            <p style="font-family: monospace; font-size: 16px; margin: 5px 0;">
              <strong>Routing Number:</strong> 075915826
            </p>
          </div>
        `;
      }
    }

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
            <h1>Complete Your Oakline Bank Enrollment</h1>
          </div>
          <div class="content">
            <p>Hello ${fullName},</p>
            <p>Your application has been processed and you're ready to complete your enrollment.</p>

            ${accountDetailsHtml}

            <p>Click the secure link below to complete your enrollment and activate your account:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${linkData.properties.action_link}" class="button">
                Complete Enrollment Now
              </a>
            </div>

            <p><strong>Important:</strong> During enrollment, you'll need to:</p>
            <ul>
              <li>Set your account password</li>
              <li>Provide your ${country === 'US' ? 'Social Security Number (SSN)' : 'Government ID Number'}</li>
              ${accounts && accounts.length > 1 ? '<li>Select your primary account number</li>' : ''}
              <li>Agree to our Terms of Service and Privacy Policy</li>
            </ul>

            <p><em>This secure link will expire in 24 hours for security purposes.</em></p>

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

    // Create mail options
    const mailOptions = {
      from: `"Oakline Bank" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Complete Your Oakline Bank Enrollment',
      html: emailHtml
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Enrollment magic link sent to ${email}: ${info.response}`);

    // Update or create enrollment record - preserve original created_at
    try {
      // First check if enrollment exists
      const { data: existingEnrollment } = await supabaseAdmin
        .from('enrollments')
        .select('id, created_at')
        .eq('email', email)
        .eq('application_id', applicationId)
        .maybeSingle();

      if (existingEnrollment) {
        // Update existing enrollment - keep original created_at for 24-hour expiration
        const { error: updateError } = await supabaseAdmin
          .from('enrollments')
          .update({
            is_used: false,
            click_count: 0,
            token: linkData.properties.action_link,
            updated_at: new Date().toISOString()
            // DO NOT update created_at - keep original for 24-hour expiration
          })
          .eq('id', existingEnrollment.id);

        if (updateError) {
          console.warn('Failed to update enrollment record:', updateError);
        } else {
          console.log('✅ Enrollment record updated - preserving original created_at');
        }
      } else {
        // Create new enrollment
        const { error: insertError } = await supabaseAdmin
          .from('enrollments')
          .insert([{
            email: email,
            application_id: applicationId,
            is_used: false,
            click_count: 0,
            token: linkData.properties.action_link,
            created_at: new Date().toISOString()
          }]);

        if (insertError) {
          console.warn('Failed to create enrollment record:', insertError);
        } else {
          console.log('✅ New enrollment record created');
        }
      }
    } catch (enrollmentUpdateError) {
      console.warn('Error managing enrollment record:', enrollmentUpdateError);
    }

    res.status(200).json({
      message: 'Enrollment magic link sent successfully',
      messageId: info.messageId,
      email: email
    });

  } catch (error) {
    console.error('Error sending enrollment link:', error);
    res.status(500).json({
      error: 'Failed to send enrollment link',
      message: error.message
    });
  }
}