import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic admin check - in production, you'd want proper admin authentication
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized - Invalid admin credentials' });
  }

  const {
    firstName,
    middleName,
    lastName,
    mothersMaidenName,
    email,
    phone,
    dateOfBirth,
    ssn,
    idNumber,
    country,
    address,
    city,
    state,
    zipCode,
    accountTypes,
    employmentStatus,
    annualIncome,
    password,
    sendEnrollmentEmail = true
  } = req.body;

  // Map frontend field names to expected names
  const dob = dateOfBirth;
  const ssnOrId = country === 'US' ? ssn : idNumber;
  const selectedAccountTypes = accountTypes;

  // Validation
  if (!firstName || !lastName || !email || !dob || !address || !city || !state || !zipCode || !selectedAccountTypes || !annualIncome || !password) {
    return res.status(400).json({ error: 'Missing required fields: firstName, lastName, email, dateOfBirth, address, city, state, zipCode, accountTypes, annualIncome, password' });
  }

  if (!ssnOrId) {
    return res.status(400).json({ error: `Missing required field: ${country === 'US' ? 'SSN' : 'ID Number'} is required` });
  }

  try {
    // 1. Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('applications')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Map account type IDs to enum values
    const ACCOUNT_TYPE_MAPPING = {
      1: 'checking_account',
      2: 'savings_account',
      3: 'business_checking',
      4: 'business_savings',
      5: 'student_checking',
      6: 'money_market',
      7: 'certificate_of_deposit',
      8: 'retirement_ira',
      9: 'joint_checking',
      10: 'trust_account',
      11: 'investment_brokerage',
      12: 'high_yield_savings',
      13: 'international_checking',
      14: 'foreign_currency',
      15: 'cryptocurrency_wallet',
      16: 'loan_repayment',
      17: 'mortgage',
      18: 'auto_loan',
      19: 'credit_card',
      20: 'prepaid_card',
      21: 'payroll_account',
      22: 'nonprofit_charity',
      23: 'escrow_account'
    };

    const mappedAccountTypes = accountTypes.map(id => ACCOUNT_TYPE_MAPPING[id]).filter(Boolean);

    // Validate employment status
    const validEmploymentStatuses = [
      'Employed Full-time',
      'Employed Part-time',
      'Self-employed',
      'Unemployed',
      'Retired',
      'Student'
    ];

    if (!validEmploymentStatuses.includes(employmentStatus)) {
      return res.status(400).json({ error: 'Invalid employment status provided' });
    }


    // 2. Create application record
    const applicationData = {
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      mothers_maiden_name: mothersMaidenName || null,
      email: email.toLowerCase(),
      phone: phone || null,
      date_of_birth: dateOfBirth,
      ssn: country === 'US' ? ssn : null,
      id_number: country !== 'US' ? idNumber : null,
      country: country,
      address: address,
      city: city,
      state: state,
      zip_code: zipCode,
      account_types: mappedAccountTypes,
      employment_status: employmentStatus,
      annual_income: annualIncome || 'under_25k',
      application_status: 'approved', // Admin created applications are pre-approved
      created_by_admin: true,
      submitted_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    };

    console.log('Creating application with data:', {
      first_name: firstName,
      last_name: lastName,
      email: email.toLowerCase(),
      phone: phone || null,
      date_of_birth: dateOfBirth,
      ssn: country === 'US' ? ssn : null,
      id_number: country !== 'US' ? idNumber : null,
      country: country,
      address: address,
      city: city,
      state: state,
      zip_code: zipCode,
      account_types: mappedAccountTypes,
      employment_status: employmentStatus,
      annual_income: annualIncome || 'under_25k',
      application_status: 'approved',
      created_by_admin: true,
      submitted_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    });

    const { data: application, error: applicationError } = await supabaseAdmin
      .from('applications')
      .insert([applicationData])
      .select()
      .single();

    if (applicationError) {
      console.error('Application creation error:', applicationError);
      return res.status(500).json({ error: 'Failed to create application record' });
    }

    console.log('Application created successfully:', application);

    // 3. Create accounts for each selected account type
    const accountsData = mappedAccountTypes.map(accountType => {
      const accountTypeConfig = {
        'checking_account': { name: 'Checking Account', initialBalance: 100.00 },
        'savings_account': { name: 'Savings Account', initialBalance: 0.00 },
        'business_checking': { name: 'Business Checking', initialBalance: 500.00 },
        'business_savings': { name: 'Business Savings', initialBalance: 250.00 },
        'student_checking': { name: 'Student Checking', initialBalance: 25.00 },
        'money_market': { name: 'Money Market Account', initialBalance: 1000.00 },
        'certificate_of_deposit': { name: 'Certificate of Deposit', initialBalance: 5000.00 },
        'retirement_ira': { name: 'IRA Account', initialBalance: 0.00 },
        'joint_checking': { name: 'Joint Checking', initialBalance: 100.00 },
        'trust_account': { name: 'Trust Account', initialBalance: 10000.00 },
        'investment_brokerage': { name: 'Investment Account', initialBalance: 2500.00 },
        'high_yield_savings': { name: 'High-Yield Savings', initialBalance: 500.00 },
        'international_checking': { name: 'International Checking', initialBalance: 100.00 },
        'foreign_currency': { name: 'Foreign Currency Account', initialBalance: 0.00 },
        'cryptocurrency_wallet': { name: 'Crypto Wallet', initialBalance: 0.00 },
        'loan_repayment': { name: 'Loan Repayment Account', initialBalance: 0.00 },
        'mortgage': { name: 'Mortgage Account', initialBalance: 0.00 },
        'auto_loan': { name: 'Auto Loan Account', initialBalance: 0.00 },
        'credit_card': { name: 'Credit Card Account', initialBalance: 0.00 },
        'prepaid_card': { name: 'Prepaid Card', initialBalance: 50.00 },
        'payroll_account': { name: 'Payroll Account', initialBalance: 0.00 },
        'nonprofit_charity': { name: 'Nonprofit Account', initialBalance: 100.00 },
        'escrow_account': { name: 'Escrow Account', initialBalance: 0.00 }
      };

      const config = accountTypeConfig[accountType] || { name: 'Standard Account', initialBalance: 0.00 };

      // Generate unique 10-digit account number
      const accountNumber = Array.from({length: 10}, () => Math.floor(Math.random() * 10)).join('');

      return {
        application_id: application.id,
        account_number: accountNumber,
        account_type: accountType,
        account_name: config.name,
        balance: config.initialBalance,
        status: 'active',
        routing_number: '075915826',
        created_at: new Date().toISOString()
      };
    });

    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .insert(accountsData)
      .select();

    if (accountsError) {
      console.error('Accounts creation error:', accountsError);
      return res.status(500).json({ error: 'Failed to create account records' });
    }

    // 4. Create Supabase Auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        application_id: application.id,
        admin_created: true
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return res.status(500).json({ error: 'Failed to create authentication account' });
    }

    // 5. Create profile record
    try {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authUser.user.id,
          email: email.toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          middle_name: middleName,
          phone: phone,
          date_of_birth: dateOfBirth,
          country: country,
          address: address,
          city: city,
          state: state,
          zip_code: zipCode,
          application_id: application.id,
          created_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail the whole process for profile creation
      }
    } catch (profileError) {
      console.error('Profile creation failed:', profileError);
    }

    // 6. Link accounts to auth user
    const { error: linkError } = await supabaseAdmin
      .from('accounts')
      .update({ user_id: authUser.user.id })
      .eq('application_id', application.id);

    if (linkError) {
      console.error('Account linking error:', linkError);
      // Don't fail for this error
    }

    // 7. Send welcome email if requested
    let emailSent = false;
    if (sendEnrollmentEmail) {
      try {
        const emailResponse = await fetch(`${req.headers.origin}/api/send-welcome-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            application_id: application.id,
            send_enrollment: true
          })
        });

        if (emailResponse.ok) {
          emailSent = true;
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
    }

    // 8. Success response
    res.status(201).json({
      message: 'User account created successfully',
      userId: authUser.user.id,
      user: {
        id: application.id,
        auth_id: authUser.user.id,
        email: email,
        name: `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`,
        application_status: 'approved',
        created_by_admin: true
      },
      accounts: accounts.map(acc => ({
        account_number: acc.account_number,
        account_type: acc.account_type,
        account_name: acc.account_name,
        balance: acc.balance
      })),
      email_sent: emailSent
    });

  } catch (error) {
    console.error('Admin user creation error:', error);
    res.status(500).json({ error: 'Internal server error during user creation' });
  }
}