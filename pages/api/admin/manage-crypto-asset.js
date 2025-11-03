
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    // CREATE - Add new crypto asset
    if (req.method === 'POST') {
      const { 
        cryptoType, 
        symbol, 
        networkType, 
        depositFeePercent, 
        confirmationsRequired,
        minDeposit,
        decimals,
        isStablecoin
      } = req.body;

      if (!cryptoType || !symbol || !networkType) {
        return res.status(400).json({
          error: 'Missing required fields: cryptoType, symbol, and networkType are required'
        });
      }

      // Check if asset already exists
      const { data: existing } = await supabaseAdmin
        .from('crypto_assets')
        .select('id')
        .eq('crypto_type', cryptoType)
        .eq('network_type', networkType)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({
          error: 'This crypto asset with the same network already exists'
        });
      }

      // Insert new asset
      const { data: asset, error: insertError } = await supabaseAdmin
        .from('crypto_assets')
        .insert([{
          crypto_type: cryptoType,
          symbol: symbol,
          network_type: networkType,
          deposit_fee_percent: depositFeePercent || 0.05,
          confirmations_required: confirmationsRequired || 3,
          min_deposit: minDeposit || 0.00001,
          decimals: decimals || 8,
          is_stablecoin: isStablecoin || false,
          status: 'active'
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating crypto asset:', insertError);
        return res.status(500).json({ error: 'Failed to create crypto asset' });
      }

      return res.status(201).json({
        success: true,
        message: 'Crypto asset added successfully',
        asset
      });
    }

    // UPDATE - Edit existing asset
    if (req.method === 'PUT') {
      const { 
        assetId, 
        cryptoType, 
        symbol, 
        networkType, 
        depositFeePercent, 
        confirmationsRequired,
        minDeposit,
        decimals,
        isStablecoin
      } = req.body;

      if (!assetId) {
        return res.status(400).json({ error: 'Asset ID is required' });
      }

      if (!cryptoType || !symbol || !networkType) {
        return res.status(400).json({
          error: 'Missing required fields: cryptoType, symbol, and networkType are required'
        });
      }

      // Check if new combination conflicts with existing ones (excluding current asset)
      const { data: existing } = await supabaseAdmin
        .from('crypto_assets')
        .select('id')
        .eq('crypto_type', cryptoType)
        .eq('network_type', networkType)
        .neq('id', assetId)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({
          error: 'This crypto asset with the same network already exists'
        });
      }

      const { data: asset, error: updateError } = await supabaseAdmin
        .from('crypto_assets')
        .update({
          crypto_type: cryptoType,
          symbol: symbol,
          network_type: networkType,
          deposit_fee_percent: depositFeePercent,
          confirmations_required: confirmationsRequired,
          min_deposit: minDeposit,
          decimals: decimals,
          is_stablecoin: isStablecoin
        })
        .eq('id', assetId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating crypto asset:', updateError);
        return res.status(500).json({ error: 'Failed to update crypto asset' });
      }

      return res.status(200).json({
        success: true,
        message: 'Crypto asset updated successfully',
        asset
      });
    }

    // PATCH - Change asset status (enable/disable)
    if (req.method === 'PATCH') {
      const { assetId, status } = req.body;

      if (!assetId || !status) {
        return res.status(400).json({ error: 'Asset ID and status are required' });
      }

      if (!['active', 'disabled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be active or disabled' });
      }

      const { data: asset, error: updateError } = await supabaseAdmin
        .from('crypto_assets')
        .update({ status })
        .eq('id', assetId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating asset status:', updateError);
        return res.status(500).json({ error: 'Failed to update asset status' });
      }

      return res.status(200).json({
        success: true,
        message: `Asset ${status === 'active' ? 'enabled' : 'disabled'} successfully`,
        asset
      });
    }

    // DELETE - Remove asset
    if (req.method === 'DELETE') {
      const { assetId } = req.body;

      if (!assetId) {
        return res.status(400).json({ error: 'Asset ID is required' });
      }

      // Check if asset is being used by any deposits or wallets
      const { data: deposits, error: depositCheckError } = await supabaseAdmin
        .from('crypto_deposits')
        .select('id')
        .eq('crypto_asset_id', assetId)
        .limit(1);

      if (depositCheckError) {
        console.error('Error checking asset usage:', depositCheckError);
        return res.status(500).json({ error: 'Failed to verify asset usage' });
      }

      if (deposits && deposits.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete asset that has associated deposits. Consider disabling it instead.'
        });
      }

      const { data: wallets, error: walletCheckError } = await supabaseAdmin
        .from('loan_crypto_wallets')
        .select('id')
        .eq('crypto_asset_id', assetId)
        .limit(1);

      if (walletCheckError) {
        console.error('Error checking wallet usage:', walletCheckError);
        return res.status(500).json({ error: 'Failed to verify wallet usage' });
      }

      if (wallets && wallets.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete asset that has associated wallets. Consider disabling it instead.'
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from('crypto_assets')
        .delete()
        .eq('id', assetId);

      if (deleteError) {
        console.error('Error deleting crypto asset:', deleteError);
        return res.status(500).json({ error: 'Failed to delete crypto asset' });
      }

      return res.status(200).json({
        success: true,
        message: 'Crypto asset deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error in manage-crypto-asset API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
