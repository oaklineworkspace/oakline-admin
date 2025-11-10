
// lib/email.js
import nodemailer from 'nodemailer';

// SMTP Provider configurations
const SMTP_PROVIDERS = {
  PRIMARY: 'primary',
  RESEND: 'resend',
  SENDGRID: 'sendgrid',
};

// Create transporter for primary SMTP
function createPrimaryTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: true,
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

// Create transporter for SendGrid SMTP
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

// Send email using Resend API
async function sendViaResend({ to, subject, html, from }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Resend API key not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: from || process.env.SMTP_FROM || 'Oakline Bank <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend API error: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  return {
    messageId: result.id,
    provider: SMTP_PROVIDERS.RESEND,
    response: JSON.stringify(result)
  };
}

// Get available transporters in priority order
function getAvailableTransporters() {
  const transporters = [];
  
  // Priority 1: Primary SMTP
  const primary = createPrimaryTransporter();
  if (primary) {
    transporters.push({
      name: SMTP_PROVIDERS.PRIMARY,
      transporter: primary,
      type: 'smtp'
    });
  }
  
  // Priority 2: Resend API
  if (process.env.RESEND_API_KEY) {
    transporters.push({
      name: SMTP_PROVIDERS.RESEND,
      transporter: null,
      type: 'api'
    });
  }
  
  // Priority 3: SendGrid SMTP
  const sendgrid = createSendGridTransporter();
  if (sendgrid) {
    transporters.push({
      name: SMTP_PROVIDERS.SENDGRID,
      transporter: sendgrid,
      type: 'smtp'
    });
  }
  
  return transporters;
}

export const EMAIL_TYPES = {
  DEFAULT: 'default',
  WELCOME: 'welcome',
  UPDATES: 'updates',
  CONTACT: 'contact',
  NOTIFY: 'notify',
};

function getEmailFrom(type = EMAIL_TYPES.DEFAULT) {
  const fromName = 'Oakline Bank';
  
  switch (type) {
    case EMAIL_TYPES.WELCOME:
      return `${fromName} <${process.env.SMTP_FROM_WELCOME || process.env.SMTP_FROM}>`;
    case EMAIL_TYPES.UPDATES:
      return `${fromName} <${process.env.SMTP_FROM_UPDATES || process.env.SMTP_FROM}>`;
    case EMAIL_TYPES.CONTACT:
      return `${fromName} <${process.env.SMTP_FROM_CONTACT || process.env.SMTP_FROM}>`;
    case EMAIL_TYPES.NOTIFY:
      return `${fromName} <${process.env.SMTP_FROM_NOTIFY || process.env.SMTP_FROM}>`;
    default:
      return `${fromName} <${process.env.SMTP_FROM}>`;
  }
}

export async function sendEmail({ to, subject, text, html, type = EMAIL_TYPES.DEFAULT, from }) {
  const transporters = getAvailableTransporters();
  
  if (transporters.length === 0) {
    throw new Error('No email providers configured. Please add SMTP credentials, RESEND_API_KEY, or SENDGRID_API_KEY in Secrets.');
  }

  const fromAddress = from || getEmailFrom(type);
  let lastError;

  // Try each provider in order
  for (const provider of transporters) {
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📧 Attempting to send email via ${provider.name} (attempt ${attempt}/${maxRetries})`);
        
        let result;
        
        if (provider.type === 'api' && provider.name === SMTP_PROVIDERS.RESEND) {
          // Use Resend API
          result = await sendViaResend({ to, subject, html, from: fromAddress });
        } else if (provider.type === 'smtp') {
          // Use SMTP transporter
          if (attempt === 1) {
            await provider.transporter.verify();
            console.log(`✅ ${provider.name} SMTP connection verified`);
          }
          
          result = await provider.transporter.sendMail({
            from: fromAddress,
            to,
            subject,
            text,
            html,
          });
          
          result.provider = provider.name;
        }
        
        console.log(`✅ Email sent successfully via ${provider.name}:`, result.messageId);
        return result;
        
      } catch (err) {
        lastError = err;
        console.error(`❌ ${provider.name} attempt ${attempt}/${maxRetries} failed:`, err.message);
        
        if (attempt < maxRetries) {
          const delay = attempt * 500;
          console.log(`⏳ Retrying ${provider.name} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.log(`⚠️ ${provider.name} failed after all retries, trying next provider...`);
  }
  
  console.error('❌ All email providers failed:', lastError);
  throw new Error(`Failed to send email after trying all providers: ${lastError?.message}`);
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
