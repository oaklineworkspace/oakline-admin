import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transactionId } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  try {
    // Get the session token for authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete the transaction
    const { error: deleteError } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (deleteError) {
      console.error('Error deleting transaction:', deleteError);
      return res.status(500).json({ error: 'Failed to delete transaction' });
    }

    return res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete transaction' });
  }
}