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
    // Try multiple buckets in order of likelihood
    const bucketsToTry = isLoanDeposit 
      ? ['documents', 'loan-payment-proofs', 'crypto-deposit-proofs']
      : ['loan-payment-proofs', 'crypto-deposit-proofs', 'documents'];

    console.log('Attempting to get proof URL for path:', proofPath);
    
    let signedUrl = null;
    let lastError = null;

    for (const bucket of bucketsToTry) {
      console.log('Trying bucket:', bucket);
      
      const { data, error } = await supabaseAdmin
        .storage
        .from(bucket)
        .createSignedUrl(proofPath, 3600);

      if (!error && data?.signedUrl) {
        console.log('Successfully found proof in bucket:', bucket);
        signedUrl = data.signedUrl;
        break;
      }
      
      lastError = error;
    }

    if (!signedUrl) {
      console.error('Failed to find proof in any bucket. Last error:', lastError);
      return res.status(404).json({ 
        error: 'Proof of payment not found',
        details: 'The uploaded proof image could not be located. It may have been deleted or the path is incorrect.'
      });
    }

    return res.status(200).json({ 
      success: true,
      url: signedUrl
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
