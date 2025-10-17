// lib/email.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: true, // use SSL
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    });
    console.log('Email sent: ', info.messageId);
    return info;
  } catch (err) {
    console.error('Error sending email: ', err);
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
    html: emailHtml
  });
}
