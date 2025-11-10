
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, first_name, last_name, rejection_reason } = req.body;

  if (!email || !first_name || !rejection_reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Fetch bank details for email
    const { data: bankDetails, error: bankError } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    if (bankError) {
      console.error('Failed to fetch bank details:', bankError);
      return res.status(500).json({ error: 'Failed to fetch bank details' });
    }

    const emailDomain = process.env.BANK_EMAIL_DOMAIN || 'theoaklinebank.com';
    const emailData = {
      to: email,
      from: bankDetails.email_notify || `notify@${emailDomain}`,
      subject: 'Application Status Update - Oakline Bank',
      text: `
Dear ${first_name} ${last_name},

Thank you for your interest in opening an account with ${bankDetails.name || 'Oakline Bank'}.

After careful review of your application, we regret to inform you that we are unable to approve your account application at this time.

Reason: ${rejection_reason}

If you have any questions or would like to discuss this decision, please feel free to contact our customer service team:

Phone: ${bankDetails.phone || '+1 (636) 635-6122'}
Email: ${bankDetails.email_contact || `contact-us@${emailDomain}`}

We appreciate your understanding and wish you the best in your financial endeavors.

Sincerely,
${bankDetails.name || 'Oakline Bank'} Team
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
    .reason-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .contact-info { background: white; padding: 20px; margin: 20px 0; border-radius: 4px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Application Status Update</h1>
    </div>
    <div class="content">
      <p>Dear ${first_name} ${last_name},</p>
      
      <p>Thank you for your interest in opening an account with <strong>${bankDetails.name || 'Oakline Bank'}</strong>.</p>
      
      <p>After careful review of your application, we regret to inform you that we are unable to approve your account application at this time.</p>
      
      <div class="reason-box">
        <strong>Reason:</strong><br>
        ${rejection_reason}
      </div>
      
      <p>If you have any questions or would like to discuss this decision, please feel free to contact our customer service team:</p>
      
      <div class="contact-info">
        <p><strong>📞 Phone:</strong> ${bankDetails.phone || '+1 (636) 635-6122'}</p>
        <p><strong>📧 Email:</strong> ${bankDetails.email_contact || 'contact-us@theoaklinebank.com'}</p>
        <p><strong>🏢 Address:</strong> ${bankDetails.address || '12201 N May Avenue, Oklahoma City, OK 73120'}</p>
      </div>
      
      <p>We appreciate your understanding and wish you the best in your financial endeavors.</p>
      
      <p>Sincerely,<br>
      <strong>${bankDetails.name || 'Oakline Bank'} Team</strong></p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${bankDetails.name || 'Oakline Bank'}. All rights reserved.</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
      `.trim()
    };

    // Use Resend API to send email
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult);
      return res.status(500).json({ 
        error: 'Failed to send email', 
        details: resendResult 
      });
    }

    console.log('Rejection email sent successfully:', resendResult);

    return res.status(200).json({
      success: true,
      message: 'Rejection email sent successfully',
      emailId: resendResult.id
    });

  } catch (error) {
    console.error('Error sending rejection email:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
