
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  const adminId = authResult.user.id;

  try {
    // POST - Add new wallet
    if (req.method === 'POST') {
      const { cryptoAssetId, walletAddress, memo } = req.body;

      if (!cryptoAssetId || !walletAddress) {
        return res.status(400).json({ 
          error: 'Missing required fields: cryptoAssetId and walletAddress are required' 
        });
      }

      // Get crypto asset details
      const { data: cryptoAsset, error: assetError } = await supabaseAdmin
        .from('crypto_assets')
        .select('*')
        .eq('id', cryptoAssetId)
        .eq('status', 'active')
        .single();

      if (assetError || !cryptoAsset) {
        return res.status(400).json({ 
          error: 'Invalid crypto asset or asset is disabled' 
        });
      }

      // Check if wallet address already exists
      const { data: existingAddress, error: checkError } = await supabaseAdmin
        .from('admin_assigned_wallets')
        .select('*')
        .eq('wallet_address', walletAddress.trim())
        .maybeSingle();

      if (existingAddress) {
        return res.status(400).json({ 
          error: 'This wallet address is already registered' 
        });
      }

      // Check if crypto type + network type combination already exists for account opening wallets
      console.log('[POST] Checking for existing combo:', {
        crypto_type: cryptoAsset.crypto_type,
        network_type: cryptoAsset.network_type
      });
      
      const { data: existingCombo, error: comboError } = await supabaseAdmin
        .from('admin_assigned_wallets')
        .select('*')
        .eq('crypto_type', cryptoAsset.crypto_type)
        .eq('network_type', cryptoAsset.network_type)
        .is('user_id', null)
        .maybeSingle();

      console.log('[POST] Existing combo check result:', { existingCombo, comboError });

      if (existingCombo) {
        console.log('[POST] Duplicate found:', existingCombo);
        return res.status(400).json({ 
          error: `An account opening wallet already exists for ${cryptoAsset.crypto_type} on ${cryptoAsset.network_type} network. Please edit the existing wallet instead of creating a new one.` 
        });
      }

      // Create new wallet with crypto_asset_id stored in metadata for reference
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('admin_assigned_wallets')
        .insert({
          admin_id: adminId,
          user_id: null, // Not assigned to specific user yet
          crypto_type: cryptoAsset.crypto_type,
          network_type: cryptoAsset.network_type,
          wallet_address: walletAddress.trim(),
          memo: memo || null
        })
        .select()
        .single();

      if (walletError) {
        console.error('Error creating wallet:', walletError);
        return res.status(500).json({ 
          error: 'Failed to create wallet',
          details: walletError.message,
          code: walletError.code
        });
      }

      return res.status(201).json({ 
        success: true, 
        message: 'Wallet added successfully',
        wallet 
      });
    }

    // PUT - Update existing wallet
    if (req.method === 'PUT') {
      const { walletId, cryptoAssetId, walletAddress, memo } = req.body;

      if (!walletId || !cryptoAssetId || !walletAddress) {
        return res.status(400).json({ 
          error: 'Missing required fields: walletId, cryptoAssetId, and walletAddress are required' 
        });
      }

      // Get crypto asset details
      const { data: cryptoAsset, error: assetError } = await supabaseAdmin
        .from('crypto_assets')
        .select('*')
        .eq('id', cryptoAssetId)
        .eq('status', 'active')
        .single();

      if (assetError || !cryptoAsset) {
        return res.status(400).json({ 
          error: 'Invalid crypto asset or asset is disabled' 
        });
      }

      // Check if crypto type + network type combination already exists for a different wallet
      const { data: existingCombo, error: comboError } = await supabaseAdmin
        .from('admin_assigned_wallets')
        .select('*')
        .eq('crypto_type', cryptoAsset.crypto_type)
        .eq('network_type', cryptoAsset.network_type)
        .is('user_id', null)
        .neq('id', walletId)
        .maybeSingle();

      if (existingCombo) {
        return res.status(400).json({ 
          error: `An account opening wallet already exists for ${cryptoAsset.crypto_type} on ${cryptoAsset.network_type} network. Cannot change to this crypto/network combination.` 
        });
      }

      // Update wallet
      const { data: wallet, error: updateError } = await supabaseAdmin
        .from('admin_assigned_wallets')
        .update({
          crypto_type: cryptoAsset.crypto_type,
          network_type: cryptoAsset.network_type,
          wallet_address: walletAddress.trim(),
          memo: memo || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletId)
        .select()
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

    // DELETE - Delete wallet
    if (req.method === 'DELETE') {
      const { walletId } = req.body;

      if (!walletId) {
        return res.status(400).json({ error: 'Wallet ID is required' });
      }

      // Check if wallet is in use
      const { data: deposits, error: depositCheckError } = await supabaseAdmin
        .from('account_opening_crypto_deposits')
        .select('id')
        .eq('assigned_wallet_id', walletId)
        .limit(1);

      if (deposits && deposits.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete wallet that is assigned to deposits' 
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from('admin_assigned_wallets')
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
    console.error('Error in manage-account-opening-wallet:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
