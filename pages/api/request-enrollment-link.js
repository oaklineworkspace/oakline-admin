
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, applicationId } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find application by email and optionally applicationId
    let query = supabaseAdmin
      .from('applications')
      .select('*')
      .eq('email', email);

    if (applicationId) {
      query = query.eq('id', applicationId);
    }

    const { data: applications, error: appError } = await query;

    if (appError || !applications || applications.length === 0) {
      return res.status(404).json({ error: 'No application found for this email' });
    }

    // Use the most recent application
    const application = applications[0];

    // Detect site URL dynamically
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    
    // Call the resend-enrollment API
    const resendResponse = await fetch(`${siteUrl}/api/resend-enrollment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: application.id,
        email: application.email,
        firstName: application.first_name,
        middleName: application.middle_name,
        lastName: application.last_name,
        country: application.country
      })
    });

    const resendResult = await resendResponse.json();

    if (resendResponse.ok) {
      res.status(200).json({
        message: 'New enrollment link sent successfully',
        email: application.email
      });
    } else {
      res.status(500).json({ error: resendResult.error || 'Failed to send enrollment link' });
    }

  } catch (error) {
    console.error('Error requesting enrollment link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
