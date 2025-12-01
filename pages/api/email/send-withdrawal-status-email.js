import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, userName, status, amount, method, reference, reason } = req.body;

    if (!to || !status || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailDomain = process.env.BANK_EMAIL_DOMAIN || 'theoaklinebank.com';
    const from = `Oakline Bank - Withdrawals <withdrawals@${emailDomain}>`;

    const statusMessages = {
      approved: {
        title: '✓ Withdrawal Approved',
        message: 'Your withdrawal request has been approved and is being processed.',
        color: '#10b981'
      },
      rejected: {
        title: '✕ Withdrawal Rejected',
        message: 'Unfortunately, your withdrawal request has been rejected.',
        color: '#dc2626'
      },
      completed: {
        title: '✓ Withdrawal Completed',
        message: 'Your withdrawal has been successfully completed.',
        color: '#10b981'
      },
      hold: {
        title: '⏸ Withdrawal On Hold',
        message: 'Your withdrawal has been placed on hold pending review.',
        color: '#f59e0b'
      },
      reversed: {
        title: '↩️ Withdrawal Reversed',
        message: 'Your withdrawal has been reversed and funds have been returned to your account.',
        color: '#3b82f6'
      }
    };

    const statusInfo = statusMessages[status] || {
      title: `Withdrawal ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your withdrawal status has been updated to ${status}.`,
      color: '#6b7280'
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, ${statusInfo.color} 0%, ${adjustColor(statusInfo.color, -20)} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: 600; color: #6b7280; }
          .detail-value { font-weight: 700; color: #111827; }
          .amount { font-size: 24px; color: ${statusInfo.color}; }
          .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          .reason-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">${statusInfo.title}</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Oakline Bank</p>
          </div>
          
          <div class="content">
            <p>Hello ${userName || 'Valued Customer'},</p>
            
            <p>${statusInfo.message}</p>
            
            <div class="details">
              <h2 style="margin-top: 0; color: #111827;">Withdrawal Details:</h2>
              
              <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value amount">$${parseFloat(amount).toFixed(2)}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Method:</span>
                <span class="detail-value">${method ? method.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'N/A'}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Reference:</span>
                <span class="detail-value" style="font-family: monospace; font-size: 12px;">${reference || 'N/A'}</span>
              </div>
              
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">Status:</span>
                <span class="detail-value" style="color: ${statusInfo.color};">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
              </div>
            </div>
            
            ${reason ? `
              <div class="reason-box">
                <strong>Reason:</strong><br/>
                ${reason}
              </div>
            ` : ''}
            
            <p>If you have any questions about this withdrawal or need further assistance, please contact our support team.</p>
            
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

    const emailText = `Hello ${userName || 'Valued Customer'},\n\n${statusInfo.message}\n\nWithdrawal Details:\nAmount: $${parseFloat(amount).toFixed(2)}\nMethod: ${method || 'N/A'}\nReference: ${reference || 'N/A'}\nStatus: ${status.charAt(0).toUpperCase() + status.slice(1)}\n${reason ? `\nReason: ${reason}` : ''}\n\nThank you for banking with Oakline Bank.`;

    const result = await sendEmail({
      to,
      subject: `${statusInfo.title.split(' ').slice(1).join(' ')} - Oakline Bank`,
      html: emailHtml,
      text: emailText,
      type: EMAIL_TYPES.WITHDRAWAL,
      from
    });

    return res.status(200).json({ 
      success: true, 
      messageId: result.messageId,
      provider: result.provider 
    });

  } catch (error) {
    console.error('Error sending withdrawal email:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}

function adjustColor(color, percent) {
  const num = parseInt(color.replace("#",""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + Math.max(0, R) * 0x10000 +
    Math.max(0, G) * 0x100 + Math.max(0, B))
    .toString(16).slice(1);
}
