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
    const { userId, cryptoType, walletAddress } = req.body;

    if (!userId || !cryptoType || !walletAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, cryptoType, and walletAddress are required' 
      });
    }

    const validCryptoTypes = ['BTC', 'USDT', 'ETH', 'BNB'];
    if (!validCryptoTypes.includes(cryptoType)) {
      return res.status(400).json({ 
        error: `Invalid crypto type. Must be one of: ${validCryptoTypes.join(', ')}` 
      });
    }

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('user_crypto_wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('crypto_type', cryptoType)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing wallet:', checkError);
      return res.status(500).json({ error: 'Failed to check existing wallet' });
    }

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('user_crypto_wallets')
        .update({ 
          wallet_address: walletAddress,
        })
        .eq('user_id', userId)
        .eq('crypto_type', cryptoType)
        .select()
        .single();

      if (error) {
        console.error('Error updating wallet:', error);
        return res.status(500).json({ error: 'Failed to update wallet address' });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Wallet address updated successfully',
        wallet: data 
      });
    } else {
      const { data, error } = await supabaseAdmin
        .from('user_crypto_wallets')
        .insert([{ 
          user_id: userId,
          crypto_type: cryptoType,
          wallet_address: walletAddress 
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating wallet:', error);
        return res.status(500).json({ error: 'Failed to create wallet address' });
      }

      return res.status(201).json({ 
        success: true, 
        message: 'Wallet address assigned successfully',
        wallet: data 
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
