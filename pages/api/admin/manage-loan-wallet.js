import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  const adminId = authResult.user.id;

  try {
    // CREATE - Add new wallet
    if (req.method === 'POST') {
      const { cryptoType, networkType, walletAddress, memo } = req.body;

      if (!cryptoType || !networkType || !walletAddress) {
        return res.status(400).json({
          error: 'Missing required fields: cryptoType, networkType, and walletAddress are required'
        });
      }

      // Validate crypto type and network type exist in crypto_assets
      const { data: cryptoAsset, error: assetError } = await supabaseAdmin
        .from('crypto_assets')
        .select('*')
        .eq('crypto_type', cryptoType)
        .eq('network_type', networkType)
        .eq('status', 'active')
        .single();

      if (assetError || !cryptoAsset) {
        return res.status(400).json({
          error: `Invalid crypto type or network combination. This asset is not supported or is disabled.`
        });
      }

      // Check if this exact crypto/network combination already exists
      // Note: Same wallet address can be used for different crypto types (e.g., BTC and USDT on BEP20)
      const { data: existing } = await supabaseAdmin
        .from('loan_crypto_wallets')
        .select('id')
        .eq('crypto_asset_id', cryptoAsset.id)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({
          error: 'A wallet already exists for this crypto type and network combination'
        });
      }

      // Insert new wallet
      const { data: wallet, error: insertError } = await supabaseAdmin
        .from('loan_crypto_wallets')
        .insert([{
          admin_id: adminId,
          crypto_asset_id: cryptoAsset.id,
          wallet_address: walletAddress.trim(),
          memo: memo || null,
          purpose: 'loan_requirement',
          status: 'active'
        }])
        .select(`
          *,
          crypto_assets (
            crypto_type,
            symbol,
            network_type
          )
        `)
        .single();

      if (insertError) {
        console.error('Error creating wallet:', insertError);
        return res.status(500).json({ error: 'Failed to create wallet' });
      }

      return res.status(201).json({
        success: true,
        message: 'Wallet added successfully',
        wallet
      });
    }

    // UPDATE - Edit existing wallet
    if (req.method === 'PUT') {
      const { walletId, cryptoType, networkType, walletAddress, memo } = req.body;

      if (!walletId) {
        return res.status(400).json({ error: 'Wallet ID is required' });
      }

      if (!cryptoType || !networkType || !walletAddress) {
        return res.status(400).json({
          error: 'Missing required fields: cryptoType, networkType, and walletAddress are required'
        });
      }

      // Validate crypto type and network type exist in crypto_assets
      const { data: cryptoAsset, error: assetError } = await supabaseAdmin
        .from('crypto_assets')
        .select('*')
        .eq('crypto_type', cryptoType)
        .eq('network_type', networkType)
        .eq('status', 'active')
        .single();

      if (assetError || !cryptoAsset) {
        return res.status(400).json({
          error: `Invalid crypto type or network combination. This asset is not supported or is disabled.`
        });
      }

      // Check if this exact crypto/network combination conflicts (excluding current wallet)
      // Same wallet address can be used for different crypto types
      const { data: existing } = await supabaseAdmin
        .from('loan_crypto_wallets')
        .select('id')
        .eq('crypto_asset_id', cryptoAsset.id)
        .neq('id', walletId)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({
          error: 'A wallet already exists for this crypto type and network combination'
        });
      }

      const { data: wallet, error: updateError } = await supabaseAdmin
        .from('loan_crypto_wallets')
        .update({
          crypto_asset_id: cryptoAsset.id,
          wallet_address: walletAddress.trim(),
          memo: memo || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletId)
        .select(`
          *,
          crypto_assets (
            crypto_type,
            symbol,
            network_type
          )
        `)
        .single();

      if (updateError) {
        console.error('Error updating wallet:', updateError);
        return res.status(500).json({ error: 'Failed to update wallet' });
      }

      return res.status(200).json({
        success: true,
        message: 'Wallet updated successfully',
        wallet
      });
    }

    // PATCH - Change wallet status (activate/deactivate)
    if (req.method === 'PATCH') {
      const { walletId, status } = req.body;

      if (!walletId || !status) {
        return res.status(400).json({ error: 'Wallet ID and status are required' });
      }

      if (!['active', 'inactive', 'archived'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be active, inactive, or archived' });
      }

      const { data: wallet, error: updateError } = await supabaseAdmin
        .from('loan_crypto_wallets')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating wallet status:', updateError);
        return res.status(500).json({ error: 'Failed to update wallet status' });
      }

      return res.status(200).json({
        success: true,
        message: `Wallet ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
        wallet
      });
    }

    // DELETE - Remove wallet
    if (req.method === 'DELETE') {
      const { walletId } = req.body;

      if (!walletId) {
        return res.status(400).json({ error: 'Wallet ID is required' });
      }

      // Check if wallet is being used by any deposits
      const { data: deposits, error: checkError } = await supabaseAdmin
        .from('crypto_deposits')
        .select('id')
        .eq('loan_wallet_id', walletId)
        .limit(1);

      if (checkError) {
        console.error('Error checking wallet usage:', checkError);
        return res.status(500).json({ error: 'Failed to verify wallet usage' });
      }

      if (deposits && deposits.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete wallet that has associated deposits. Consider deactivating it instead.'
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from('loan_crypto_wallets')
        .delete()
        .eq('id', walletId);

      if (deleteError) {
        console.error('Error deleting wallet:', deleteError);
        return res.status(500).json({ error: 'Failed to delete wallet' });
      }

      return res.status(200).json({
        success: true,
        message: 'Wallet deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error in manage-loan-wallet API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}