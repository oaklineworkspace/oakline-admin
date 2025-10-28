
import { createCardForAccount } from '../../../lib/cardGenerator';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accountId, adminId } = req.body;

  if (!accountId) {
    return res.status(400).json({ error: 'Account ID is required' });
  }

  try {
    const result = await createCardForAccount(accountId, adminId || null);
    
    return res.status(200).json({
      success: true,
      message: result.existing 
        ? 'Card already exists for this account' 
        : 'Card created successfully',
      data: result
    });
  } catch (error) {
    console.error('Card generation test failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Card generation failed',
      details: error.message
    });
  }
}
