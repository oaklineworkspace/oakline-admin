import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Generate a 10-character temp password meeting rules:
// - First char uppercase A-Z
// - At least 3 lowercase letters
// - At least 3 digits
// - Exactly 1 special char: either '#' or '$'
// - Total length 10
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

// Generate random card number
function generateCardNumber() {
  const prefix = '4'; // Visa starts with 4, you can adjust for Mastercard (5) or Amex (34/37)
  let cardNumber = prefix;
  for (let i = 1; i < 16; i++) {
    cardNumber += Math.floor(Math.random() * 10);
  }
  return cardNumber;
}

// Generate CVC
function generateCVC() {
  return Math.floor(100 + Math.random() * 900).toString();
}

// Generate expiry date (3 years from now)
function generateExpiryDate() {
  const today = new Date();
  today.setFullYear(today.getFullYear() + 3);
  return today.toISOString().split('T')[0];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    applicationId, 
    manualAccountNumbers = {},
    accountNumberMode = 'auto'
  } = req.body;

  if (!applicationId) {
    return res.status(400).json({ error: 'Application ID is required' });
  }

  try {
    // 1. Fetch the application
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

    // 2. Fetch bank details for email template
    const { data: bankDetails, error: bankError } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    if (bankError) {
      console.error('Failed to fetch bank details:', bankError);
      return res.status(500).json({ error: 'Failed to fetch bank details' });
    }

    // 3. Create or get Supabase Auth user
    let userId = application.user_id;
    let tempPassword = null;
    let isNewUser = false;

    if (!userId) {
      // Generate temporary password
      tempPassword = generateTempPassword();

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === application.email.toLowerCase());

      if (existingUser) {
        userId = existingUser.id;
        console.log('Using existing auth user:', userId);
      } else {
        // Create new auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: application.email.toLowerCase(),
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: application.first_name,
            middle_name: application.middle_name || '',
            last_name: application.last_name,
            application_id: applicationId
          }
        });

        if (authError) {
          console.error('Auth user creation error:', authError);
          return res.status(500).json({ 
            error: 'Failed to create user account', 
            details: authError.message 
          });
        }

        userId = authUser.user.id;
        isNewUser = true;
        console.log('Created new auth user:', userId);
      }

      // Update application with user_id
      const { error: userIdUpdateError } = await supabaseAdmin
        .from('applications')
        .update({ user_id: userId })
        .eq('id', applicationId);

      if (userIdUpdateError) {
        console.error('Failed to update application with user_id:', userIdUpdateError);
      }
    }

    console.log(`Approving application ${applicationId} for user ${userId}`);

    // 4. Create or update profile
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    const profileData = {
      id: userId,
      email: application.email.toLowerCase(),
      first_name: application.first_name,
      middle_name: application.middle_name || null,
      last_name: application.last_name,
      phone: application.phone || null,
      date_of_birth: application.date_of_birth || null,
      country: application.country || 'US',
      city: application.city || null,
      state: application.state || null,
      zip_code: application.zip_code || null,
      address: application.address || null,
      ssn: application.ssn || null,
      id_number: application.id_number || null,
      employment_status: application.employment_status || null,
      annual_income: application.annual_income || null,
      mothers_maiden_name: application.mothers_maiden_name || null,
      account_types: application.account_types || [],
      enrollment_completed: true,
      password_set: true,
      application_status: 'approved',
      updated_at: new Date().toISOString(),
      enrollment_completed_at: new Date().toISOString()
    };

    if (existingProfile) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update(profileData)
        .eq('id', userId);

      if (profileUpdateError) {
        console.error('Profile update error:', profileUpdateError);
      }
    } else {
      profileData.created_at = new Date().toISOString();
      const { error: profileInsertError } = await supabaseAdmin
        .from('profiles')
        .insert([profileData]);

      if (profileInsertError) {
        console.error('Profile insert error:', profileInsertError);
      }
    }

    // 5. Create accounts based on account_types array
    // Get all account types from the application (should be an array)
    let accountTypesToCreate = application.account_types || [];
    
    // If account_types is empty or not an array, fall back to checking
    if (!Array.isArray(accountTypesToCreate) || accountTypesToCreate.length === 0) {
      accountTypesToCreate = ['checking_account'];
    }

    console.log('Creating accounts for types:', accountTypesToCreate);

    const createdAccounts = [];
    const activeAccounts = [];
    const pendingAccounts = [];

    // Create an account for EACH account type the user selected
    for (const accountType of accountTypesToCreate) {
      // Determine account status based on type
      // checking_account = active, all others = pending
      const accountStatus = accountType === 'checking_account' ? 'active' : 'pending';

      // Generate or use manual account number
      let accountNumber;
      if (accountNumberMode === 'manual' && manualAccountNumbers[accountType]) {
        accountNumber = manualAccountNumbers[accountType];
      } else {
        // Generate unique account number
        accountNumber = Array.from({length: 12}, () => Math.floor(Math.random() * 10)).join('');
      }

      const accountData = {
        user_id: userId,
        application_id: applicationId,
        account_number: accountNumber,
        routing_number: bankDetails.routing_number || '075915826',
        account_type: accountType,
        balance: 0,
        status: accountStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newAccount, error: accountError } = await supabaseAdmin
        .from('accounts')
        .insert([accountData])
        .select()
        .single();

      if (accountError) {
        console.error('Account creation error for type', accountType, ':', accountError);
        throw new Error(`Failed to create ${accountType} account: ${accountError.message}`);
      }

      console.log('Created account:', accountType, 'with number:', accountNumber, 'status:', accountStatus);
      createdAccounts.push(newAccount);
      
      // Categorize accounts by status
      if (accountStatus === 'active') {
        activeAccounts.push(newAccount);
      } else {
        pendingAccounts.push(newAccount);
      }
    }

    // 6. Create cards only for active accounts
    const createdCards = [];

    for (const account of activeAccounts) {
      const cardBrand = application.chosen_card_brand || 'visa';
      const cardCategory = application.chosen_card_category || 'debit';

      const cardData = {
        user_id: userId,
        account_id: account.id,
        card_number: generateCardNumber(),
        card_brand: cardBrand,
        card_category: cardCategory,
        card_type: cardBrand, // For backward compatibility
        status: 'active',
        expiry_date: generateExpiryDate(),
        cvc: generateCVC(),
        daily_limit: 5000,
        monthly_limit: 20000,
        daily_spent: 0,
        monthly_spent: 0,
        credit_limit: cardCategory === 'credit' ? 5000 : 0,
        contactless: true,
        requires_3d_secure: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        activated_at: new Date().toISOString()
      };

      const { data: newCard, error: cardError } = await supabaseAdmin
        .from('cards')
        .insert([cardData])
        .select()
        .single();

      if (cardError) {
        console.error('Card creation error:', cardError);
        throw new Error('Failed to create card: ' + cardError.message);
      }

      createdCards.push(newCard);
    }

    // 7. Update application status to approved
    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        application_status: 'approved',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Application update error:', updateError);
      throw new Error('Failed to approve application: ' + updateError.message);
    }

    // 8. Send welcome email with credentials using dynamic bank details
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'theoaklinebank.com';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

      // Only send active accounts in welcome email
      const accountNumbers = activeAccounts.map(acc => acc.account_number);
      const accountTypes = activeAccounts.map(acc => acc.account_type);

      console.log('Sending welcome email with credentials to:', application.email);
      console.log('Temporary password:', tempPassword);
      console.log('Active accounts:', accountNumbers);

      const welcomeResponse = await fetch(`${siteUrl}/api/send-welcome-email-with-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: application.email,
          first_name: application.first_name,
          middle_name: application.middle_name || '',
          last_name: application.last_name,
          temp_password: tempPassword,
          account_numbers: accountNumbers,
          account_types: accountTypes,
          has_pending_accounts: pendingAccounts.length > 0,
          pending_account_types: pendingAccounts.map(acc => acc.account_type),
          application_id: applicationId,
          country: application.country || 'US',
          site_url: siteUrl,
          bank_details: bankDetails
        })
      });

      if (welcomeResponse.ok) {
        const emailResult = await welcomeResponse.json();
        console.log('✅ Welcome email with credentials sent successfully to:', application.email);
        console.log('Email result:', emailResult);
      } else {
        const errorData = await welcomeResponse.json();
        console.error('❌ Failed to send welcome email:', errorData);
        console.error('Email API status:', welcomeResponse.status);
      }
    } catch (emailError) {
      console.error('❌ Error sending welcome email:', emailError);
      console.error('Email error stack:', emailError.stack);
      // Don't fail the whole approval if email fails
    }

    return res.status(200).json({
      success: true,
      message: `Application approved successfully. ${activeAccounts.length} active account(s) created. ${pendingAccounts.length > 0 ? `${pendingAccounts.length} account(s) pending admin approval.` : ''}`,
      data: {
        userId: userId,
        email: application.email,
        tempPassword: isNewUser ? tempPassword : null,
        accountsCreated: createdAccounts.length,
        activeAccountsCount: activeAccounts.length,
        pendingAccountsCount: pendingAccounts.length,
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
          brand: card.card_brand || 'visa',
          category: card.card_category || 'debit',
          lastFour: card.card_number.slice(-4),
          expiryDate: card.expiry_date
        }))
      }
    });

  } catch (error) {
    console.error('Unexpected error during application approval:', error);

    return res.status(500).json({ 
      error: 'Internal server error during application approval',
      details: error.message 
    });
  }
}