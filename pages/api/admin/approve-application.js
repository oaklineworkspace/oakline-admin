import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

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
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += special.charAt(Math.floor(Math.random() * special.length));
  return password;
}

async function validateAccountNumberUniqueness(accountNumber) {
  const { data: existing } = await supabaseAdmin
    .from('accounts')
    .select('id')
    .eq('account_number', accountNumber)
    .maybeSingle();
  
  return !existing;
}

async function createDebitCardForAccount(userId, accountId, accountType) {
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

  const cardLimits = {
    'checking_account': { daily: 5000, monthly: 20000 },
    'business_checking': { daily: 15000, monthly: 50000 },
    'student_checking': { daily: 1000, monthly: 3000 },
    'default': { daily: 5000, monthly: 20000 }
  };

  const limits = cardLimits[accountType] || cardLimits['default'];

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
      daily_limit: limits.daily,
      monthly_limit: limits.monthly,
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

async function rollbackUserCreation(userId, createdAccounts = [], createdCards = []) {
  console.log(`Rolling back user creation for userId: ${userId}`);
  
  try {
    if (createdCards.length > 0) {
      const cardIds = createdCards.map(c => c.id);
      await supabaseAdmin.from('cards').delete().in('id', cardIds);
      console.log(`Deleted ${createdCards.length} cards`);
    }

    if (createdAccounts.length > 0) {
      const accountIds = createdAccounts.map(a => a.id);
      await supabaseAdmin.from('transactions').delete().in('account_id', accountIds);
      await supabaseAdmin.from('accounts').delete().in('id', accountIds);
      console.log(`Deleted ${createdAccounts.length} accounts and their transactions`);
    }

    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    console.log('Deleted profile');

    await supabaseAdmin.auth.admin.deleteUser(userId);
    console.log('Deleted auth user');
  } catch (rollbackError) {
    console.error('Error during rollback:', rollbackError);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    applicationId, 
    manualAccountNumbers = {},
    accountNumberMode = 'auto',
    cardTypes = {}
  } = req.body;

  if (!applicationId) {
    return res.status(400).json({ error: 'Application ID is required' });
  }

  let userId = null;
  let createdAccounts = [];
  let createdCards = [];

  try {
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

    if (!application.email || !application.first_name || !application.last_name) {
      return res.status(400).json({ error: 'Application missing required fields' });
    }

    const email = application.email.toLowerCase().trim();
    const firstName = application.first_name.trim();
    const middleName = application.middle_name ? application.middle_name.trim() : '';
    const lastName = application.last_name.trim();
    const fullName = `${firstName} ${middleName} ${lastName}`.trim();

    console.log(`Processing application for ${fullName} (${email})`);

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

    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingAuthUser?.users?.some(u => u.email === email);
    
    if (userExists) {
      return res.status(400).json({ error: 'Auth user with this email already exists' });
    }

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

    userId = authUser.user.id;
    console.log(`Auth user created successfully: ${userId}`);

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
        ssn: application.ssn || null,
        id_number: application.id_number || null,
        employment_status: application.employment_status || null,
        annual_income: application.annual_income || null,
        mothers_maiden_name: application.mothers_maiden_name || null,
        account_types: application.account_types || ['checking_account'],
        enrollment_completed: true,
        password_set: true,
        application_status: 'approved',
        enrollment_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      await rollbackUserCreation(userId);
      return res.status(500).json({ 
        error: 'Failed to create profile', 
        details: profileError.message,
        code: profileError.code
      });
    }

    console.log('Profile created successfully');

    const accountTypes = application.account_types || ['checking_account'];
    if (!accountTypes.includes('checking_account')) {
      accountTypes.unshift('checking_account');
    }

    const accountTypeConfig = {
      'checking_account': { initialBalance: 100.00, status: 'active' },
      'savings_account': { initialBalance: 0.00, status: 'active' },
      'business_checking': { initialBalance: 500.00, status: 'active' },
      'business_savings': { initialBalance: 250.00, status: 'active' },
      'student_checking': { initialBalance: 25.00, status: 'active' },
      'money_market': { initialBalance: 1000.00, status: 'active' },
      'certificate_of_deposit': { initialBalance: 5000.00, status: 'active' },
      'retirement_ira': { initialBalance: 0.00, status: 'active' },
      'joint_checking': { initialBalance: 100.00, status: 'active' },
      'trust_account': { initialBalance: 10000.00, status: 'active' },
      'investment_brokerage': { initialBalance: 2500.00, status: 'active' },
      'high_yield_savings': { initialBalance: 500.00, status: 'active' }
    };

    for (const accountType of accountTypes) {
      let accountNumber;

      if (accountNumberMode === 'manual' && manualAccountNumbers[accountType]) {
        accountNumber = manualAccountNumbers[accountType];
        
        const isUnique = await validateAccountNumberUniqueness(accountNumber);
        if (!isUnique) {
          await rollbackUserCreation(userId, createdAccounts, createdCards);
          return res.status(400).json({ 
            error: `Account number ${accountNumber} already exists for ${accountType}`,
            details: 'Please use a different account number'
          });
        }
      } else {
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
          accountNumber = generateAccountNumber();
          isUnique = await validateAccountNumberUniqueness(accountNumber);
          attempts++;
        }

        if (!isUnique) {
          await rollbackUserCreation(userId, createdAccounts, createdCards);
          return res.status(500).json({ 
            error: `Failed to generate unique account number for ${accountType}` 
          });
        }
      }

      const config = accountTypeConfig[accountType] || { initialBalance: 0.00, status: 'active' };

      console.log(`Creating ${accountType} account with number:`, accountNumber);

      const { data: newAccount, error: accountError } = await supabaseAdmin
        .from('accounts')
        .insert({
          user_id: userId,
          application_id: applicationId,
          account_number: accountNumber,
          account_type: accountType,
          balance: config.initialBalance,
          status: config.status,
          routing_number: '075915826',
        })
        .select()
        .single();

      if (accountError) {
        console.error(`Account creation error for ${accountType}:`, accountError);
        await rollbackUserCreation(userId, createdAccounts, createdCards);
        return res.status(500).json({ 
          error: `Failed to create ${accountType} account`, 
          details: accountError.message,
          code: accountError.code
        });
      }

      createdAccounts.push(newAccount);
      console.log(`${accountType} account created:`, newAccount.id);

      try {
        const cardType = cardTypes[accountType] || 'debit';
        const newCard = await createDebitCardForAccount(userId, newAccount.id, accountType);
        createdCards.push(newCard);
        console.log(`${cardType} card created for ${accountType} account`);
      } catch (cardError) {
        console.error(`Card creation error for ${accountType}:`, cardError);
        await rollbackUserCreation(userId, createdAccounts, createdCards);
        return res.status(500).json({ 
          error: `Failed to create card for ${accountType}`, 
          details: cardError.message
        });
      }
    }

    console.log(`Created ${createdAccounts.length} accounts and ${createdCards.length} cards`);

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
      await rollbackUserCreation(userId, createdAccounts, createdCards);
      return res.status(500).json({ 
        error: 'Failed to update application status', 
        details: updateError.message 
      });
    }

    console.log('Application status updated to approved');

    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to Oakline Bank - Your Account is Ready!',
        type: EMAIL_TYPES.WELCOME,
        data: {
          firstName: firstName,
          email: email,
          tempPassword: tempPassword,
          accounts: createdAccounts.map(acc => ({
            type: acc.account_type.replace(/_/g, ' ').toUpperCase(),
            number: acc.account_number,
            balance: `$${parseFloat(acc.balance).toFixed(2)}`
          })),
          cards: createdCards.map((card, index) => ({
            type: card.card_type.toUpperCase(),
            number: `****-****-****-${card.card_number.slice(-4)}`,
            accountType: createdAccounts[index]?.account_type.replace(/_/g, ' ').toUpperCase()
          }))
        }
      });
      console.log('Welcome email sent successfully');
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Application approved successfully',
      data: {
        userId: userId,
        userCreated: true,
        email: email,
        tempPassword: tempPassword,
        accountsCreated: createdAccounts.length,
        cardsCreated: createdCards.length,
        accounts: createdAccounts.map(acc => ({
          id: acc.id,
          type: acc.account_type,
          number: acc.account_number,
          balance: acc.balance,
          status: acc.status
        })),
        cards: createdCards.map(card => ({
          id: card.id,
          type: card.card_type,
          lastFour: card.card_number.slice(-4),
          expiryDate: card.expiry_date
        }))
      }
    });

  } catch (error) {
    console.error('Unexpected error during application approval:', error);
    
    if (userId) {
      await rollbackUserCreation(userId, createdAccounts, createdCards);
    }
    
    return res.status(500).json({ 
      error: 'Internal server error during application approval',
      details: error.message 
    });
  }
}
