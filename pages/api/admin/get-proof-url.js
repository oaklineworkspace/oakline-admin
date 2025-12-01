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

  const { proofPath, isLoanDeposit } = req.body;

  if (!proofPath) {
    return res.status(400).json({ error: 'Proof path is required' });
  }

  try {
    const storageBucket = isLoanDeposit ? 'documents' : 'crypto-deposit-proofs';

    console.log('Getting proof URL from bucket:', storageBucket);
    console.log('With path:', proofPath);

    const { data, error } = await supabaseAdmin
      .storage
      .from(storageBucket)
      .createSignedUrl(proofPath, 3600);

    if (error) {
      console.error('Error creating signed URL:', error);
      return res.status(400).json({ 
        error: 'Failed to load proof',
        details: error.message 
      });
    }

    return res.status(200).json({ 
      success: true,
      url: data.signedUrl
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
