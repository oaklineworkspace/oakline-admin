
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { applicationId, applicantName, applicantEmail } = req.body;

    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    // Fetch application details if not provided
    let applicationData;
    if (!applicantName || !applicantEmail) {
      const { data, error } = await supabaseAdmin
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Application not found' });
      }
      applicationData = data;
    } else {
      applicationData = {
        id: applicationId,
        first_name: applicantName?.split(' ')[0] || 'New',
        last_name: applicantName?.split(' ')[1] || 'Applicant',
        email: applicantEmail
      };
    }

    // Send admin notification email
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🔔 New Application Submitted</h1>
            <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank Admin Alert</p>
          </div>
          
          <div style="padding: 40px 32px;">
            <h2 style="color: #1e40af; font-size: 24px; font-weight: 700; margin: 0 0 24px 0;">
              A new application requires your attention
            </h2>
            
            <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0;">
              <p style="color: #1e40af; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
                Applicant Details:
              </p>
              <p style="color: #4a5568; font-size: 14px; margin: 4px 0;">
                <strong>Name:</strong> ${applicationData.first_name} ${applicationData.last_name}
              </p>
              <p style="color: #4a5568; font-size: 14px; margin: 4px 0;">
                <strong>Email:</strong> ${applicationData.email}
              </p>
              <p style="color: #4a5568; font-size: 14px; margin: 4px 0;">
                <strong>Application ID:</strong> ${applicationData.id}
              </p>
              <p style="color: #4a5568; font-size: 14px; margin: 4px 0;">
                <strong>Submitted:</strong> ${new Date().toLocaleString()}
              </p>
            </div>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://oakline-controller.theoaklinebank/admin/approve-applications" style="display: inline-block; background-color: #1e40af; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Review Application
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0;">
              Please log in to the admin portal to review and process this application.
            </p>
          </div>
          
          <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br/>
              Member FDIC | Routing: 075915826
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: 'info@theoaklinebank.com',
      subject: `🔔 New Application: ${applicationData.first_name} ${applicationData.last_name}`,
      html: adminEmailHtml,
      type: EMAIL_TYPES.NOTIFY
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Admin notification sent successfully' 
    });

  } catch (error) {
    console.error('Error sending admin notification:', error);
    return res.status(500).json({ 
      error: 'Failed to send admin notification',
      details: error.message 
    });
  }
}
