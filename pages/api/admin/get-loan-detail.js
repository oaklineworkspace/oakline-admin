
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { loanId } = req.query;

  if (!loanId) {
    return res.status(400).json({ error: 'Loan ID is required' });
  }

  try {
    // Fetch loan with user profile and account details
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          first_name,
          last_name,
          phone,
          address,
          city,
          state,
          zip_code,
          employment_status,
          annual_income
        ),
        accounts:account_id (
          account_number,
          account_type,
          balance
        )
      `)
      .eq('id', loanId)
      .single();

    if (loanError) {
      console.error('Error fetching loan:', loanError);
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Fetch user ID documents
    const { data: idDocuments, error: docsError } = await supabaseAdmin
      .from('user_id_documents')
      .select('*')
      .eq('user_id', loan.user_id);

    if (docsError) {
      console.error('Error fetching ID documents:', docsError);
    }

    // Fetch collaterals
    const { data: collaterals, error: collateralError } = await supabaseAdmin
      .from('loan_collaterals')
      .select('*')
      .eq('loan_id', loanId);

    if (collateralError) {
      console.error('Error fetching collaterals:', collateralError);
    }

    // Fetch loan payments history
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Generate signed URLs for ID documents
    const documentsWithUrls = await Promise.all(
      (idDocuments || []).map(async (doc) => {
        try {
          const { data: frontData } = await supabaseAdmin.storage
            .from('id-documents')
            .createSignedUrl(doc.front_url, 3600);

          const { data: backData } = await supabaseAdmin.storage
            .from('id-documents')
            .createSignedUrl(doc.back_url, 3600);

          return {
            ...doc,
            front_signed_url: frontData?.signedUrl || null,
            back_signed_url: backData?.signedUrl || null,
          };
        } catch (err) {
          console.error('Error generating signed URLs:', err);
          return doc;
        }
      })
    );

    // Generate signed URLs for collateral photos
    const collateralsWithUrls = await Promise.all(
      (collaterals || []).map(async (collateral) => {
        try {
          const photos = collateral.photos || [];
          const signedPhotos = await Promise.all(
            photos.map(async (photoPath) => {
              const { data } = await supabaseAdmin.storage
                .from('collateral-photos')
                .createSignedUrl(photoPath, 3600);
              return {
                path: photoPath,
                signed_url: data?.signedUrl || null,
              };
            })
          );

          return {
            ...collateral,
            signed_photos: signedPhotos,
          };
        } catch (err) {
          console.error('Error generating collateral signed URLs:', err);
          return collateral;
        }
      })
    );

    // Build user name
    const profile = loan.profiles;
    const userName = profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
      : 'N/A';

    return res.status(200).json({
      loan: {
        ...loan,
        user_name: userName,
      },
      idDocuments: documentsWithUrls || [],
      collaterals: collateralsWithUrls || [],
      payments: payments || [],
    });
  } catch (error) {
    console.error('Error in get-loan-detail:', error);
    return res.status(500).json({ error: error.message });
  }
}
