
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, fromEmail, cryptoType, network, amount, fee, netAmount, depositId, userName, walletAddress, memo, txHash, isLoanDeposit } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    // Ensure isLoanDeposit is a boolean
    const isLoan = Boolean(isLoanDeposit);

    // Set defaults for numeric values to prevent errors
    const safeAmount = amount ?? 0;
    const safeFee = fee ?? 0;
    const safeNetAmount = netAmount ?? 0;

    const emailDomain = process.env.BANK_EMAIL_DOMAIN || 'theoaklinebank.com';
    const from = fromEmail || `Oakline Bank - Crypto <crypto@${emailDomain}>`;

    console.log('Sending email - isLoanDeposit flag:', isLoanDeposit, 'converted to:', isLoan);

    const headerMessage = isLoan 
      ? 'Your 10% Loan Requirement Deposit Confirmed'
      : '✓ Deposit Completed';
    
    const descriptionMessage = isLoan
      ? '<p>Good news! Your 10% cryptocurrency loan requirement deposit has been successfully received and processed. The funds have been securely transferred to our treasury account.</p>'
      : '<p>Good news! Your cryptocurrency deposit has been successfully processed and credited to your account.</p>';

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
          .loan-badge { background: #fbbf24; color: #78350f; padding: 8px 12px; border-radius: 4px; font-weight: 600; display: inline-block; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">${headerMessage}</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Oakline Bank</p>
          </div>
          
          <div class="content">
            ${isLoan ? '<div class="loan-badge">💼 Loan Application</div>' : ''}
            <p>Hello ${userName || 'Valued Customer'},</p>
            
            ${descriptionMessage}
            
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
              
              ${walletAddress ? `
              <div class="detail-row">
                <span class="detail-label">Wallet Address:</span>
                <span class="detail-value" style="font-size: 12px; word-break: break-all;">${walletAddress}</span>
              </div>
              ` : ''}
              
              ${memo ? `
              <div class="detail-row">
                <span class="detail-label">Memo/Tag:</span>
                <span class="detail-value">${memo}</span>
              </div>
              ` : ''}
              
              ${txHash ? `
              <div class="detail-row">
                <span class="detail-label">Transaction Hash:</span>
                <span class="detail-value" style="font-size: 12px; word-break: break-all;">${txHash}</span>
              </div>
              ` : ''}
              
              <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value">$${parseFloat(safeAmount).toFixed(2)}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Fee:</span>
                <span class="detail-value" style="color: #ef4444;">$${parseFloat(safeFee).toFixed(2)}</span>
              </div>
              
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">Net Amount:</span>
                <span class="detail-value amount">$${parseFloat(safeNetAmount).toFixed(2)}</span>
              </div>
              
              <div class="detail-row" style="border-bottom: none; border-top: 2px solid #10b981; margin-top: 10px; padding-top: 15px;">
                <span class="detail-label">Status:</span>
                <span class="detail-value" style="color: #10b981;">Completed</span>
              </div>
              
              ${isLoan ? `
              <div class="detail-row" style="border-bottom: none; margin-top: 10px; padding-top: 0;">
                <span class="detail-label">Destination:</span>
                <span class="detail-value" style="color: #6366f1;">Treasury Account</span>
              </div>
              ` : ''}
            </div>
            
            ${isLoan 
              ? '<p><strong>Note:</strong> This deposit fulfills your 10% loan requirement and has been secured in our treasury account. You will be notified once your loan application is processed.</p>'
              : '<p>The funds have been credited to your account and are now available for use.</p>'}
            
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

    const emailText = `Hello ${userName || 'Valued Customer'},\n\n${isLoan 
      ? 'Your 10% loan requirement cryptocurrency deposit has been completed!\n\nThe funds have been securely transferred to our treasury account.'
      : 'Your cryptocurrency deposit has been completed!\n\nThe funds have been credited to your account.'}\n\nTransaction Details:\nCrypto Type: ${cryptoType}\nNetwork: ${network}${walletAddress ? `\nWallet Address: ${walletAddress}` : ''}${memo ? `\nMemo/Tag: ${memo}` : ''}${txHash ? `\nTransaction Hash: ${txHash}` : ''}\nAmount: $${parseFloat(safeAmount).toFixed(2)}\nFee: $${parseFloat(safeFee).toFixed(2)}\nNet Amount: $${parseFloat(safeNetAmount).toFixed(2)}\nStatus: Completed\n\n${isLoan ? 'You will be notified once your loan application is processed.\n\n' : ''}Thank you for banking with Oakline Bank.`;

    const emailSubject = isLoan
      ? 'Your 10% Loan Requirement Cryptocurrency Deposit Confirmed'
      : 'Your Cryptocurrency Deposit has been Completed';

    const result = await sendEmail({
      to,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      type: EMAIL_TYPES.CRYPTO,
      from
    });

    return res.status(200).json({ 
      success: true, 
      messageId: result.messageId,
      provider: result.provider 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
