
import nodemailer from 'nodemailer';
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, fromEmail, cryptoType, network, amount, fee, netAmount, depositId, userName } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    const from = fromEmail || 'crypto@theoaklinebank.com';

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: 600; color: #6b7280; }
          .detail-value { font-weight: 700; color: #111827; }
          .amount { font-size: 24px; color: #10b981; }
          .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✓ Deposit Completed</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Oakline Bank</p>
          </div>
          
          <div class="content">
            <p>Hello ${userName || 'Valued Customer'},</p>
            
            <p>Good news! Your cryptocurrency deposit has been successfully processed and credited to your account.</p>
            
            <div class="details">
              <h2 style="margin-top: 0; color: #111827;">Transaction Details:</h2>
              
              <div class="detail-row">
                <span class="detail-label">Crypto Type:</span>
                <span class="detail-value">${cryptoType}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Network:</span>
                <span class="detail-value">${network}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value">$${parseFloat(amount).toFixed(2)}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Fee:</span>
                <span class="detail-value" style="color: #ef4444;">$${parseFloat(fee).toFixed(2)}</span>
              </div>
              
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">Net Amount:</span>
                <span class="detail-value amount">$${parseFloat(netAmount).toFixed(2)}</span>
              </div>
              
              <div class="detail-row" style="border-bottom: none; border-top: 2px solid #10b981; margin-top: 10px; padding-top: 15px;">
                <span class="detail-label">Status:</span>
                <span class="detail-value" style="color: #10b981;">Completed</span>
              </div>
            </div>
            
            <p>If you have any questions about this transaction, please contact our support team.</p>
            
            <div class="footer">
              <p><strong>Oakline Bank</strong></p>
              <p>12201 N May Avenue, Oklahoma City, OK 73120, United States</p>
              <p>Phone: +1 (636) 635-6122</p>
              <p>Email: ${from}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Oakline Bank - Crypto" <${from}>`,
      to,
      subject: 'Your Cryptocurrency Deposit has been Completed',
      html: emailHtml,
      text: `Hello ${userName || 'Valued Customer'},\n\nYour cryptocurrency deposit has been completed!\n\nCrypto Type: ${cryptoType}\nNetwork: ${network}\nAmount: $${parseFloat(amount).toFixed(2)}\nFee: $${parseFloat(fee).toFixed(2)}\nNet Amount: $${parseFloat(netAmount).toFixed(2)}\nStatus: Completed\n\nThank you for banking with Oakline Bank.`
    };

    const info = await transporter.sendMail(mailOptions);

    // Log email
    await supabase.from('email_logs').insert({
      recipient_email: to,
      subject: 'Your Cryptocurrency Deposit has been Completed',
      email_type: 'crypto_deposit_completed',
      provider: 'smtp',
      status: 'sent',
      message_id: info.messageId,
      email_content_html: emailHtml,
      metadata: { cryptoType, network, amount, fee, netAmount, depositId }
    });

    return res.status(200).json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error('Error sending email:', error);
    
    // Log failed email
    try {
      await supabase.from('email_logs').insert({
        recipient_email: req.body.to,
        subject: 'Your Cryptocurrency Deposit has been Completed',
        email_type: 'crypto_deposit_completed',
        provider: 'smtp',
        status: 'failed',
        error_message: error.message
      });
    } catch (logError) {
      console.error('Error logging failed email:', logError);
    }

    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
