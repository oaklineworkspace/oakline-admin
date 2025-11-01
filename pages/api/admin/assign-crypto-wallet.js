
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
    const { walletId, userId, cryptoType, networkType, walletAddress } = req.body;

    if (!userId || !cryptoType || !networkType || !walletAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, cryptoType, networkType, and walletAddress are required' 
      });
    }

    const validCryptoTypes = ['BTC', 'USDT', 'ETH', 'BNB', 'SOL', 'TON'];
    if (!validCryptoTypes.includes(cryptoType)) {
      return res.status(400).json({ 
        error: `Invalid crypto type. Must be one of: ${validCryptoTypes.join(', ')}` 
      });
    }

    const adminId = authResult.user.id;

    // If walletId is provided, we're updating an existing wallet
    if (walletId) {
      // Get the old wallet data to update admin_assigned_wallets properly
      const { data: oldWallet } = await supabaseAdmin
        .from('user_crypto_wallets')
        .select('crypto_type, network_type')
        .eq('id', walletId)
        .single();

      // Update existing wallet by ID
      const { data: walletData, error: walletError } = await supabaseAdmin
        .from('user_crypto_wallets')
        .update({ 
          crypto_type: cryptoType,
          network_type: networkType,
          wallet_address: walletAddress,
          assigned_by: adminId,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletId)
        .select()
        .single();

      if (walletError) {
        console.error('Error updating wallet:', walletError);
        return res.status(500).json({ error: 'Failed to update wallet address' });
      }

      // Delete old admin_assigned_wallets entry if crypto/network changed
      if (oldWallet) {
        await supabaseAdmin
          .from('admin_assigned_wallets')
          .delete()
          .eq('user_id', userId)
          .eq('crypto_type', oldWallet.crypto_type)
          .eq('network_type', oldWallet.network_type);
      }

      // Insert new admin_assigned_wallets entry
      await supabaseAdmin
        .from('admin_assigned_wallets')
        .insert({
          admin_id: adminId,
          user_id: userId,
          crypto_type: cryptoType,
          network_type: networkType,
          wallet_address: walletAddress
        });

      return res.status(200).json({ 
        success: true, 
        message: 'Wallet address updated successfully',
        wallet: walletData 
      });
    }

    // Check if wallet already exists for this user/crypto/network combination
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('user_crypto_wallets')
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
      // Update existing wallet
      const { data: walletData, error: walletError } = await supabaseAdmin
        .from('user_crypto_wallets')
        .update({ 
          wallet_address: walletAddress,
          assigned_by: adminId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (walletError) {
        console.error('Error updating wallet:', walletError);
        return res.status(500).json({ error: 'Failed to update wallet address' });
      }

      // Update admin_assigned_wallets
      const { data: adminWallet } = await supabaseAdmin
        .from('admin_assigned_wallets')
        .select('id')
        .eq('user_id', userId)
        .eq('crypto_type', cryptoType)
        .eq('network_type', networkType)
        .maybeSingle();

      if (adminWallet) {
        await supabaseAdmin
          .from('admin_assigned_wallets')
          .update({
            admin_id: adminId,
            wallet_address: walletAddress,
            updated_at: new Date().toISOString()
          })
          .eq('id', adminWallet.id);
      } else {
        await supabaseAdmin
          .from('admin_assigned_wallets')
          .insert({
            admin_id: adminId,
            user_id: userId,
            crypto_type: cryptoType,
            network_type: networkType,
            wallet_address: walletAddress
          });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Wallet address updated successfully',
        wallet: walletData 
      });
    } else {
      // Create new wallet
      const { data: walletData, error: walletError } = await supabaseAdmin
        .from('user_crypto_wallets')
        .insert([{ 
          user_id: userId,
          crypto_type: cryptoType,
          network_type: networkType,
          wallet_address: walletAddress,
          assigned_by: adminId
        }])
        .select()
        .single();

      if (walletError) {
        console.error('Error creating wallet:', walletError);
        return res.status(500).json({ error: 'Failed to create wallet address' });
      }

      // Insert into admin_assigned_wallets
      const { error: adminWalletError } = await supabaseAdmin
        .from('admin_assigned_wallets')
        .insert([{
          admin_id: adminId,
          user_id: userId,
          crypto_type: cryptoType,
          network_type: networkType,
          wallet_address: walletAddress
        }]);

      if (adminWalletError) {
        console.error('Error creating admin_assigned_wallets:', adminWalletError);
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
