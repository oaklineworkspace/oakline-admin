import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accountId, adminId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    // Fetch the account
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*, applications(*)')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('Account fetch error:', accountError);
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if minimum deposit has been met
    const { data: deposits, error: depositsError } = await supabaseAdmin
      .from('account_opening_crypto_deposits')
      .select('*')
      .eq('account_id', accountId)
      .in('status', ['approved', 'completed']);

    if (depositsError) {
      console.error('Error fetching deposits:', depositsError);
      return res.status(500).json({ error: 'Failed to fetch deposit information' });
    }

    const totalDeposited = deposits?.reduce((sum, dep) => sum + parseFloat(dep.approved_amount || 0), 0) || 0;
    const minDeposit = parseFloat(account.min_deposit || 0);

    if (totalDeposited < minDeposit) {
      return res.status(400).json({
        error: 'Minimum deposit requirement not met',
        details: {
          required: minDeposit,
          deposited: totalDeposited,
          remaining: minDeposit - totalDeposited
        }
      });
    }

    // Update account status to active
    const { data: updatedAccount, error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({
        status: 'active',
        funding_confirmed_by: adminId,
        funding_confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating account:', updateError);
      return res.status(500).json({ error: 'Failed to activate account' });
    }

    // Send account activation email
    if (account.applications?.email) {
      try {
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

        await fetch(`${siteUrl}/api/send-account-activation-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: account.applications.email,
            firstName: account.applications.first_name,
            lastName: account.applications.last_name,
            accountNumber: account.account_number,
            accountType: account.account_type
          })
        });

        console.log('✅ Account activation email sent');
      } catch (emailError) {
        console.error('❌ Failed to send activation email:', emailError);
        // Don't fail the activation if email fails
      }
    }

    return res.status(200).json({
      success: true,
      account: updatedAccount,
      message: 'Account activated successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
