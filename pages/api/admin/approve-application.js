import { supabaseAdmin } from '../../../lib/supabaseAdmin';

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
    // Fetch the application
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

    // Check if user_id exists (should be set when auth user is created)
    if (!application.user_id) {
      return res.status(400).json({ 
        error: 'No user_id found in application. Please ensure auth user is created first.',
        details: 'The application must have a user_id before approval.'
      });
    }

    console.log(`Approving application ${applicationId} for user ${application.user_id}`);

    // Prepare update data
    const updateData = {
      application_status: 'approved',
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add manual account number if provided (only for first account)
    if (accountNumberMode === 'manual' && manualAccountNumbers) {
      const firstAccountType = (application.account_types && application.account_types[0]) || 'checking_account';
      if (manualAccountNumbers[firstAccountType]) {
        updateData.manual_account_number = manualAccountNumbers[firstAccountType];
      }
    }

    // Update application status to 'approved' - this triggers the Supabase function
    const { data: updatedApp, error: updateError } = await supabaseAdmin
      .from('applications')
      .update(updateData)
      .eq('id', applicationId)
      .select()
      .single();

    if (updateError) {
      console.error('Application update error:', updateError);
      return res.status(500).json({ 
        error: 'Failed to approve application', 
        details: updateError.message 
      });
    }

    console.log('Application status updated to approved - trigger will handle account/card creation');

    // Wait a moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Fetch created accounts and cards to return to admin
    const { data: createdAccounts } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('application_id', applicationId);

    const { data: createdCards } = await supabaseAdmin
      .from('cards')
      .select('*')
      .eq('user_id', application.user_id);

    // Send enrollment email with login link
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'theoaklinebank.com';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

      const accountNumbers = (createdAccounts || []).map(acc => acc.account_number);
      const accountTypes = (createdAccounts || []).map(acc => acc.account_type);

      const enrollmentResponse = await fetch(`${siteUrl}/api/send-welcome-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: application.email,
          first_name: application.first_name,
          middle_name: application.middle_name || '',
          last_name: application.last_name,
          account_numbers: accountNumbers,
          account_types: accountTypes,
          application_id: applicationId,
          country: application.country || 'US',
          site_url: siteUrl
        })
      });

      if (enrollmentResponse.ok) {
        console.log('Enrollment email sent successfully to:', application.email);
      } else {
        const errorData = await enrollmentResponse.json();
        console.error('Failed to send enrollment email:', errorData);
      }
    } catch (emailError) {
      console.error('Error sending enrollment email:', emailError);
      // Don't fail the whole approval if email fails
    }

    return res.status(200).json({
      success: true,
      message: 'Application approved successfully. Enrollment email sent with login instructions.',
      data: {
        userId: application.user_id,
        email: application.email,
        accountsCreated: createdAccounts?.length || 0,
        cardsCreated: createdCards?.length || 0,
        accounts: (createdAccounts || []).map(acc => ({
          id: acc.id,
          type: acc.account_type,
          number: acc.account_number,
          balance: acc.balance,
          status: acc.status
        })),
        cards: (createdCards || []).map(card => ({
          id: card.id,
          type: card.card_category,
          brand: card.card_brand,
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