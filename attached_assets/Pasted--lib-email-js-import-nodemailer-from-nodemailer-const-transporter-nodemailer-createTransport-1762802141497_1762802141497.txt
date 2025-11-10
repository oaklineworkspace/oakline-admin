// lib/email.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true, // Always use SSL for Zoho
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  },
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  logger: process.env.NODE_ENV === 'development' // Enable logging in development
});

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Cache bank details to avoid repeated DB calls
let cachedBankDetails = null;

async function getBankDetails() {
  if (cachedBankDetails) {
    return cachedBankDetails;
  }

  try {
    const { supabaseAdmin } = await import('./supabaseAdmin');
    const { data, error } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    if (!error && data) {
      cachedBankDetails = data;
      return data;
    }
  } catch (error) {
    console.error('Error fetching bank details:', error);
  }

  return null;
}

// Send email via Resend API
async function sendViaResend({ to, subject, text, html, fromAddress, senderName }) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  console.log('Attempting to send email via Resend...');
  
  // Ensure the from address uses the verified domain
  // Resend requires sending from verified domain (theoaklinebank.com)
  let verifiedFromAddress = fromAddress;
  
  // If fromAddress doesn't end with theoaklinebank.com, default to info@theoaklinebank.com
  if (!fromAddress.endsWith('@theoaklinebank.com')) {
    console.warn(`⚠️ FromAddress ${fromAddress} is not on verified domain. Using info@theoaklinebank.com`);
    verifiedFromAddress = 'info@theoaklinebank.com';
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `${senderName} <${verifiedFromAddress}>`,
      to: [to],
      subject: subject,
      html: html || text,
      text: text,
      reply_to: verifiedFromAddress
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Resend API error:', data);
    throw new Error(`Resend API error: ${data.message || response.statusText}`);
  }

  console.log('✅ Email sent successfully via Resend:', data.id);
  return { messageId: data.id, provider: 'resend' };
}

// Send email via SMTP
async function sendViaSMTP({ to, subject, text, html, fromAddress, senderName }) {
  console.log('Attempting to send email via SMTP...');
  const formattedFrom = `"${senderName}" <${fromAddress}>`;

  const info = await transporter.sendMail({
    from: formattedFrom,
    to,
    subject,
    text,
    html,
    // Zoho requires explicit envelope configuration for aliases
    envelope: {
      from: fromAddress,
      to: to
    },
    // Add reply-to for better email handling
    replyTo: fromAddress
  });
  console.log('Email sent successfully via SMTP:', info.messageId);
  return { ...info, provider: 'smtp' };
}


export async function sendEmail({ to, subject, text, html, from, emailType = 'general' }) {
  try {
    const bankDetails = await getBankDetails();
    const senderName = bankDetails?.name || process.env.SMTP_SENDER_NAME || 'Oakline Bank';

    // Determine the email address based on type and bank details
    let fromAddress = from;
    if (!fromAddress && bankDetails) {
      switch(emailType) {
        case 'welcome':
          fromAddress = bankDetails.email_welcome || bankDetails.email_info;
          break;
        case 'notify':
          fromAddress = bankDetails.email_notify || bankDetails.email_info;
          break;
        case 'updates':
          fromAddress = bankDetails.email_updates || bankDetails.email_info;
          break;
        case 'contact':
          fromAddress = bankDetails.email_contact || bankDetails.email_info;
          break;
        case 'loans':
          fromAddress = bankDetails.email_loans || bankDetails.email_info;
          break;
        case 'support':
          fromAddress = bankDetails.email_support || bankDetails.email_contact;
          break;
        default:
          fromAddress = bankDetails.email_info;
      }
    }

    // Fallback to environment variable
    if (!fromAddress) {
      fromAddress = process.env.SMTP_FROM || 'info@theoaklinebank.com';
    }

    console.log('Sending email from:', fromAddress, 'to:', to, 'type:', emailType);

    // Try Resend first (primary provider)
    try {
      if (RESEND_API_KEY) {
        return await sendViaResend({ to, subject, text, html, fromAddress, senderName });
      }
    } catch (resendError) {
      console.warn('⚠️ Resend failed, trying SMTP fallback:', resendError.message);
    }

    // Fallback to SMTP
    return await sendViaSMTP({ to, subject, text, html, fromAddress, senderName });

  } catch (err) {
    console.error('❌ All email providers failed:', err);
    throw err;
  }
}

export const EMAIL_TYPES = {
  GENERAL: 'general',
  WELCOME: 'welcome',
  UPDATES: 'updates',
  CONTACT: 'contact',
  NOTIFY: 'notify',
  LOANS: 'loans',
  SECURITY: 'security',
  VERIFY: 'verify',
  CRYPTO: 'crypto',
  CUSTOMERSUPPORT: 'customersupport'
};

export function getEmailAddress(type) {
  switch(type) {
    case EMAIL_TYPES.WELCOME:
      return process.env.SMTP_FROM_WELCOME || process.env.SMTP_FROM;
    case EMAIL_TYPES.UPDATES:
      return process.env.SMTP_FROM_UPDATES || process.env.SMTP_FROM;
    case EMAIL_TYPES.CONTACT:
      return process.env.SMTP_FROM_CONTACT || process.env.SMTP_FROM;
    case EMAIL_TYPES.NOTIFY:
      return process.env.SMTP_FROM_NOTIFY || process.env.SMTP_FROM;
    case EMAIL_TYPES.LOANS:
      return process.env.SMTP_FROM_LOANS || process.env.SMTP_FROM;
    case EMAIL_TYPES.CUSTOMERSUPPORT:
      return process.env.SMTP_FROM_CUSTOMERSUPPORT || process.env.SMTP_FROM;
    case EMAIL_TYPES.SECURITY:
      return process.env.SMTP_FROM_SECURITY || process.env.SMTP_FROM;
    case EMAIL_TYPES.VERIFY:
      return process.env.SMTP_FROM_VERIFY || process.env.SMTP_FROM;
    case EMAIL_TYPES.CRYPTO:
      return process.env.SMTP_FROM_CRYPTO || process.env.SMTP_FROM;
    default:
      return process.env.SMTP_FROM;
  }
}



export async function sendPasswordResetLink(email, resetLink) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
          <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">🏦</div>
          <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Oakline Bank</div>
          <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Secure Password Reset</div>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 32px;">
          <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
            🔐 Reset Your Password
          </h1>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              We received a request to reset the password for your Oakline Bank account. Click the button below to create a new password. <strong>This link expires in 1 hour.</strong>
            </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}"
               style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #2c5aa0 100%);
                      color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none;
                      font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);">
              Reset My Password
            </a>
          </div>

          <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0;">
            Or copy and paste this link into your browser:<br/>
            <a href="${resetLink}" style="color: #1a365d; word-break: break-all; text-decoration: none;">${resetLink}</a>
          </p>

          <!-- Security Notice -->
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
            <p style="color: #991b1b; font-size: 14px; font-weight: 500; margin: 0;">
              ⚠️ <strong>Security Alert:</strong> This password reset link expires in 1 hour for your security.
              If you didn't request this reset, please contact our security team immediately at contact-us@theoaklinebank.com or call (636) 635-6122.
            </p>
          </div>

          <!-- Security Tips -->
          <div style="background-color: #f7fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #1a365d; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
              🔒 Password Security Tips:
            </h3>
            <ul style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Use at least 8 characters with uppercase, lowercase, numbers, and symbols</li>
              <li style="margin-bottom: 8px;">Avoid using personal information or common words</li>
              <li style="margin-bottom: 8px;">Never share your password with anyone</li>
              <li>Use a unique password for your banking account</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
            Need help? Contact our support team 24/7:
          </p>
          <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
            📧 contact-us@theoaklinebank.com | 📞 (636) 635-6122
          </p>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
              Member FDIC | Equal Housing Lender | Routing: 075915826<br>
              12201 N May Avenue, Oklahoma City, OK 73120
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🔐 Reset Your Oakline Bank Password',
    html: emailHtml,
    emailType: EMAIL_TYPES.SECURITY,
    from: getEmailAddress(EMAIL_TYPES.SECURITY)
  });
}

export async function sendPasswordResetCode(email, code) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
          <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">🏦</div>
          <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Oakline Bank</div>
          <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Secure Password Reset</div>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 32px;">
          <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
            🔐 Reset Your Password
          </h1>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            We received a request to reset the password for your Oakline Bank account. Use the verification code below to reset your password. <strong>This code expires in 10 minutes.</strong>
          </p>

          <!-- Verification Code Display -->
          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0066cc; border-radius: 16px; padding: 32px; margin: 32px 0; text-align: center;">
            <p style="color: #1a365d; font-size: 14px; font-weight: 600; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">
              Your Verification Code
            </p>
            <div style="background: #ffffff; border-radius: 12px; padding: 20px; margin: 0 auto; max-width: 280px; box-shadow: 0 4px 12px rgba(0, 102, 204, 0.1);">
              <p style="color: #0066cc; font-size: 42px; font-weight: 700; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </p>
            </div>
            <p style="color: #64748b; font-size: 13px; margin: 16px 0 0 0;">
              Enter this code on the password reset page
            </p>
          </div>

          <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 24px 0;">
            To reset your password:
          </p>
          <ol style="color: #4a5568; font-size: 15px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
            <li>Go to the password reset page</li>
            <li>Enter your email address</li>
            <li>Enter the verification code: <strong>${code}</strong></li>
            <li>Create your new password</li>
          </ol>

          <!-- Security Notice -->
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
            <p style="color: #991b1b; font-size: 14px; font-weight: 500; margin: 0;">
              ⚠️ <strong>Security Alert:</strong> This verification code expires in 10 minutes for your security.
              If you didn't request this reset, please contact our security team immediately at contact-us@theoaklinebank.com or call (636) 635-6122.
            </p>
          </div>

          <!-- Security Tips -->
          <div style="background-color: #f7fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #1a365d; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
              🔒 Password Security Tips:
            </h3>
            <ul style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Use at least 8 characters with uppercase, lowercase, numbers, and symbols</li>
              <li style="margin-bottom: 8px;">Avoid using personal information or common words</li>
              <li style="margin-bottom: 8px;">Never share your password or verification code with anyone</li>
              <li>Use a unique password for your banking account</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
            Need help? Contact our support team 24/7:
          </p>
          <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
            📧 contact-us@theoaklinebank.com | 📞 (636) 635-6122
          </p>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
              Member FDIC | Equal Housing Lender | Routing: 075915826<br>
              12201 N May Avenue, Oklahoma City, OK 73120
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🔐 Your Oakline Bank Password Reset Code',
    html: emailHtml,
    emailType: EMAIL_TYPES.SECURITY,
    from: getEmailAddress(EMAIL_TYPES.SECURITY)
  });
}

export async function sendLoanSubmittedEmail({ to, userName, loanAmount, loanType, depositRequired }) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
          <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">🏦</div>
          <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Oakline Bank</div>
          <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Loan Department</div>
        </div>

        <div style="padding: 40px 32px;">
          <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
            📋 Loan Application Received
          </h1>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            Dear ${userName},
          </p>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            Thank you for submitting your loan application. Your request is now being reviewed by our Loan Department.
          </p>

          <div style="background-color: #f7fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #1a365d; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Application Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Loan Type:</td>
                <td style="padding: 8px 0; color: #1a365d; font-size: 14px; font-weight: 600; text-align: right;">${loanType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Requested Amount:</td>
                <td style="padding: 8px 0; color: #1a365d; font-size: 14px; font-weight: 600; text-align: right;">$${parseFloat(loanAmount).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Required Deposit (10%):</td>
                <td style="padding: 8px 0; color: #059669; font-size: 14px; font-weight: 600; text-align: right;">$${parseFloat(depositRequired).toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
            <p style="color: #92400e; font-size: 14px; font-weight: 500; margin: 0;">
              ⏳ <strong>Next Step:</strong> Please complete your 10% deposit to proceed with the review process. Your application will remain pending until the deposit is confirmed by our Loan Department.
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://theoaklinebank.com'}/loan/dashboard"
               style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #2c5aa0 100%);
                      color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none;
                      font-weight: 600; font-size: 16px;">
              View Loan Dashboard
            </a>
          </div>
        </div>

        <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">Questions? Contact our Loan Department:</p>
          <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
            📧 loans@theoaklinebank.com | 📞 (636) 635-6122
          </p>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
              Member FDIC | Equal Housing Lender
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: '📋 Loan Application Received - Oakline Bank Loan Department',
    html: emailHtml,
    emailType: EMAIL_TYPES.LOANS,
    from: getEmailAddress(EMAIL_TYPES.LOANS)
  });
}

export async function sendLoanNotificationEmail({ to, loanAmount, loanType, status, remarks }) {
  const isApproved = status.toLowerCase() === 'approved';
  const emailType = EMAIL_TYPES.LOANS;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, ${isApproved ? '#059669 0%, #10b981 100%' : '#dc2626 0%, #ef4444 100%'}); padding: 32px 24px; text-align: center;">
          <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">🏦</div>
          <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Oakline Bank</div>
          <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Loan Department Decision</div>
        </div>

        <div style="padding: 40px 32px;">
          <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
            ${isApproved ? '✅ Loan Approved & Activated!' : '❌ Loan Decision'}
          </h1>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            ${isApproved
              ? 'Congratulations! Your loan application has been approved by our Loan Department and your loan is now active.'
              : 'After careful review, our Loan Department is unable to approve your loan request at this time.'}
          </p>

          <div style="background-color: #f7fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #1a365d; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Loan Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Loan Type:</td>
                <td style="padding: 8px 0; color: #1a365d; font-size: 14px; font-weight: 600; text-align: right;">${loanType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Loan Amount:</td>
                <td style="padding: 8px 0; color: #1a365d; font-size: 14px; font-weight: 600; text-align: right;">$${parseFloat(loanAmount).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Status:</td>
                <td style="padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right; color: ${isApproved ? '#059669' : '#dc2626'};">${status}</td>
              </tr>
            </table>
          </div>

          ${remarks ? `
          <div style="background-color: ${isApproved ? '#f0fdf4' : '#fef2f2'}; border-left: 4px solid ${isApproved ? '#10b981' : '#dc2626'}; padding: 16px; margin: 24px 0;">
            <p style="color: #1a365d; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
              ${isApproved ? 'Loan Department Notes:' : 'Reason for Decline:'}
            </p>
            <p style="color: #4a5568; font-size: 14px; margin: 0;">${remarks}</p>
          </div>
          ` : ''}

          ${isApproved ? `
          <div style="background-color: #d1fae5; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #065f46; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
              🎉 Your Loan is Now Active!
            </h3>
            <ul style="color: #047857; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Funds have been credited to your account</li>
              <li style="margin-bottom: 8px;">View your repayment schedule in the loan dashboard</li>
              <li style="margin-bottom: 8px;">Set up auto-pay to never miss a payment</li>
              <li>Contact our Loan Department for any questions</li>
            </ul>
          </div>
          ` : `
          <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
              💡 Next Steps:
            </h3>
            <ul style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Contact our Loan Department for clarification</li>
              <li style="margin-bottom: 8px;">Work on improving the areas mentioned above</li>
              <li style="margin-bottom: 8px;">You may reapply in the future</li>
              <li>Explore alternative loan options with our specialists</li>
            </ul>
          </div>
          `}

          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://theoaklinebank.com'}/loan/dashboard"
               style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #2c5aa0 100%);
                      color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none;
                      font-weight: 600; font-size: 16px;">
              View Loan Dashboard
            </a>
          </div>
        </div>

        <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">Questions? Contact our Loan Department:</p>
          <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
            📧 loans@theoaklinebank.com | 📞 (636) 635-6122
          </p>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
              Member FDIC | Equal Housing Lender
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `${isApproved ? '✅ Loan Approved' : '❌ Loan Decision'} - Oakline Bank Loan Department`,
    html: emailHtml,
    emailType: emailType,
    from: getEmailAddress(emailType)
  });
}

export async function sendDepositConfirmedEmail({ to, userName, depositAmount, loanType }) {
  const emailType = EMAIL_TYPES.LOANS;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 24px; text-align: center;">
          <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">✅</div>
          <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Oakline Bank</div>
          <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Loan Department</div>
        </div>

        <div style="padding: 40px 32px;">
          <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
            ✅ Deposit Confirmed!
          </h1>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            Dear ${userName},
          </p>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            Your 10% loan deposit has been confirmed by our Loan Department. Your loan application is now under review.
          </p>

          <div style="background-color: #d1fae5; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
            <div style="color: #065f46; font-size: 14px; font-weight: 600; margin-bottom: 8px;">Deposit Confirmed</div>
            <div style="color: #059669; font-size: 32px; font-weight: 700; margin-bottom: 8px;">
              $${parseFloat(depositAmount).toLocaleString()}
            </div>
            <div style="color: #047857; font-size: 14px;">${loanType} Application</div>
          </div>

          <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
              📋 What Happens Next:
            </h3>
            <ul style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Our Loan Department will review your application</li>
              <li style="margin-bottom: 8px;">Review typically takes 24-48 business hours</li>
              <li style="margin-bottom: 8px;">You'll receive an email once a decision is made</li>
              <li>Track your application status in the loan dashboard</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://theoaklinebank.com'}/loan/dashboard"
               style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #2c5aa0 100%);
                      color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none;
                      font-weight: 600; font-size: 16px;">
              View Loan Dashboard
            </a>
          </div>
        </div>

        <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">Questions? Contact our Loan Department:</p>
          <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
            📧 loans@theoaklinebank.com | 📞 (636) 635-6122
          </p>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
              Member FDIC | Equal Housing Lender
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: '✅ Deposit Confirmed - Loan Under Review | Oakline Bank Loan Department',
    html: emailHtml,
    emailType: emailType,
    from: getEmailAddress(emailType)
  });
}