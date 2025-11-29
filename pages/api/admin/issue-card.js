
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      accountId,
      cardNumber,
      cardBrand,
      cardCategory,
      cardType,
      cvc,
      expiryDate,
      dailyLimit,
      monthlyLimit
    } = req.body;

    if (!userId || !accountId || !cardNumber) {
      return res.status(400).json({ error: 'Missing required fields: userId, accountId, cardNumber' });
    }

    // Verify account exists
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id, application_id, status')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('Account verification error:', accountError);
      return res.status(400).json({ error: 'Account not found' });
    }

    // Verify account is active
    if (account.status !== 'active') {
      return res.status(400).json({ error: 'Account must be active to issue a card' });
    }

    // Verify the account belongs to the user (either directly or through application)
    let accountBelongsToUser = false;
    
    if (account.user_id === userId) {
      accountBelongsToUser = true;
    } else if (account.application_id) {
      // Check if the application belongs to this user
      const { data: application } = await supabaseAdmin
        .from('applications')
        .select('user_id')
        .eq('id', account.application_id)
        .single();
      
      if (application && application.user_id === userId) {
        accountBelongsToUser = true;
      }
    }

    if (!accountBelongsToUser) {
      return res.status(400).json({ error: 'Account does not belong to user' });
    }

    // Check if user already has a card for this account
    const { data: existingCard } = await supabaseAdmin
      .from('cards')
      .select('id')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('status', 'active')
      .single();

    if (existingCard) {
      return res.status(400).json({ error: 'User already has an active card for this account' });
    }

    // Insert the new card
    const { data: card, error: cardError } = await supabaseAdmin
      .from('cards')
      .insert({
        user_id: userId,
        account_id: accountId,
        card_number: cardNumber,
        card_brand: cardBrand || 'visa',
        card_category: cardCategory || 'debit',
        card_type: cardBrand || 'visa',
        cvc: cvc,
        expiry_date: expiryDate,
        daily_limit: parseFloat(dailyLimit) || 1000.00,
        monthly_limit: parseFloat(monthlyLimit) || 10000.00,
        status: 'active',
        is_locked: false,
        daily_spent: 0.00,
        monthly_spent: 0.00
      })
      .select()
      .single();

    if (cardError) {
      console.error('Error issuing card:', cardError);
      console.error('Card data attempted:', {
        user_id: userId,
        account_id: accountId,
        card_number: cardNumber,
        card_brand: cardBrand,
        card_category: cardCategory
      });
      return res.status(500).json({ 
        error: 'Failed to issue card', 
        details: cardError.message,
        code: cardError.code 
      });
    }

    console.log('Card issued successfully:', card.id);

    // Fetch user profile for email notification
    try {
      const { data: authUser, error: userError } = await supabaseAdmin
        .auth.admin.getUserById(userId);

      if (!userError && authUser?.user?.email) {
        const { data: userProfile } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();

        const userEmail = authUser.user.email;
        const firstName = userProfile?.first_name || '';
        const lastName = userProfile?.last_name || '';
        const cardLastFour = cardNumber.slice(-4);

        // Send email notification asynchronously (don't wait for it)
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5000'}/api/email/send-card-issued-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            firstName,
            lastName,
            cardBrand: cardBrand || 'visa',
            cardCategory: cardCategory || 'debit',
            accountNumber,
            cardLastFour,
            expiryDate,
            dailyLimit: parseFloat(dailyLimit) || 1000.00,
            monthlyLimit: parseFloat(monthlyLimit) || 10000.00
          })
        }).catch(err => console.error('Error sending card issuance email:', err));
      }
    } catch (emailError) {
      console.error('Error in email notification process:', emailError);
      // Don't fail the card issuance if email fails
    }

    return res.status(200).json({
      success: true,
      message: 'Card issued successfully',
      card: card
    });

  } catch (error) {
    console.error('Error in issue-card:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
