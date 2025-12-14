import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { createCardForAccount } from '../../../lib/cardGenerator';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accountId } = req.body;

  if (!accountId) {
    return res.status(400).json({ error: 'Account ID is required' });
  }

  try {
    // 1. Fetch the pending account
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('Account fetch error:', accountError);
      return res.status(404).json({ error: 'Account not found', details: accountError?.message });
    }

    if (account.status !== 'pending') {
      return res.status(400).json({ error: 'Account is not in pending status' });
    }

    if (!account.application_id) {
      console.error('Account missing application_id:', accountId);
      return res.status(422).json({ 
        error: 'Account is not linked to an application. Cannot send approval email.',
        details: 'The account must have an application_id to retrieve applicant information.'
      });
    }

    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('email, first_name, last_name')
      .eq('id', account.application_id)
      .single();

    if (appError || !application) {
      console.error('Application fetch error for account:', accountId, appError);
      return res.status(422).json({ 
        error: 'Unable to retrieve application details for this account.',
        details: appError?.message || 'Application not found'
      });
    }

    if (!application.email?.trim() || !application.first_name?.trim() || !application.last_name?.trim()) {
      console.error('Application has incomplete data:', account.application_id);
      return res.status(422).json({ 
        error: 'Application is missing required contact information.',
        details: 'Email, first name, and last name must all be provided.'
      });
    }

    // 2. Update account status to active
    const { data: updatedAccount, error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .select()
      .single();

    if (updateError) {
      console.error('Account update error:', updateError);
      return res.status(500).json({ error: 'Failed to approve account', details: updateError.message });
    }

    // 2.5. Automatically generate debit card for the approved account
    let cardResult = null;
    let cardCreationFailed = false;
    
    try {
      // Get admin ID from authorization header or session if available
      const adminId = req.headers['x-admin-id'] || null;
      
      console.log('🔄 Starting card generation for account:', accountId);
      cardResult = await createCardForAccount(accountId, adminId);
      console.log('✅ Card creation successful:', {
        accountId,
        cardId: cardResult.cardId,
        lastFour: cardResult.lastFour,
        brand: cardResult.brand,
        category: cardResult.category,
        existing: cardResult.existing
      });
    } catch (cardError) {
      console.error('❌ Card creation error:', cardError);
      console.error('Card error details:', {
        message: cardError.message,
        code: cardError.code,
        details: cardError.details
      });
      cardCreationFailed = true;
      
      // Log the error but don't fail the approval
      try {
        await supabaseAdmin
          .from('system_logs')
          .insert({
            level: 'error',
            category: 'card_issuance',
            message: 'Failed to create card during account approval',
            details: {
              account_id: accountId,
              error: cardError.message,
              code: cardError.code,
              stack: cardError.stack
            },
            created_at: new Date().toISOString()
          });
      } catch (logError) {
        console.error('Failed to log card creation error:', logError);
      }
    }

    // 3. Fetch bank details for email
    const { data: bankDetails, error: bankError } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    if (bankError) {
      console.error('Failed to fetch bank details:', bankError);
    }

    // 4. Fetch the user to check if they need enrollment credentials
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(account.user_id);

    let needsEnrollment = false;
    if (authUser && authUser.user) {
      // Check if user has completed enrollment (has a password set)
      const lastSignIn = authUser.user.last_sign_in_at;
      needsEnrollment = !lastSignIn; // If never signed in, they need enrollment
    }

    // 5. Send appropriate email based on enrollment status
    try {
      // Always use production domain for email links
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theoaklinebank.com';

      console.log('Sending approval notification to:', application.email);
      console.log('User needs enrollment:', needsEnrollment);
      if (cardResult && cardResult.success) {
        console.log('Including card details - Last 4:', cardResult.lastFour);
      }

      // If user needs enrollment, send credentials
      if (needsEnrollment) {
        console.log('Generating temporary password for new user');
        
        // Generate temporary password
        const generateTempPassword = () => {
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
        };

        const tempPassword = generateTempPassword();

        // Update user's password
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          account.user_id,
          { password: tempPassword }
        );

        if (passwordError) {
          console.error('Error setting temporary password:', passwordError);
        }

        const welcomeEmailResponse = await fetch(`${siteUrl}/api/send-welcome-email-with-credentials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: application.email,
            firstName: application.first_name,
            lastName: application.last_name,
            accountNumber: account.account_number,
            routingNumber: account.routing_number,
            accountType: account.account_type,
            cardNumber: cardResult ? cardResult.maskedNumber : null,
            cardExpiry: cardResult ? cardResult.expiryDate : null,
            cardBrand: cardResult ? cardResult.brand : null,
            cardCategory: cardResult ? cardResult.category : null,
            tempPassword: tempPassword,
            bankDetails: bankDetails
          })
        });

        if (welcomeEmailResponse.ok) {
          console.log('✅ Welcome email with credentials sent successfully');
        } else {
          const errorData = await welcomeEmailResponse.json();
          console.error('❌ Failed to send welcome email:', errorData);
        }
      } else {
        // User already enrolled, send regular account approval email
        console.log('Sending account approval email to existing user');
        
        const emailResponse = await fetch(`${siteUrl}/api/send-account-approval-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: application.email,
            first_name: application.first_name,
            last_name: application.last_name,
            account_type: account.account_type,
            account_number: account.account_number,
            routing_number: account.routing_number,
            card_issued: cardResult && cardResult.success ? true : false,
            card_last_four: cardResult ? cardResult.lastFour : null,
            card_brand: cardResult ? cardResult.brand : null,
            card_category: cardResult ? cardResult.category : null,
            card_expiry: cardResult ? cardResult.expiryDate : null,
            card_creation_failed: cardCreationFailed,
            site_url: siteUrl,
            bank_details: bankDetails
          })
        });

        if (emailResponse.ok) {
          console.log('✅ Account approval email sent successfully');
        } else {
          const errorData = await emailResponse.json();
          console.error('❌ Failed to send account approval email:', errorData);
        }
      }
    } catch (emailError) {
      console.error('❌ Error sending email notification:', emailError);
      console.error('Email error stack:', emailError.stack);
      // Don't fail the whole approval if email fails
    }

    return res.status(200).json({
      success: true,
      message: cardResult && cardResult.success 
        ? 'Account approved successfully. Debit card issued and notification email sent.'
        : 'Account approved successfully. Card issuance pending.',
      data: {
        accountId: updatedAccount.id,
        accountType: updatedAccount.account_type,
        accountNumber: updatedAccount.account_number,
        status: updatedAccount.status,
        cardIssued: cardResult && cardResult.success ? true : false,
        cardLastFour: cardResult ? cardResult.lastFour : null,
        cardMaskedNumber: cardResult ? cardResult.maskedNumber : null,
        cardBrand: cardResult ? cardResult.brand : null,
        cardCategory: cardResult ? cardResult.category : null,
        cardExpiryDate: cardResult ? cardResult.expiryDate : null,
        cardCreationFailed: cardCreationFailed
      }
    });

  } catch (error) {
    console.error('Unexpected error during account approval:', error);
    return res.status(500).json({ 
      error: 'Internal server error during account approval',
      details: error.message 
    });
  }
}
