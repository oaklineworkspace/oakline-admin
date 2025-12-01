
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
    // Fetch loan
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError) {
      console.error('Error fetching loan:', loanError);
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Fetch profile separately
    let userProfile = null;
    if (loan.user_id) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id, email, first_name, last_name, phone, address, city, state, zip_code, employment_status, annual_income')
        .eq('id', loan.user_id)
        .single();
      userProfile = profileData;
    }

    // Fetch account separately
    let accountData = null;
    if (loan.account_id) {
      const { data: acctData } = await supabaseAdmin
        .from('accounts')
        .select('account_number, account_type, balance')
        .eq('id', loan.account_id)
        .single();
      accountData = acctData;
    }

    // Add profile and account to loan object
    loan.profiles = userProfile;
    loan.accounts = accountData;

    // Fetch user ID documents from user_id_documents table
    const { data: userIdDocs, error: userDocsError } = await supabaseAdmin
      .from('user_id_documents')
      .select('*')
      .eq('user_id', loan.user_id);

    if (userDocsError) {
      console.error('Error fetching user ID documents:', userDocsError);
    }

    // Also fetch loan application documents from applications table
    const { data: applicationDocs, error: appDocsError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('user_id', loan.user_id)
      .not('id_front_path', 'is', null);

    if (appDocsError) {
      console.error('Error fetching application documents:', appDocsError);
    }

    // Combine both document sources
    const idDocuments = [...(userIdDocs || [])];
    
    // Add application documents if not already in user_id_documents
    if (applicationDocs && applicationDocs.length > 0) {
      for (const appDoc of applicationDocs) {
        // Check if this application is already in user_id_documents
        const exists = userIdDocs?.some(doc => doc.application_id === appDoc.id);
        if (!exists) {
          idDocuments.push({
            id: appDoc.id,
            user_id: appDoc.user_id,
            application_id: appDoc.id,
            document_type: 'ID Card',
            front_url: appDoc.id_front_path,
            back_url: appDoc.id_back_path,
            status: appDoc.application_status === 'approved' ? 'verified' : appDoc.application_status === 'rejected' ? 'rejected' : 'pending',
            verified_at: appDoc.processed_at,
            rejection_reason: appDoc.rejection_reason,
            created_at: appDoc.submitted_at,
            updated_at: appDoc.updated_at,
            source: 'applications'
          });
        }
      }
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
          // Determine which storage bucket to use based on source
          const storageBucket = doc.source === 'applications' ? 'documents' : 'id-documents';
          
          const { data: frontData } = await supabaseAdmin.storage
            .from(storageBucket)
            .createSignedUrl(doc.front_url, 3600);

          let backData = null;
          if (doc.back_url) {
            const backResult = await supabaseAdmin.storage
              .from(storageBucket)
              .createSignedUrl(doc.back_url, 3600);
            backData = backResult.data;
          }

          return {
            ...doc,
            front_signed_url: frontData?.signedUrl || null,
            back_signed_url: backData?.signedUrl || null,
          };
        } catch (err) {
          console.error('Error generating signed URLs for document:', err);
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
