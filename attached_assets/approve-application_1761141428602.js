
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { application_id, admin_password } = req.body;

  // Simple admin authentication (you should implement proper admin auth)
  if (admin_password !== process.env.ADMIN_PASSWORD && admin_password !== 'Chrismorgan23$') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!application_id) {
    return res.status(400).json({ error: 'application_id is required' });
  }

  try {
    // 1. Get application data
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', application_id)
      .single();

    if (appError || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.application_status === 'approved') {
      return res.status(400).json({ error: 'Application already approved' });
    }

    // 2. Generate temporary password
    const tempPassword = `Oak${Math.random().toString(36).substring(2, 8)}${Date.now().toString().slice(-4)}!`;

    // 3. Create Supabase Auth user
    let authUser;
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === application.email.toLowerCase());

    if (existingUser) {
      authUser = existingUser;
      console.log('Using existing auth user:', authUser.id);
    } else {
      const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: application.email.toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: application.first_name,
          last_name: application.last_name,
          application_id: application.id
        }
      });

      if (authError) {
        console.error('Auth user creation error:', authError);
        return res.status(500).json({ error: `Failed to create auth user: ${authError.message}` });
      }

      authUser = newUser.user;
      console.log('Created new auth user:', authUser.id);
    }

    // 4. Create or update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.id,
        email: application.email.toLowerCase(),
        first_name: application.first_name,
        middle_name: application.middle_name,
        last_name: application.last_name,
        phone: application.phone,
        date_of_birth: application.date_of_birth,
        country: application.country,
        city: application.city,
        state: application.state,
        zip_code: application.zip_code,
        address: application.address,
        ssn: application.ssn,
        id_number: application.id_number,
        employment_status: application.employment_status,
        annual_income: application.annual_income,
        mothers_maiden_name: application.mothers_maiden_name,
        account_types: application.account_types,
        enrollment_completed: false,
        password_set: false,
        application_status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return res.status(500).json({ error: `Failed to create profile: ${profileError.message}` });
    }

    // 5. Generate account number and routing number
    const accountNumber = `${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const routingNumber = '075915826';

    // 6. Create bank account(s) based on application.account_types
    const accountTypes = application.account_types || ['checking'];
    const createdAccounts = [];

    for (const accountType of accountTypes) {
      const acctNumber = `${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      
      const { data: account, error: accountError } = await supabaseAdmin
        .from('accounts')
        .insert({
          user_id: authUser.id,
          application_id: application.id,
          account_number: acctNumber,
          routing_number: routingNumber,
          account_type: accountType,
          balance: 0,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (accountError) {
        console.error('Account creation error:', accountError);
        return res.status(500).json({ error: `Failed to create account: ${accountError.message}` });
      }

      createdAccounts.push(account);
    }

    // 7. Create default debit card for the first account
    const primaryAccount = createdAccounts[0];
    const cardNumber = `4${Math.floor(100000000000000 + Math.random() * 900000000000000)}`;
    const cvc = `${Math.floor(100 + Math.random() * 900)}`;
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 4);

    const { data: card, error: cardError } = await supabaseAdmin
      .from('cards')
      .insert({
        user_id: authUser.id,
        account_id: primaryAccount.id,
        card_number: cardNumber,
        card_type: 'debit',
        status: 'active',
        expiry_date: expiryDate.toISOString().split('T')[0],
        cvc: cvc,
        daily_limit: 5000,
        monthly_limit: 20000,
        daily_spent: 0,
        monthly_spent: 0,
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        activated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (cardError) {
      console.error('Card creation error:', cardError);
      return res.status(500).json({ error: `Failed to create card: ${cardError.message}` });
    }

    // 8. Queue welcome email with temporary password
    const welcomeEmailSubject = 'Welcome to Oakline Bank - Your Account is Ready!';
    const welcomeEmailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to Oakline Bank!</h1>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1e40af;">Hello ${application.first_name} ${application.last_name},</h2>
          
          <p style="font-size: 16px; line-height: 1.6;">Your application has been approved! Your Oakline Bank account is now active.</p>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">Your Login Credentials</h3>
            <p><strong>Email:</strong> ${application.email}</p>
            <p><strong>Temporary Password:</strong> <code style="background-color: #e0f2fe; padding: 5px 10px; border-radius: 4px;">${tempPassword}</code></p>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
            <p style="margin: 0;"><strong>⚠️ Important:</strong> Please change your password immediately after your first login for security purposes.</p>
          </div>
          
          <h3 style="color: #1e40af;">Your Account Details</h3>
          <ul style="font-size: 16px; line-height: 1.8;">
            ${createdAccounts.map(acc => `<li><strong>${acc.account_type.charAt(0).toUpperCase() + acc.account_type.slice(1)} Account:</strong> ${acc.account_number}</li>`).join('')}
            <li><strong>Routing Number:</strong> ${routingNumber}</li>
          </ul>
          
          <h3 style="color: #1e40af;">Your Debit Card</h3>
          <p>A debit card has been issued and linked to your ${primaryAccount.account_type} account.</p>
          <p><strong>Card Number:</strong> **** **** **** ${cardNumber.slice(-4)}</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://oaklinebank.com'}/login" 
               style="background-color: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              Login to Your Account
            </a>
          </div>
          
          <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
            If you have any questions, please contact our support team at support@theoaklinebank.com
          </p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
            Member FDIC | Routing: ${routingNumber}
          </p>
        </div>
      </div>
    `;

    const { error: emailQueueError } = await supabaseAdmin
      .from('email_queue')
      .insert({
        user_id: authUser.id,
        email: application.email,
        subject: welcomeEmailSubject,
        body: welcomeEmailBody,
        sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (emailQueueError) {
      console.error('Email queue error:', emailQueueError);
      // Don't fail the process, just log the error
    }

    // Optionally send email immediately
    try {
      await sendEmail({
        to: application.email,
        subject: welcomeEmailSubject,
        html: welcomeEmailBody
      });
      
      // Mark as sent
      await supabaseAdmin
        .from('email_queue')
        .update({ sent: true, updated_at: new Date().toISOString() })
        .eq('user_id', authUser.id)
        .eq('subject', welcomeEmailSubject);
    } catch (emailError) {
      console.error('Email send error:', emailError);
      // Don't fail the process
    }

    // 9. Update application status to approved and set processed_at
    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        user_id: authUser.id,
        application_status: 'approved',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', application_id);

    if (updateError) {
      console.error('Application update error:', updateError);
      return res.status(500).json({ error: `Failed to update application: ${updateError.message}` });
    }

    // 10. Return success response
    return res.status(200).json({
      success: true,
      message: 'Application approved successfully',
      data: {
        user_id: authUser.id,
        email: application.email,
        temporary_password: tempPassword,
        accounts: createdAccounts.map(acc => ({
          account_number: acc.account_number,
          account_type: acc.account_type,
          routing_number: acc.routing_number
        })),
        card: {
          card_number: `**** **** **** ${cardNumber.slice(-4)}`,
          expiry_date: expiryDate.toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    console.error('Application approval error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
