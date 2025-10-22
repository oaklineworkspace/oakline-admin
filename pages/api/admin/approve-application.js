
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

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const special = '!@#$%';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += special.charAt(Math.floor(Math.random() * special.length));
  return password;
}

async function createDebitCardForAccount(userId, accountId) {
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
      account_id: accountId,
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

  return newCard;
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
      console.error('Application fetch error:', appError);
      return res.status(404).json({ error: 'Application not found', details: appError?.message });
    }

    if (application.application_status === 'approved') {
      return res.status(400).json({ error: 'Application already approved' });
    }

    // Validate required fields
    if (!application.email || !application.first_name || !application.last_name) {
      return res.status(400).json({ error: 'Application missing required fields' });
    }

    const email = application.email.toLowerCase().trim();
    const firstName = application.first_name.trim();
    const middleName = application.middle_name ? application.middle_name.trim() : '';
    const lastName = application.last_name.trim();
    const fullName = `${firstName} ${middleName} ${lastName}`.trim();

    console.log(`Processing application for ${fullName} (${email})`);

    // Check if user already exists
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (profileCheckError) {
      console.error('Error checking existing profile:', profileCheckError);
      return res.status(500).json({ error: 'Error checking user existence', details: profileCheckError.message });
    }

    if (existingProfile) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // 2. Create temporary password and auth user
    const tempPassword = generateTempPassword();

    console.log('Creating auth user for:', email);

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        application_id: applicationId
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return res.status(500).json({ 
        error: 'Failed to create auth user', 
        details: authError.message,
        code: authError.code
      });
    }

    if (!authUser || !authUser.user) {
      console.error('Auth user creation returned no user');
      return res.status(500).json({ error: 'Failed to create auth user - no user returned' });
    }

    const userId = authUser.user.id;
    console.log(`Auth user created successfully: ${userId}`);

    // 3. Create profile
    console.log('Creating profile for user:', userId);
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        phone: application.phone || null,
        date_of_birth: application.date_of_birth || null,
        country: application.country || 'US',
        address: application.address || null,
        city: application.city || null,
        state: application.state || null,
        zip_code: application.zip_code || null,
        enrollment_completed: true,
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      console.log('Rolling back auth user creation');
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ 
        error: 'Failed to create profile', 
        details: profileError.message,
        code: profileError.code
      });
    }

    console.log('Profile created successfully');

    // 4. Create default checking account
    const accountTypes = application.account_types || [];
    let checkingAccountNumber;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      checkingAccountNumber = generateAccountNumber();
      const { data: existing } = await supabaseAdmin
        .from('accounts')
        .select('id')
        .eq('account_number', checkingAccountNumber)
        .maybeSingle();

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      console.error('Failed to generate unique account number');
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: 'Failed to generate unique account number' });
    }

    console.log('Creating checking account with number:', checkingAccountNumber);

    const { data: checkingAccount, error: checkingError } = await supabaseAdmin
      .from('accounts')
      .insert({
        user_id: userId,
        application_id: applicationId,
        account_number: checkingAccountNumber,
        account_type: 'checking_account',
        balance: 100.00,
        status: 'active',
        routing_number: '075915826',
      })
      .select()
      .single();

    if (checkingError) {
      console.error('Checking account creation error:', checkingError);
      console.log('Rolling back auth user and profile');
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ 
        error: 'Failed to create checking account', 
        details: checkingError.message,
        code: checkingError.code
      });
    }

    console.log('Default checking account created:', checkingAccount.id);

    // 5. Create debit card for checking account
    const checkingCard = await createDebitCardForAccount(userId, checkingAccount.id);
    console.log('Debit card created for checking account');

    // 6. Create other requested accounts as pending
    const otherAccountTypes = accountTypes.filter(type => type !== 'checking_account');
    const pendingAccounts = [];

    const accountTypeConfig = {
      'savings_account': { initialBalance: 0.00 },
      'business_checking': { initialBalance: 500.00 },
      'business_savings': { initialBalance: 250.00 },
      'student_checking': { initialBalance: 25.00 },
      'money_market': { initialBalance: 1000.00 },
      'certificate_of_deposit': { initialBalance: 5000.00 },
      'retirement_ira': { initialBalance: 0.00 },
      'joint_checking': { initialBalance: 100.00 },
      'trust_account': { initialBalance: 10000.00 },
      'investment_brokerage': { initialBalance: 2500.00 },
      'high_yield_savings': { initialBalance: 500.00 }
    };

    for (const accountType of otherAccountTypes) {
      let accountNumber;
      isUnique = false;
      attempts = 0;

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
        throw new Error('Failed to generate unique account number for ' + accountType);
      }

      const config = accountTypeConfig[accountType] || { initialBalance: 0.00 };

      const { data: newAccount, error: accountError } = await supabaseAdmin
        .from('accounts')
        .insert({
          user_id: userId,
          application_id: applicationId,
          account_number: accountNumber,
          account_type: accountType,
          balance: config.initialBalance,
          status: 'pending',
          routing_number: '075915826',
        })
        .select()
        .single();

      if (accountError) {
        console.error('Pending account creation error:', accountError);
        continue;
      }

      pendingAccounts.push(newAccount);
    }

    console.log(`Created ${pendingAccounts.length} pending accounts`);

    // 7. Update application status
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

    // 8. Send welcome email with credentials
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

      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
      const loginUrl = `${siteUrl}/login`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🏦 Welcome to Oakline Bank!</h1>
            </div>
            
            <div style="padding: 40px 32px;">
              <h2 style="color: #1e40af; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                Your Account is Ready!
              </h2>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hello ${fullName},
              </p>

              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Congratulations! Your application has been approved and your account is now active.
              </p>
              
              <div style="background-color: #f7fafc; border-radius: 12px; padding: 24px; margin: 32px 0;">
                <h3 style="color: #1a365d; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                  🔐 Your Login Credentials
                </h3>
                <p style="color: #4a5568; font-size: 16px; margin: 8px 0;">
                  <strong>Email:</strong> ${email}
                </p>
                <p style="color: #4a5568; font-size: 16px; margin: 8px 0;">
                  <strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code>
                </p>
              </div>

              <div style="background-color: #ecfdf5; border-radius: 12px; padding: 24px; margin: 32px 0;">
                <h3 style="color: #065f46; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                  💳 Your Account Summary
                </h3>
                <p style="color: #047857; font-size: 16px; margin: 8px 0;">
                  <strong>Checking Account:</strong> ****${checkingAccountNumber.slice(-4)}
                </p>
                <p style="color: #047857; font-size: 16px; margin: 8px 0;">
                  <strong>Debit Card:</strong> ****${checkingCard.card_number.slice(-4)}
                </p>
                ${pendingAccounts.length > 0 ? `
                <p style="color: #047857; font-size: 14px; margin: 16px 0 8px 0;">
                  <strong>Pending Accounts (requires admin approval):</strong>
                </p>
                <ul style="color: #047857; font-size: 14px; margin: 0; padding-left: 20px;">
                  ${pendingAccounts.map(acc => `<li>${acc.account_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>`).join('')}
                </ul>
                ` : ''}
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #2c5aa0 100%); color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Login to Your Account
                </a>
              </div>

              <div style="background-color: #fef5e7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
                <p style="color: #92400e; font-size: 14px; font-weight: 500; margin: 0;">
                  🔒 <strong>Security Notice:</strong> Please change your password immediately after your first login.
                </p>
              </div>
            </div>
            
            <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
                Member FDIC | Routing: 075915826
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Welcome to Oakline Bank - Your Account is Active!',
        html: emailHtml,
      });

      console.log(`Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Application approved successfully. User can now login.',
      data: {
        applicationId,
        userId,
        email,
        tempPassword,
        checkingAccount: {
          id: checkingAccount.id,
          account_number: checkingAccount.account_number,
          account_type: checkingAccount.account_type,
          balance: checkingAccount.balance,
          status: checkingAccount.status,
        },
        checkingCard: {
          id: checkingCard.id,
          card_number: `****${checkingCard.card_number.slice(-4)}`,
          card_type: checkingCard.card_type,
          expiry_date: checkingCard.expiry_date,
          status: checkingCard.status,
        },
        pendingAccounts: pendingAccounts.map(acc => ({
          id: acc.id,
          account_number: acc.account_number,
          account_type: acc.account_type,
          status: acc.status,
        })),
        welcomeEmailSent: true,
        userCreated: true
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
