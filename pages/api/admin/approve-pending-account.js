import { supabaseAdmin } from '../../../lib/supabaseAdmin';

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

    // 2.5. Generate debit card for the approved account
    const generateCardNumber = () => {
      const prefix = '4'; // Visa
      let cardNumber = prefix;
      for (let i = 1; i < 16; i++) {
        cardNumber += Math.floor(Math.random() * 10);
      }
      return cardNumber;
    };

    const generateCVC = () => {
      return Math.floor(100 + Math.random() * 900).toString();
    };

    const generateExpiryDate = () => {
      const today = new Date();
      today.setFullYear(today.getFullYear() + 3);
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = String(today.getFullYear()).slice(-2);
      return `${month}/${year}`;
    };

    const cardData = {
      user_id: account.user_id,
      account_id: accountId,
      cardholder_name: `${application.first_name} ${application.last_name}`.toUpperCase(),
      card_number: generateCardNumber(),
      card_brand: 'visa',
      card_category: 'debit',
      card_type: 'debit',
      status: 'active',
      expiry_date: generateExpiryDate(),
      cvc: generateCVC(),
      daily_limit: 5000,
      monthly_limit: 20000,
      daily_spent: 0,
      monthly_spent: 0,
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
      // Don't fail the approval if card creation fails
      console.log('Account approved but card creation failed');
    } else {
      console.log('Debit card created successfully for account:', accountId);
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

    // 4. Send account approval notification email
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

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
          site_url: siteUrl,
          bank_details: bankDetails
        })
      });

      if (emailResponse.ok) {
        console.log('Account approval email sent successfully to:', application.email);
      } else {
        const errorData = await emailResponse.json();
        console.error('Failed to send account approval email:', errorData);
      }
    } catch (emailError) {
      console.error('Error sending account approval email:', emailError);
      // Don't fail the whole approval if email fails
    }

    return res.status(200).json({
      success: true,
      message: 'Account approved successfully. Debit card issued and notification email sent.',
      data: {
        accountId: updatedAccount.id,
        accountType: updatedAccount.account_type,
        accountNumber: updatedAccount.account_number,
        status: updatedAccount.status,
        cardIssued: newCard ? true : false,
        cardLastFour: newCard ? newCard.card_number.slice(-4) : null
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
