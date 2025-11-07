import { supabaseAdmin } from '../../../lib/supabaseAdmin';

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
      walletAddress,
      memo,
      cryptoType,
      networkType,
      requiredAmount,
      adminId
    } = req.body;

    if (!userId || !applicationId || !accountId || !cryptoAssetId || !walletAddress || !cryptoType || !networkType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // First, create or get the admin assigned wallet
    const { data: existingWallet, error: walletCheckError } = await supabaseAdmin
      .from('admin_assigned_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('crypto_type', cryptoType)
      .eq('network_type', networkType)
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    let walletId;

    if (existingWallet) {
      walletId = existingWallet.id;
    } else {
      const { data: newWallet, error: walletError } = await supabaseAdmin
        .from('admin_assigned_wallets')
        .insert({
          admin_id: adminId,
          user_id: userId,
          crypto_type: cryptoType,
          network_type: networkType,
          wallet_address: walletAddress,
          memo: memo || null
        })
        .select()
        .single();

      if (walletError) {
        console.error('Error creating wallet:', walletError);
        return res.status(500).json({ error: 'Failed to create wallet assignment' });
      }

      walletId = newWallet.id;
    }

    // Check if deposit record already exists
    const { data: existingDeposit, error: depositCheckError } = await supabaseAdmin
      .from('account_opening_crypto_deposits')
      .select('*')
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .eq('account_id', accountId)
      .maybeSingle();

    let deposit;

    if (existingDeposit) {
      // Update existing deposit
      const { data: updatedDeposit, error: updateError } = await supabaseAdmin
        .from('account_opening_crypto_deposits')
        .update({
          crypto_asset_id: cryptoAssetId,
          assigned_wallet_id: walletId,
          required_amount: requiredAmount || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDeposit.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating deposit:', updateError);
        return res.status(500).json({ error: 'Failed to update deposit record' });
      }

      deposit = updatedDeposit;
    } else {
      // Create new deposit record
      const { data: newDeposit, error: depositError } = await supabaseAdmin
        .from('account_opening_crypto_deposits')
        .insert({
          user_id: userId,
          application_id: applicationId,
          account_id: accountId,
          crypto_asset_id: cryptoAssetId,
          assigned_wallet_id: walletId,
          required_amount: requiredAmount || 0,
          status: 'pending'
        })
        .select()
        .single();

      if (depositError) {
        console.error('Error creating deposit:', depositError);
        return res.status(500).json({ error: 'Failed to create deposit record' });
      }

      deposit = newDeposit;
    }

    return res.status(200).json({
      success: true,
      deposit,
      walletId,
      message: 'Wallet assigned successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
