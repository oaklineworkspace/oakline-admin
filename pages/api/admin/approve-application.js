import { supabaseAdmin } from '../../../lib/supabaseAdmin';
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

async function sendWelcomeEmail(email, firstName, temporaryPassword, accounts, card) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP not configured. Skipping email sending.');
    return { sent: false, reason: 'SMTP not configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const accountsList = accounts.map(acc => 
      `${acc.account_type}: ${acc.account_number}`
    ).join('\n        ');

    const emailBody = `
Dear ${firstName},

Congratulations! Your application has been approved.

Your account details:
    Accounts:
        ${accountsList}
    
    Card Number: ${card.card_number}
    Expiry Date: ${card.expiry_date}
    CVC: ${card.cvc}

Login Credentials:
    Email: ${email}
    Temporary Password: ${temporaryPassword}

Please log in and change your password immediately.

Welcome to our banking family!

Best regards,
The Banking Team
    `.trim();

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Welcome! Your Application Has Been Approved',
      text: emailBody,
    });

    return { sent: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { sent: false, error: error.message };
  }
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
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.application_status === 'approved') {
      return res.status(400).json({ error: 'Application already approved' });
    }

    let userId = application.user_id;
    let temporaryPassword = null;
    let userCreated = false;

    if (!userId) {
      // First check if user already exists in auth
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = authUsers?.users?.find(u => u.email === application.email);

      if (existingAuthUser) {
        // User exists in auth, use that ID
        userId = existingAuthUser.id;
        temporaryPassword = null;
        console.log(`User already exists in auth with ID: ${userId}`);
      } else {
        // Create new user
        temporaryPassword = `Temp${Math.random().toString(36).substring(2, 10)}@${Date.now().toString().slice(-4)}`;

        const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
          email: application.email,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            first_name: application.first_name,
            last_name: application.last_name,
          },
        });

        if (userError) {
          console.error('Error creating user in auth:', userError);
          throw new Error(`Failed to create user: ${userError.message}`);
        }

        userId = newUser.user.id;
        userCreated = true;
        console.log(`New user created with ID: ${userId}`);
      }
    }

    // Upsert the profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: application.email,
        first_name: application.first_name,
        middle_name: application.middle_name || null,
        last_name: application.last_name,
        phone: application.phone || null,
        date_of_birth: application.date_of_birth || null,
        country: application.country || null,
        ssn: application.ssn || null,
        id_number: application.id_number || null,
        address: application.address || null,
        city: application.city || null,
        state: application.state || null,
        zip_code: application.zip_code || null,
        employment_status: application.employment_status || null,
        annual_income: application.annual_income || null,
        mothers_maiden_name: application.mothers_maiden_name || null,
        account_types: application.account_types || [],
        application_status: 'approved',
        enrollment_completed: true,
        password_set: temporaryPassword ? false : true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      throw new Error(`Profile creation failed: ${profileError.message} (Code: ${profileError.code})`);
    }

    console.log('Profile created/updated successfully:', profileData?.id);

    const accountTypes = application.account_types || ['Checking Account'];
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
          status: 'active',
          routing_number: '075915826',
        })
        .select()
        .single();

      if (accountError) {
        throw new Error(`Account creation failed: ${accountError.message}`);
      }

      createdAccounts.push(newAccount);
    }

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
        status: 'active',
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
      throw new Error(`Card creation failed: ${cardError.message}`);
    }

    if (temporaryPassword) {
      const emailResult = await sendWelcomeEmail(
        application.email,
        application.first_name,
        temporaryPassword,
        createdAccounts,
        newCard
      );

      if (emailResult.sent) {
        const emailBody = `
Dear ${application.first_name},

Congratulations! Your application has been approved.

Your account details:
    Accounts: ${createdAccounts.map(acc => `${acc.account_type}: ${acc.account_number}`).join(', ')}
    Card Number: ${newCard.card_number}

Login Credentials:
    Email: ${application.email}
    Temporary Password: ${temporaryPassword}

Please log in and change your password immediately.
        `.trim();

        await supabaseAdmin
          .from('email_queue')
          .insert({
            user_id: userId,
            email: application.email,
            subject: 'Welcome! Your Application Has Been Approved',
            body: emailBody,
            sent: true,
          });
      } else {
        const emailBody = `
Dear ${application.first_name},

Congratulations! Your application has been approved.

Your account details:
    Accounts: ${createdAccounts.map(acc => `${acc.account_type}: ${acc.account_number}`).join(', ')}
    Card Number: ${newCard.card_number}

Login Credentials:
    Email: ${application.email}
    Temporary Password: ${temporaryPassword}

Please log in and change your password immediately.
        `.trim();

        await supabaseAdmin
          .from('email_queue')
          .insert({
            user_id: userId,
            email: application.email,
            subject: 'Welcome! Your Application Has Been Approved',
            body: emailBody,
            sent: false,
          });
      }
    }

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
      throw new Error(`Application update failed: ${updateError.message}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Application approved successfully',
      data: {
        userId,
        userCreated,
        temporaryPassword: userCreated ? temporaryPassword : null,
        accounts: createdAccounts.map(acc => ({
          id: acc.id,
          account_number: acc.account_number,
          account_type: acc.account_type,
          balance: acc.balance,
          status: acc.status,
        })),
        card: {
          id: newCard.id,
          card_number: newCard.card_number,
          card_type: newCard.card_type,
          expiry_date: newCard.expiry_date,
          status: newCard.status,
        },
      },
    });

  } catch (error) {
    console.error('Error approving application:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      details: error.details || error.hint || error.code
    });
    return res.status(500).json({
      error: 'Failed to approve application',
      details: error.message || 'Unknown error occurred',
      errorCode: error.code,
      errorHint: error.hint,
    });
  }
}
