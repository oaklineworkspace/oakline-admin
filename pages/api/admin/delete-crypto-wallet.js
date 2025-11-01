
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { walletId } = req.body;

    if (!walletId) {
      return res.status(400).json({ 
        error: 'Missing required field: walletId' 
      });
    }

    // Get wallet details before deleting
    const { data: wallet, error: fetchError } = await supabaseAdmin
      .from('user_crypto_wallets')
      .select('user_id, crypto_type, network_type')
      .eq('id', walletId)
      .single();

    if (fetchError || !wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Delete from user_crypto_wallets
    const { error: walletError } = await supabaseAdmin
      .from('user_crypto_wallets')
      .delete()
      .eq('id', walletId);

    if (walletError) {
      console.error('Error deleting wallet:', walletError);
      return res.status(500).json({ error: 'Failed to delete wallet' });
    }

    // Delete from admin_assigned_wallets
    await supabaseAdmin
      .from('admin_assigned_wallets')
      .delete()
      .eq('user_id', wallet.user_id)
      .eq('crypto_type', wallet.crypto_type)
      .eq('network_type', wallet.network_type);

    return res.status(200).json({ 
      success: true, 
      message: 'Wallet deleted successfully'
    });

  } catch (error) {
    console.error('Error in delete-crypto-wallet API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
