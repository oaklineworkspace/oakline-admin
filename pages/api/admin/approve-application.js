import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { applicationId } = req.body;

  if (!applicationId) {
    return res.status(400).json({ error: 'Application ID is required' });
  }

  try {
    // 1. Get the application to verify it exists and is pending
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

    console.log(`Approving application for ${application.first_name} ${application.last_name} (${application.email})`);

    // 2. Update application status to 'approved' - Supabase triggers will handle the rest
    const { data: updatedApp, error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        application_status: 'approved',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateError) {
      console.error('Application update error:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update application status', 
        details: updateError.message 
      });
    }

    console.log('Application status updated to approved. Supabase triggers will handle user creation, accounts, cards, and email.');

    // 3. Wait a moment for triggers to complete, then fetch the created data
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Fetch the user_id that was set by the trigger
    const { data: approvedApp } = await supabaseAdmin
      .from('applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();

    const userId = approvedApp?.user_id;

    // 5. Fetch created accounts and cards (if any) for response
    let accountsData = [];
    let cardsData = [];

    if (userId) {
      const { data: accounts } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('user_id', userId);

      const { data: cards } = await supabaseAdmin
        .from('cards')
        .select('*')
        .eq('user_id', userId);

      accountsData = accounts || [];
      cardsData = cards || [];
    }

    return res.status(200).json({
      success: true,
      message: 'Application approved successfully. User creation, accounts, and cards are being processed by the system.',
      data: {
        userId: userId || null,
        email: application.email,
        accountsCreated: accountsData.length,
        cardsCreated: cardsData.length,
        accounts: accountsData.map(acc => ({
          id: acc.id,
          type: acc.account_type,
          number: acc.account_number,
          balance: acc.balance,
          status: acc.status
        })),
        cards: cardsData.map(card => ({
          id: card.id,
          type: card.card_type,
          lastFour: card.card_number?.slice(-4) || '****',
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