
// lib/email.js
import nodemailer from 'nodemailer';

// SMTP transporter for primary provider
function createPrimarySMTPTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });
}

// SendGrid SMTP transporter
function createSendGridTransporter() {
  if (!process.env.SENDGRID_API_KEY) {
    return null;
  }
  
  return nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });
}

// Send email via Resend API
async function sendViaResend({ to, subject, html, text, from }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  console.log('📧 Attempting to send email via Resend...');
  
  // Extract email address from "Name <email@domain.com>" format if needed
  let fromAddress = from;
  const emailMatch = from.match(/<(.+?)>/);
  if (emailMatch) {
    fromAddress = emailMatch[1];
  }
  
  // Ensure the from address uses verified domain
  if (!fromAddress.includes('@theoaklinebank.com')) {
    console.warn(`⚠️ FromAddress ${fromAddress} is not on verified domain. Using info@theoaklinebank.com`);
    fromAddress = 'info@theoaklinebank.com';
  }

  const emailPayload = {
    from: fromAddress,
    to: Array.isArray(to) ? to : [to],
    subject: subject,
    html: html || text
  };

  if (text) {
    emailPayload.text = text;
  }

  console.log('📧 Resend payload:', JSON.stringify(emailPayload, null, 2));

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailPayload)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Resend API error:', JSON.stringify(data, null, 2));
    throw new Error(`Resend API error: ${JSON.stringify(data)}`);
  }

  console.log('✅ Email sent successfully via Resend:', data.id);
  return { messageId: data.id, provider: 'resend' };
}

// Send email via SMTP
async function sendViaSMTP({ to, subject, html, text, from, transporterName, transporter }) {
  console.log(`📧 Attempting to send email via ${transporterName} SMTP...`);

  const info = await transporter.sendMail({
    from: from,
    to: to,
    subject: subject,
    text: text,
    html: html,
  });

  console.log(`✅ Email sent successfully via ${transporterName}:`, info.messageId);
  return { ...info, provider: transporterName };
}

export const EMAIL_TYPES = {
  DEFAULT: 'default',
  WELCOME: 'welcome',
  UPDATES: 'updates',
  CONTACT: 'contact',
  NOTIFY: 'notify',
  LOANS: 'loans',
  SECURITY: 'security',
  VERIFY: 'verify',
  CRYPTO: 'crypto',
};

function getEmailFrom(type = EMAIL_TYPES.DEFAULT) {
  const fromName = 'Oakline Bank';
  
  switch (type) {
    case EMAIL_TYPES.WELCOME:
      return `${fromName} <${process.env.SMTP_FROM_WELCOME || process.env.SMTP_FROM || 'info@theoaklinebank.com'}>`;
    case EMAIL_TYPES.UPDATES:
      return `${fromName} <${process.env.SMTP_FROM_UPDATES || process.env.SMTP_FROM || 'info@theoaklinebank.com'}>`;
    case EMAIL_TYPES.CONTACT:
      return `${fromName} <${process.env.SMTP_FROM_CONTACT || process.env.SMTP_FROM || 'contact-us@theoaklinebank.com'}>`;
    case EMAIL_TYPES.NOTIFY:
      return `${fromName} <${process.env.SMTP_FROM_NOTIFY || process.env.SMTP_FROM || 'info@theoaklinebank.com'}>`;
    case EMAIL_TYPES.LOANS:
      return `${fromName} <${process.env.SMTP_FROM_LOANS || process.env.SMTP_FROM || 'loans@theoaklinebank.com'}>`;
    case EMAIL_TYPES.SECURITY:
      return `${fromName} <${process.env.SMTP_FROM_SECURITY || process.env.SMTP_FROM || 'info@theoaklinebank.com'}>`;
    case EMAIL_TYPES.VERIFY:
      return `${fromName} <${process.env.SMTP_FROM_VERIFY || process.env.SMTP_FROM || 'info@theoaklinebank.com'}>`;
    case EMAIL_TYPES.CRYPTO:
      return `${fromName} <${process.env.SMTP_FROM_CRYPTO || process.env.SMTP_FROM || 'crypto@theoaklinebank.com'}>`;
    default:
      return `${fromName} <${process.env.SMTP_FROM || 'info@theoaklinebank.com'}>`;
  }
}

export async function sendEmail({ to, subject, text, html, type = EMAIL_TYPES.DEFAULT, from }) {
  const fromAddress = from || getEmailFrom(type);
  
  console.log('📧 Sending email from:', fromAddress, 'to:', to, 'type:', type);

  try {
    // Try Resend first (primary provider)
    if (process.env.RESEND_API_KEY) {
      try {
        return await sendViaResend({ to, subject, html, text, from: fromAddress });
      } catch (resendError) {
        console.warn('⚠️ Resend failed, trying SMTP fallback:', resendError.message);
      }
    }

    // Try primary SMTP
    const primaryTransporter = createPrimarySMTPTransporter();
    if (primaryTransporter) {
      try {
        return await sendViaSMTP({ 
          to, 
          subject, 
          html, 
          text, 
          from: fromAddress,
          transporterName: 'Primary SMTP',
          transporter: primaryTransporter
        });
      } catch (primaryError) {
        console.warn('⚠️ Primary SMTP failed, trying SendGrid fallback:', primaryError.message);
      }
    }

    // Try SendGrid SMTP as last resort
    const sendgridTransporter = createSendGridTransporter();
    if (sendgridTransporter) {
      return await sendViaSMTP({ 
        to, 
        subject, 
        html, 
        text, 
        from: fromAddress,
        transporterName: 'SendGrid',
        transporter: sendgridTransporter
      });
    }

    throw new Error('No email providers configured or all providers failed');
    
  } catch (err) {
    console.error('❌ All email providers failed:', err);
    throw err;
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
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🔐 Reset Your Password</h1>
          <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank Security</p>
        </div>
        
        <div style="padding: 40px 32px;">
          <h2 style="color: #1e40af; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
            Click Below to Reset Your Password
          </h2>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            Your identity has been verified. Click the button below to create a new password for your account:
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="display: inline-block; background-color: #1e40af; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Reset My Password
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0;">
            Or copy and paste this link into your browser:<br/>
            <a href="${resetLink}" style="color: #1e40af; word-break: break-all;">${resetLink}</a>
          </p>
          
          <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 16px 0;">
            Please visit <a href="https://www.theoaklinebank.com" style="color: #1e40af;">www.theoaklinebank.com</a> to access your account.
          </p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
            <p style="color: #991b1b; font-size: 14px; font-weight: 500; margin: 0;">
              ⚠️ This link expires in 1 hour. If you didn't request this, please contact us immediately.
            </p>
          </div>
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

  return sendEmail({
    to: email,
    subject: '🔐 Reset Your Oakline Bank Password',
    html: emailHtml,
    type: EMAIL_TYPES.NOTIFY
  });
}
