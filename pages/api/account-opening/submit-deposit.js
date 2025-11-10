
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      applicationId,
      accountId,
      cryptoAssetId,
      assignedWalletId,
      amount,
      txHash,
      memo
    } = req.body;

    // Validate required fields
    if (!userId || !applicationId || !accountId || !assignedWalletId || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, applicationId, accountId, assignedWalletId, amount' 
      });
    }

    // Verify the account exists and is in pending_funding status
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.status !== 'pending_funding') {
      return res.status(400).json({ 
        error: `Account status is ${account.status}. Expected pending_funding.` 
      });
    }

    // Create the deposit record in account_opening_crypto_deposits table
    const { data: deposit, error: depositError } = await supabaseAdmin
      .from('account_opening_crypto_deposits')
      .insert({
        user_id: userId,
        application_id: applicationId,
        account_id: accountId,
        crypto_asset_id: cryptoAssetId,
        assigned_wallet_id: assignedWalletId,
        amount: parseFloat(amount),
        tx_hash: txHash || null,
        memo: memo || null,
        status: 'pending',
        confirmations: 0,
        required_confirmations: 3
      })
      .select()
      .single();

    if (depositError) {
      console.error('Error creating deposit:', depositError);
      return res.status(500).json({ 
        error: 'Failed to create deposit record',
        details: depositError.message 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Deposit submitted successfully',
      deposit
    });

  } catch (error) {
    console.error('Error in submit-deposit:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
