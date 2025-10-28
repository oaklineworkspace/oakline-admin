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

    // 2.5. Automatically generate debit card for the approved account using secure card generator
    let cardResult = null;
    let cardCreationFailed = false;
    
    try {
      // Get admin ID from authorization header or session if available
      const adminId = req.headers['x-admin-id'] || null;
      
      cardResult = await createCardForAccount(accountId, adminId);
      console.log('Card creation result:', {
        accountId,
        cardId: cardResult.cardId,
        lastFour: cardResult.lastFour,
        existing: cardResult.existing
      });
    } catch (cardError) {
      console.error('Card creation error:', cardError);
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

    // 4. Send account approval notification email with card details
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

      console.log('Sending account approval email to:', application.email);
      if (cardResult && cardResult.success) {
        console.log('Including card details - Last 4:', cardResult.lastFour);
      }

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
        const emailResult = await emailResponse.json();
        console.log('✅ Account approval email sent successfully to:', application.email);
        console.log('Email result:', emailResult);
      } else {
        const errorData = await emailResponse.json();
        console.error('❌ Failed to send account approval email:', errorData);
        console.error('Email API status:', emailResponse.status);
      }
    } catch (emailError) {
      console.error('❌ Error sending account approval email:', emailError);
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
