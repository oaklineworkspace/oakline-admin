
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, firstName, lastName, accountNumber, accountType, status, reason } = req.body;

  if (!email || !firstName || !accountNumber || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data: bankDetails, error: bankError } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    if (bankError) {
      console.error('Failed to fetch bank details:', bankError);
      return res.status(500).json({ error: 'Failed to fetch bank details' });
    }

    const fullName = `${firstName} ${lastName || ''}`.trim();
    const formattedAccountType = accountType ? accountType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Account';
    
    let subject, textContent, htmlContent;

    if (status === 'active') {
      subject = '✅ Account Activated - Oakline Bank';
      textContent = `
Dear ${fullName},

Great news! Your ${formattedAccountType} has been successfully activated.

Account Number: ${accountNumber}
Status: Active

Your account is now fully operational and ready to use. You can now:
- Transfer funds
- Make payments
- Use your debit card
- Access all banking services

To access your account, please log in to your online banking portal:
${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theoaklinebank.com'}/login

If you have any questions, please contact us:
Phone: ${bankDetails.phone || '+1 (636) 635-6122'}
Email: ${bankDetails.email_contact || `contact-us@${process.env.BANK_EMAIL_DOMAIN || 'theoaklinebank.com'}`}

Thank you for banking with us!

Sincerely,
${bankDetails.name || 'Oakline Bank'} Team
      `.trim();

      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
    .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .account-info { background: white; padding: 20px; margin: 20px 0; border-radius: 4px; border: 1px solid #e5e7eb; }
    .features { background: white; padding: 20px; margin: 20px 0; border-radius: 4px; border: 1px solid #e5e7eb; }
    .features ul { margin: 10px 0; padding-left: 20px; }
    .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white !important; text-decoration: none; border-radius: 6px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Account Activated!</h1>
    </div>
    <div class="content">
      <p>Dear ${fullName},</p>
      
      <div class="success-box">
        <strong>Great news!</strong> Your ${formattedAccountType} has been successfully activated.
      </div>
      
      <div class="account-info">
        <p><strong>Account Number:</strong> ${accountNumber}</p>
        <p><strong>Account Type:</strong> ${formattedAccountType}</p>
        <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Active</span></p>
      </div>
      
      <p>Your account is now fully operational and ready to use. You can now:</p>
      
      <div class="features">
        <ul>
          <li>✓ Transfer funds</li>
          <li>✓ Make payments</li>
          <li>✓ Use your debit card</li>
          <li>✓ Access all banking services</li>
        </ul>
      </div>
      
      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theoaklinebank.com'}/login" class="button">
          🔐 Login to Your Account
        </a>
      </p>
      
      <p>If you have any questions, please contact us:</p>
      
      <div class="account-info">
        <p><strong>📞 Phone:</strong> ${bankDetails.phone || '+1 (636) 635-6122'}</p>
        <p><strong>📧 Email:</strong> ${bankDetails.email_contact || `contact-us@${process.env.BANK_EMAIL_DOMAIN || 'theoaklinebank.com'}`}</p>
        <p><strong>🏢 Address:</strong> ${bankDetails.address || '12201 N May Avenue, Oklahoma City, OK 73120'}</p>
      </div>
      
      <p>Thank you for banking with us!</p>
      
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
      `.trim();
    } else if (status === 'rejected') {
      subject = '❌ Account Status Update - Oakline Bank';
      const rejectionReason = reason || 'Your account did not meet our current requirements.';
      
      textContent = `
Dear ${fullName},

We regret to inform you that your ${formattedAccountType} (Account #${accountNumber}) has been rejected.

Reason: ${rejectionReason}

If you have any questions or would like to discuss this decision, please contact our customer service team:

Phone: ${bankDetails.phone || '+1 (636) 635-6122'}
Email: ${bankDetails.email_contact || `contact-us@${process.env.BANK_EMAIL_DOMAIN || 'theoaklinebank.com'}`}

We appreciate your understanding.

Sincerely,
${bankDetails.name || 'Oakline Bank'} Team
      `.trim();

      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
    .reason-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .account-info { background: white; padding: 20px; margin: 20px 0; border-radius: 4px; border: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Account Status Update</h1>
    </div>
    <div class="content">
      <p>Dear ${fullName},</p>
      
      <p>We regret to inform you that your <strong>${formattedAccountType}</strong> has been rejected.</p>
      
      <div class="account-info">
        <p><strong>Account Number:</strong> ${accountNumber}</p>
        <p><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">Rejected</span></p>
      </div>
      
      <div class="reason-box">
        <strong>Reason:</strong><br>
        ${rejectionReason}
      </div>
      
      <p>If you have any questions or would like to discuss this decision, please contact our customer service team:</p>
      
      <div class="account-info">
        <p><strong>📞 Phone:</strong> ${bankDetails.phone || '+1 (636) 635-6122'}</p>
        <p><strong>📧 Email:</strong> ${bankDetails.email_contact || `contact-us@${process.env.BANK_EMAIL_DOMAIN || 'theoaklinebank.com'}`}</p>
        <p><strong>🏢 Address:</strong> ${bankDetails.address || '12201 N May Avenue, Oklahoma City, OK 73120'}</p>
      </div>
      
      <p>We appreciate your understanding.</p>
      
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
      `.trim();
    } else {
      return res.status(400).json({ error: 'Invalid status. Must be "active" or "rejected"' });
    }

    // Use the existing SMTP email system
    try {
      await sendEmail({
        to: email,
        subject: subject,
        text: textContent,
        html: htmlContent,
        type: EMAIL_TYPES.NOTIFY
      });

      console.log(`✅ Account ${status} email sent successfully to:`, email);

      return res.status(200).json({
        success: true,
        message: `Account ${status} email sent successfully`
      });
    } catch (emailError) {
      console.error(`❌ Failed to send account ${status} email:`, emailError);
      return res.status(500).json({ 
        error: 'Failed to send email', 
        details: emailError.message 
      });
    }

  } catch (error) {
    console.error('Error sending account status email:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
