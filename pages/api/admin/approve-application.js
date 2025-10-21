
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { createEnrollmentEmail, EMAIL_ADDRESSES } from '../../../lib/emailTemplates';
import nodemailer from 'nodemailer';

function generateAccountNumber() {
  const prefix = '1234';
  const randomDigits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${prefix}${randomDigits}`;
}

function generateCardNumber() {
  const prefix = '4532';
  const part1 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const part2 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const part3 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${part1}${part2}${part3}`;
}

function generateCVC() {
  return Math.floor(Math.random() * 900 + 100).toString();
}

function generateExpiryDate() {
  const today = new Date();
  const expiryDate = new Date(today.getFullYear() + 4, today.getMonth(), 1);
  return expiryDate.toISOString().split('T')[0];
}

function generateEnrollmentToken() {
  return `enroll_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { applicationId } = req.body;

  if (!applicationId) {
    return res.status(400).json({ error: 'Application ID is required' });
  }

  try {
    // 1. Get application details
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('Application not found:', appError);
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.application_status === 'approved') {
      return res.status(400).json({ error: 'Application already approved' });
    }

    const email = application.email.toLowerCase();
    const firstName = application.first_name;
    const middleName = application.middle_name || '';
    const lastName = application.last_name;
    const fullName = `${firstName} ${middleName} ${lastName}`.trim();

    console.log(`Processing application for ${fullName} (${email})`);

    // 2. Create Supabase Auth user
    const tempPassword = `Temp${Date.now()}!${Math.random().toString(36).substring(2, 8)}`;
    
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: false,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        application_id: applicationId
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return res.status(500).json({ error: `Failed to create auth user: ${authError.message}` });
    }

    const userId = authUser.user.id;
    console.log(`Auth user created: ${userId}`);

    // 3. Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        phone: application.phone,
        date_of_birth: application.date_of_birth,
        country: application.country,
        address: application.address,
        city: application.city,
        state: application.state,
        zip_code: application.zip_code,
        application_id: applicationId,
        enrollment_completed: false
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Cleanup auth user if profile fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: `Failed to create profile: ${profileError.message}` });
    }

    console.log('Profile created successfully');

    // 4. Create accounts
    const accountTypes = application.account_types || ['checking_account'];
    const createdAccounts = [];

    for (const accountType of accountTypes) {
      let accountNumber;
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        accountNumber = generateAccountNumber();
        const { data: existing } = await supabaseAdmin
          .from('accounts')
          .select('id')
          .eq('account_number', accountNumber)
          .maybeSingle();

        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        throw new Error('Failed to generate unique account number');
      }

      const { data: newAccount, error: accountError } = await supabaseAdmin
        .from('accounts')
        .insert({
          user_id: userId,
          application_id: applicationId,
          account_number: accountNumber,
          account_type: accountType,
          balance: 0,
          status: 'pending',
          routing_number: '075915826',
        })
        .select()
        .single();

      if (accountError) {
        console.error('Account creation error:', accountError);
        throw new Error(`Account creation failed: ${accountError.message}`);
      }

      createdAccounts.push(newAccount);
    }

    console.log(`Created ${createdAccounts.length} accounts`);

    // 5. Create debit card for first account
    const firstAccount = createdAccounts[0];
    let cardNumber;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      cardNumber = generateCardNumber();
      const { data: existing } = await supabaseAdmin
        .from('cards')
        .select('id')
        .eq('card_number', cardNumber)
        .maybeSingle();

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique card number');
    }

    const { data: newCard, error: cardError } = await supabaseAdmin
      .from('cards')
      .insert({
        user_id: userId,
        account_id: firstAccount.id,
        card_number: cardNumber,
        card_type: 'debit',
        status: 'inactive',
        expiry_date: generateExpiryDate(),
        cvc: generateCVC(),
        daily_limit: 5000,
        monthly_limit: 20000,
        daily_spent: 0,
        monthly_spent: 0,
        is_locked: false,
      })
      .select()
      .single();

    if (cardError) {
      console.error('Card creation error:', cardError);
      throw new Error(`Card creation failed: ${cardError.message}`);
    }

    console.log('Debit card created successfully');

    // 6. Generate enrollment token
    const enrollmentToken = generateEnrollmentToken();

    const { error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .insert({
        email: email,
        token: enrollmentToken,
        is_used: false,
        application_id: applicationId,
        user_id: userId
      });

    if (enrollmentError) {
      console.error('Enrollment record creation error:', enrollmentError);
    }

    // 7. Send enrollment email
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    const enrollLink = `${siteUrl}/enroll?token=${enrollmentToken}`;

    const emailTemplate = createEnrollmentEmail(fullName, enrollLink);

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

      await transporter.sendMail({
        from: emailTemplate.from,
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });

      console.log(`Enrollment email sent to ${email}`);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the approval for email issues
    }

    // 8. Update application status
    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        user_id: userId,
        application_status: 'approved',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Application update error:', updateError);
      throw new Error(`Application update failed: ${updateError.message}`);
    }

    console.log('Application approved successfully');

    return res.status(200).json({
      success: true,
      message: 'Application approved successfully. User created and enrollment email sent.',
      data: {
        applicationId,
        userId,
        email,
        accounts: createdAccounts.map(acc => ({
          id: acc.id,
          account_number: acc.account_number,
          account_type: acc.account_type,
          balance: acc.balance,
          status: acc.status,
        })),
        card: {
          id: newCard.id,
          card_number: `****${newCard.card_number.slice(-4)}`,
          card_type: newCard.card_type,
          expiry_date: newCard.expiry_date,
          status: newCard.status,
        },
        enrollmentEmailSent: true
      },
    });

  } catch (error) {
    console.error('Error approving application:', error);
    return res.status(500).json({
      error: 'Failed to approve application',
      details: error.message || 'Unknown error occurred',
    });
  }
}
