
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { walletId, userId, cryptoType, networkType, walletAddress, memo } = req.body;

    if (!userId || !cryptoType || !networkType || !walletAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, cryptoType, networkType, and walletAddress are required' 
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

    const adminId = authResult.user.id;

    // Check if this exact combination already exists for this user
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('admin_assigned_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('crypto_type', cryptoType)
      .eq('network_type', networkType)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing wallet:', checkError);
      return res.status(500).json({ error: 'Failed to check existing wallet' });
    }

    if (existing) {
      // Update existing wallet assignment (wallet address, memo or admin_id might have changed)
      const { data: walletData, error: walletError } = await supabaseAdmin
        .from('admin_assigned_wallets')
        .update({ 
          wallet_address: walletAddress.trim(),
          memo: memo || null,
          admin_id: adminId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (walletError) {
        console.error('Error updating wallet:', walletError);
        return res.status(500).json({ error: 'Failed to update wallet assignment' });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Wallet assignment updated successfully',
        wallet: walletData 
      });
    } else {
      // Create new wallet assignment
      // The composite unique index allows same wallet address for different crypto types
      const { data: walletData, error: walletError } = await supabaseAdmin
        .from('admin_assigned_wallets')
        .insert([{ 
          admin_id: adminId,
          user_id: userId,
          crypto_type: cryptoType,
          network_type: networkType,
          wallet_address: walletAddress.trim(),
          memo: memo || null
        }])
        .select()
        .single();

      if (walletError) {
        console.error('Error creating wallet assignment:', walletError);
        
        // Check if error is due to duplicate combination
        if (walletError.code === '23505') {
          return res.status(400).json({ 
            error: 'This user already has a wallet assigned for this crypto type and network combination' 
          });
        }
        
        return res.status(500).json({ error: 'Failed to assign wallet address' });
      }

      return res.status(201).json({ 
        success: true, 
        message: 'Wallet address assigned successfully',
        wallet: walletData 
      });
    }

  } catch (error) {
    console.error('Error in assign-crypto-wallet API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
