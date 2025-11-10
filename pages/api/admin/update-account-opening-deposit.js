import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      depositId,
      amount,
      txHash,
      confirmations,
      status,
      rejectionReason,
      adminNotes,
      adminId
    } = req.body;

    console.log('Update deposit request:', { depositId, status, adminId });

    if (!depositId) {
      return res.status(400).json({ error: 'Deposit ID is required' });
    }

    const { data: oldDeposit, error: fetchError } = await supabaseAdmin
      .from('account_opening_crypto_deposits')
      .select('*, crypto_assets(*), admin_assigned_wallets(*), accounts!inner(*, applications!inner(*))')
      .eq('id', depositId)
      .single();

    if (fetchError || !oldDeposit) {
      console.error('Error fetching deposit:', fetchError);
      return res.status(404).json({ error: 'Deposit not found' });
    }

    const oldStatus = oldDeposit.status;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (amount !== undefined && amount !== null && amount !== '') {
      updateData.amount = parseFloat(amount);
    }

    if (txHash) {
      updateData.tx_hash = txHash;
    }

    if (confirmations !== undefined && confirmations !== null && confirmations !== '') {
      updateData.confirmations = parseInt(confirmations);
    }

    if (status) {
      updateData.status = status;

      if (status === 'approved' || status === 'completed') {
        updateData.approved_by = adminId;
        updateData.approved_at = new Date().toISOString();
        // Calculate approved_amount as deposit amount minus fee
        const depositAmount = amount !== undefined && amount !== null && amount !== ''
          ? parseFloat(amount)
          : (oldDeposit.amount || 0);
        const fee = oldDeposit.fee || 0;
        updateData.approved_amount = depositAmount - fee;
      }

      if (status === 'rejected' || status === 'failed') {
        updateData.rejected_by = adminId;
        updateData.rejected_at = new Date().toISOString();
        if (rejectionReason) {
          updateData.rejection_reason = rejectionReason;
        }
      }

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }

    if (adminNotes !== undefined && adminNotes !== null) {
      updateData.admin_notes = adminNotes;
    }

    console.log('Update data:', updateData);

    let deposit;

    if (status === 'completed' && oldStatus !== 'completed') {
      console.log('Processing balance credit for completed deposit using atomic RPC');

      // Credit amount should be the approved_amount (which is already net of fees)
      const creditAmount = parseFloat(
        updateData.approved_amount ??
        oldDeposit.approved_amount ??
        ((oldDeposit.amount || 0) - (oldDeposit.fee || 0))
      );

      if (!creditAmount || creditAmount <= 0) {
        return res.status(400).json({
          error: 'Invalid deposit amount',
          details: 'Cannot credit zero or negative amount'
        });
      }

      const { data: rpcResult, error: rpcError } = await supabaseAdmin
        .rpc('complete_account_opening_deposit_atomic', {
          p_deposit_id: depositId,
          p_admin_id: adminId,
          p_approved_amount: creditAmount,
          p_tx_hash: updateData.tx_hash || null,
          p_confirmations: updateData.confirmations || null,
          p_admin_notes: updateData.admin_notes || null
        });

      if (rpcError) {
        console.error('Error calling atomic RPC:', rpcError);
        return res.status(500).json({
          error: 'Failed to complete deposit',
          details: rpcError.message
        });
      }

      if (!rpcResult || !rpcResult.success) {
        console.error('Atomic RPC returned failure:', rpcResult);
        return res.status(400).json({
          error: rpcResult?.error || 'Failed to complete deposit',
          details: 'Atomic operation was not successful'
        });
      }

      console.log('Deposit completed atomically:', rpcResult);

      const { data: completedDeposit } = await supabaseAdmin
        .from('account_opening_crypto_deposits')
        .select('*, crypto_assets(*), admin_assigned_wallets(*)')
        .eq('id', depositId)
        .single();

      deposit = completedDeposit;
    } else {
      const { data: updatedDeposit, error } = await supabaseAdmin
        .from('account_opening_crypto_deposits')
        .update(updateData)
        .eq('id', depositId)
        .select('*, crypto_assets(*), admin_assigned_wallets(*)')
        .single();

      if (error) {
        console.error('Error updating deposit:', error);
        return res.status(500).json({
          error: 'Failed to update deposit',
          details: error.message
        });
      }

      deposit = updatedDeposit;
    }

    if (!deposit) {
      return res.status(404).json({
        error: 'Deposit not found after update'
      });
    }

    console.log('Deposit updated successfully:', deposit.id);

    if (status && status !== oldStatus) {
      console.log('Status changed from', oldStatus, 'to', status, '- sending notification email');

      try {
        const userEmail = oldDeposit.accounts?.applications?.email;
        const firstName = oldDeposit.accounts?.applications?.first_name;
        const lastName = oldDeposit.accounts?.applications?.last_name;
        const accountNumber = oldDeposit.accounts?.account_number;
        const accountType = oldDeposit.accounts?.account_type;

        if (userEmail && firstName) {
          await sendDepositStatusEmail({
            email: userEmail,
            firstName,
            lastName,
            accountNumber,
            accountType,
            depositAmount: deposit.amount,
            approvedAmount: deposit.approved_amount,
            requiredAmount: deposit.required_amount,
            status: deposit.status,
            rejectionReason: deposit.rejection_reason,
            cryptoType: deposit.crypto_assets?.crypto_type,
            networkType: deposit.crypto_assets?.network_type,
            txHash: deposit.tx_hash,
            req
          });
          console.log('Notification email sent to:', userEmail);
        } else {
          console.warn('Cannot send email - missing user information');
        }
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      deposit,
      message: 'Deposit updated successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function sendDepositStatusEmail({
  email,
  firstName,
  lastName,
  accountNumber,
  accountType,
  depositAmount,
  approvedAmount,
  requiredAmount,
  status,
  rejectionReason,
  cryptoType,
  networkType,
  txHash,
  req
}) {
  const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn('Cannot send email - missing SMTP configuration:', missingVars);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
  const loginUrl = `${siteUrl}/login`;

  // Fetch bank details from Supabase for contact email
  let supportEmail = 'support@theoaklinebank.com';
  try {
    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('email_support, email_crypto')
      .eq('name', 'Oakline Bank')
      .single();

    if (bankDetails) {
      supportEmail = bankDetails.email_support || supportEmail;
    }
  } catch (error) {
    console.error('Error fetching bank details for email:', error);
  }

  let emailHtml = '';
  let subject = '';
  let fromEmail = 'crypto@theoaklinebank.com'; // Use crypto email for deposit notifications

  if (status === 'approved' || status === 'completed') {
    subject = status === 'completed' ? '✅ Deposit Completed - Oakline Bank' : '✅ Deposit Approved - Oakline Bank';
    const statusText = status === 'completed' ? 'Completed & Credited' : 'Approved';

    emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${statusText} - Oakline Bank</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🏦 Oakline Bank</h1>
            <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Deposit ${statusText}</p>
          </div>

          <div style="padding: 40px 32px;">
            <h2 style="color: #10b981; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
              ✅ Great News, ${firstName}!
            </h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Your deposit for account opening has been <strong>${statusText}</strong>.
            </p>

            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <h3 style="color: #059669; margin: 0 0 12px 0; font-size: 18px;">Deposit Details</h3>
              <table style="width: 100%; color: #4a5568; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0;"><strong>Account Number:</strong></td>
                  <td style="padding: 8px 0;">${accountNumber || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Account Type:</strong></td>
                  <td style="padding: 8px 0;">${accountType?.replace('_', ' ').toUpperCase() || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Crypto Currency:</strong></td>
                  <td style="padding: 8px 0;">${cryptoType || 'N/A'} (${networkType || 'N/A'})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Deposited Amount:</strong></td>
                  <td style="padding: 8px 0; color: #10b981; font-weight: 600;">$${parseFloat(depositAmount || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Approved Amount:</strong></td>
                  <td style="padding: 8px 0; color: #10b981; font-weight: 600;">$${parseFloat(approvedAmount || depositAmount || 0).toFixed(2)}</td>
                </tr>
                ${requiredAmount ? `
                <tr>
                  <td style="padding: 8px 0;"><strong>Required Amount:</strong></td>
                  <td style="padding: 8px 0;">$${parseFloat(requiredAmount).toFixed(2)}</td>
                </tr>
                ` : ''}
                ${txHash ? `
                <tr>
                  <td style="padding: 8px 0;"><strong>Transaction Hash:</strong></td>
                  <td style="padding: 8px 0; word-break: break-all; font-family: monospace; font-size: 12px;">${txHash}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            ${status === 'completed' ? `
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
              Your funds have been credited to your account. You can now log in to your banking portal to view your balance and start using your account.
            </p>
            ` : `
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
              Your deposit has been verified and approved. The funds will be credited to your account shortly.
            </p>
            `}

            <div style="text-align: center; margin: 32px 0;">
              <a href="${loginUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none;
                        font-weight: 600; font-size: 16px;">
                Access Your Account
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 24px;">
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                <strong>Next Steps:</strong>
              </p>
              <ul style="color: #6b7280; font-size: 14px; line-height: 1.8; margin: 8px 0; padding-left: 20px;">
                <li>Log in to your account to view your balance</li>
                <li>Review your account details and settings</li>
                <li>Start using your banking services</li>
              </ul>
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Questions? Contact our support team
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              <a href="mailto:${supportEmail}" style="color: #10b981; text-decoration: none;">${supportEmail}</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0;">
              © ${new Date().getFullYear()} Oakline Bank. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  } else if (status === 'rejected' || status === 'failed') {
    subject = '❌ Deposit Update - Oakline Bank';
    const statusText = status === 'rejected' ? 'Rejected' : 'Failed';

    emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Deposit Update - Oakline Bank</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🏦 Oakline Bank</h1>
            <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Deposit Status Update</p>
          </div>

          <div style="padding: 40px 32px;">
            <h2 style="color: #ef4444; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
              Deposit ${statusText}
            </h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Dear ${firstName}${lastName ? ' ' + lastName : ''},
            </p>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              We regret to inform you that your deposit for account opening has been <strong>${statusText.toLowerCase()}</strong>.
            </p>

            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <h3 style="color: #dc2626; margin: 0 0 12px 0; font-size: 18px;">Deposit Details</h3>
              <table style="width: 100%; color: #4a5568; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0;"><strong>Account Number:</strong></td>
                  <td style="padding: 8px 0;">${accountNumber || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Account Type:</strong></td>
                  <td style="padding: 8px 0;">${accountType?.replace('_', ' ').toUpperCase() || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Crypto Currency:</strong></td>
                  <td style="padding: 8px 0;">${cryptoType || 'N/A'} (${networkType || 'N/A'})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Deposited Amount:</strong></td>
                  <td style="padding: 8px 0;">$${parseFloat(depositAmount || 0).toFixed(2)}</td>
                </tr>
                ${txHash ? `
                <tr>
                  <td style="padding: 8px 0;"><strong>Transaction Hash:</strong></td>
                  <td style="padding: 8px 0; word-break: break-all; font-family: monospace; font-size: 12px;">${txHash}</td>
                </tr>
                ` : ''}
                ${rejectionReason ? `
                <tr>
                  <td style="padding: 8px 0; vertical-align: top;"><strong>Reason:</strong></td>
                  <td style="padding: 8px 0;">${rejectionReason}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
              <strong>What happens next?</strong>
            </p>
            <ul style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 8px 0; padding-left: 20px;">
              <li>Please review the reason for ${status} above</li>
              <li>If you have questions, please contact our support team</li>
              <li>You may submit a new deposit after addressing the issue</li>
              <li>Our team is available to assist you with the next steps</li>
            </ul>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${loginUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                        color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none;
                        font-weight: 600; font-size: 16px;">
                Access Your Account
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 24px;">
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                We're here to help you complete your account opening. Please don't hesitate to reach out to our support team for assistance.
              </p>
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Need assistance? Contact our support team
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              <a href="mailto:${supportEmail}" style="color: #3b82f6; text-decoration: none;">${supportEmail}</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0;">
              © ${new Date().getFullYear()} Oakline Bank. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  } else if (status === 'awaiting_confirmations') {
    subject = '🔄 Deposit Received - Awaiting Confirmations';

    emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Deposit Received - Oakline Bank</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🏦 Oakline Bank</h1>
            <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Deposit Status Update</p>
          </div>

          <div style="padding: 40px 32px;">
            <h2 style="color: #3b82f6; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
              🔄 Deposit Received!
            </h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Dear ${firstName}${lastName ? ' ' + lastName : ''},
            </p>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              We've received your deposit and it's currently being processed on the blockchain network.
            </p>

            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <h3 style="color: #2563eb; margin: 0 0 12px 0; font-size: 18px;">Deposit Details</h3>
              <table style="width: 100%; color: #4a5568; font-size: 14px;">
                <tr>
                  <td style="padding: 8px 0;"><strong>Account Number:</strong></td>
                  <td style="padding: 8px 0;">${accountNumber || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Crypto Currency:</strong></td>
                  <td style="padding: 8px 0;">${cryptoType || 'N/A'} (${networkType || 'N/A'})</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Amount:</strong></td>
                  <td style="padding: 8px 0; color: #3b82f6; font-weight: 600;">$${parseFloat(depositAmount || 0).toFixed(2)}</td>
                </tr>
                ${txHash ? `
                <tr>
                  <td style="padding: 8px 0;"><strong>Transaction Hash:</strong></td>
                  <td style="padding: 8px 0; word-break: break-all; font-family: monospace; font-size: 12px;">${txHash}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
              Your transaction is being confirmed on the blockchain network. This usually takes a few minutes to complete. We'll notify you once the confirmations are complete and your deposit is approved.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${loginUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                        color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none;
                        font-weight: 600; font-size: 16px;">
                Check Status
              </a>
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Questions? Contact our support team
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              <a href="mailto:${supportEmail}" style="color: #3b82f6; text-decoration: none;">${supportEmail}</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0;">
              © ${new Date().getFullYear()} Oakline Bank. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  } else {
    return;
  }

  const mailOptions = {
    from: `Oakline Bank <${fromEmail}>`,
    to: email,
    subject,
    html: emailHtml,
  };

  await transporter.sendMail(mailOptions);
}