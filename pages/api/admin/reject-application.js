import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { applicationId, rejectionReason } = req.body;

  if (!applicationId) {
    return res.status(400).json({ error: 'Application ID is required' });
  }

  try {
    // 1. Fetch the application details
    const { data: application, error: fetchError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      console.error('Application fetch error:', fetchError);
      return res.status(404).json({ error: 'Application not found' });
    }

    // 2. Send rejection email if email exists
    if (application.email) {
      try {
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

        await fetch(`${siteUrl}/api/send-rejection-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: application.email,
            firstName: application.first_name,
            lastName: application.last_name,
            rejectionReason: rejectionReason || 'Your application did not meet our current requirements.'
          })
        });

        console.log('✅ Rejection email sent to:', application.email);
      } catch (emailError) {
        console.error('❌ Failed to send rejection email:', emailError);
        // Don't fail the rejection if email fails
      }
    }

    // 3. Delete the application record (this will clear the user from the applications table)
    const { error: deleteError } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('id', applicationId);

    if (deleteError) {
      console.error('Error deleting application:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete application',
        details: deleteError.message
      });
    }

    console.log('✅ Application deleted successfully:', applicationId);

    return res.status(200).json({
      success: true,
      message: 'Application rejected and removed successfully'
    });

  } catch (error) {
    console.error('Unexpected error during application rejection:', error);
    return res.status(500).json({
      error: 'Internal server error during application rejection',
      details: error.message
    });
  }
}