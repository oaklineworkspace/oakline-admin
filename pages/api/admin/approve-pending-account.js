
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

function generateCardNumber() {
  const prefix = '4532';
  const part1 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const part2 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const part3 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${part1}${part2}${part3}`;
}

function generateCVC() {
  return Math.floor(Math.random() * 900 + 100).toString();
}

function generateExpiryDate() {
  const today = new Date();
  const expiryDate = new Date(today.getFullYear() + 4, today.getMonth(), 1);
  return expiryDate.toISOString().split('T')[0];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accountId } = req.body;

  if (!accountId) {
    return res.status(400).json({ error: 'Account ID is required' });
  }

  try {
    // 1. Get account details
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.status === 'active') {
      return res.status(400).json({ error: 'Account is already active' });
    }

    if (account.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending accounts can be approved' });
    }

    // 2. Update account status to active
    const { error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    if (updateError) {
      console.error('Account update error:', updateError);
      return res.status(500).json({ error: 'Failed to update account status' });
    }

    // 3. Create debit card for the account
    let cardNumber;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      cardNumber = generateCardNumber();
      const { data: existing } = await supabaseAdmin
        .from('cards')
        .select('id')
        .eq('card_number', cardNumber)
        .maybeSingle();

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate unique card number' });
    }

    const { data: newCard, error: cardError } = await supabaseAdmin
      .from('cards')
      .insert({
        user_id: account.user_id,
        account_id: accountId,
        card_number: cardNumber,
        card_type: 'debit',
        status: 'active',
        expiry_date: generateExpiryDate(),
        cvc: generateCVC(),
        daily_limit: 5000,
        monthly_limit: 20000,
        daily_spent: 0,
        monthly_spent: 0,
        is_locked: false,
      })
      .select()
      .single();

    if (cardError) {
      console.error('Card creation error:', cardError);
      return res.status(500).json({ error: 'Account approved but card creation failed' });
    }

    return res.status(200).json({
      success: true,
      message: 'Account approved and debit card created successfully',
      data: {
        account: {
          id: account.id,
          account_number: account.account_number,
          account_type: account.account_type,
          account_name: account.account_name,
          status: 'active',
          balance: account.balance,
        },
        card: {
          id: newCard.id,
          card_number: `****${newCard.card_number.slice(-4)}`,
          card_type: newCard.card_type,
          expiry_date: newCard.expiry_date,
          status: newCard.status,
        }
      }
    });

  } catch (error) {
    console.error('Error approving pending account:', error);
    return res.status(500).json({
      error: 'Failed to approve account',
      details: error.message || 'Unknown error occurred',
    });
  }
}
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
      .select('*, profiles(*)')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('Account fetch error:', accountError);
      return res.status(404).json({ error: 'Account not found', details: accountError?.message });
    }

    if (account.status !== 'pending') {
      return res.status(400).json({ error: 'Account is not in pending status' });
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
          email: account.profiles.email,
          first_name: account.profiles.first_name,
          last_name: account.profiles.last_name,
          account_type: account.account_type,
          account_number: account.account_number,
          routing_number: account.routing_number,
          site_url: siteUrl,
          bank_details: bankDetails
        })
      });

      if (emailResponse.ok) {
        console.log('Account approval email sent successfully to:', account.profiles.email);
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
      message: 'Account approved successfully. Notification email sent.',
      data: {
        accountId: updatedAccount.id,
        accountType: updatedAccount.account_type,
        accountNumber: updatedAccount.account_number,
        status: updatedAccount.status
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
