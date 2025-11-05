
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { applicationId, rejectionReason } = req.body;

  if (!applicationId) {
    return res.status(400).json({ error: 'Application ID is required' });
  }

  if (!rejectionReason || rejectionReason.trim() === '') {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  try {
    // 1. Fetch the application to get user details
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('Application fetch error:', appError);
      return res.status(404).json({ error: 'Application not found' });
    }

    // 2. Log the rejection in audit logs before deletion
    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: application.user_id,
        action: 'application_rejected',
        table_name: 'applications',
        old_data: {
          ...application,
          rejection_reason: rejectionReason
        },
        new_data: null
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
      // Continue even if audit logging fails
    }

    // 3. Send rejection email to applicant
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'theoaklinebank.com';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

      const emailResponse = await fetch(`${siteUrl}/api/send-rejection-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: application.email,
          first_name: application.first_name,
          last_name: application.last_name,
          rejection_reason: rejectionReason
        })
      });

      if (!emailResponse.ok) {
        console.error('Failed to send rejection email');
      } else {
        console.log('Rejection email sent successfully');
      }
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError);
      // Continue even if email fails
    }

    // 4. Delete the application from the database
    const { error: deleteError } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('id', applicationId);

    if (deleteError) {
      console.error('Application deletion error:', deleteError);
      return res.status(500).json({ 
        error: 'Failed to delete application', 
        details: deleteError.message 
      });
    }

    console.log(`Application ${applicationId} rejected and deleted. Reason: ${rejectionReason}`);

    return res.status(200).json({
      success: true,
      message: 'Application rejected and removed from database',
      data: {
        applicationId,
        email: application.email,
        rejectionReason
      }
    });

  } catch (error) {
    console.error('Unexpected error during application rejection:', error);
    return res.status(500).json({ 
      error: 'Internal server error during application rejection',
      details: error.message 
    });
  }
}
