import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    // Check if user already has a pending application
    const { data: existingApplication } = await supabase
      .from('card_applications')
      .select('id')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .eq('status', 'pending')
      .single();

    if (existingApplication) {
      return res.status(400).json({ error: 'You already have a pending card application for this account' });
    }

    // Check if user already has an active card for this account
    const { data: existingCard } = await supabase
      .from('cards')
      .select('id')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .eq('status', 'active')
      .single();

    if (existingCard) {
      return res.status(400).json({ error: 'You already have an active card for this account' });
    }

    // Verify the account exists and belongs to the user
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, user_id, application_id, status')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if account belongs to user or is associated with user
    let accountBelongsToUser = false;
    
    if (account.user_id === user.id) {
      accountBelongsToUser = true;
    } else if (account.application_id) {
      // Check if user is associated with this application
      const { data: profile } = await supabase
        .from('profiles')
        .select('application_id')
        .eq('id', user.id)
        .single();
        
      if (profile && profile.application_id === account.application_id) {
        accountBelongsToUser = true;
      }
    }

    if (!accountBelongsToUser) {
      return res.status(403).json({ error: 'Account does not belong to user' });
    }

    if (account.status !== 'active') {
      return res.status(400).json({ error: 'Account must be active to apply for a card' });
    }

    // Get user profile for cardholder name
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const cardholderName = profile 
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      : user.email.split('@')[0];

    // Create the card application
    const { data: application, error: applicationError } = await supabase
      .from('card_applications')
      .insert([{
        user_id: user.id,
        account_id: accountId,
        cardholder_name: cardholderName || 'Card Holder',
        status: 'pending',
        card_type: 'debit'
      }])
      .select()
      .single();

    if (applicationError) {
      console.error('Error creating card application:', applicationError);
      return res.status(500).json({ error: 'Failed to submit card application' });
    }

    res.status(200).json({
      success: true,
      message: 'Card application submitted successfully! You will receive confirmation once approved.',
      application
    });

  } catch (error) {
    console.error('Error in apply-card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}