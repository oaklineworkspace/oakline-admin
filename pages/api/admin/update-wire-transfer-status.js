import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

async function findOrUpdateTransactionReference(wireTransfer) {
  const reference = `WIRE-${wireTransfer.id}`;

  const { data: existingTx, error: txCheckError} = await supabaseAdmin
    .from('transactions')
    .select('id, reference')
    .eq('reference', reference)
    .eq('account_id', wireTransfer.from_account_id)
    .single();

  if (existingTx) {
    console.log(`✅ Found transaction with reference ${reference}`);
    return existingTx;
  }

  if (txCheckError && txCheckError.code !== 'PGRST116') {
    console.error('Error checking for existing transaction by reference:', txCheckError);

  }

  return null;
}

async function getBankDetails() {
  const { data: bankDetails, error } = await supabaseAdmin
    .from('bank_details')
    .select('*')
    .eq('name', 'Oakline Bank')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching bank details:', error);
  }

  const emailDomain = process.env.BANK_EMAIL_DOMAIN || 'theoaklinebank.com';

  return bankDetails || {
    name: 'Oakline Bank',
    branch_name: 'Oklahoma City Branch',
    address: '12201 N May Avenue, Oklahoma City, OK 73120, United States',
    phone: '+1 (636) 635-6122',
    email_info: `info@${emailDomain}`,
    email_contact: `contact-us@${emailDomain}`,
    email_support: `support@${emailDomain}`,
    email_notify: `notify@${emailDomain}`,
    routing_number: '075915826',
    swift_code: 'OAKLUS33',
    nmls_id: '574160'
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  const adminId = authResult.userId;
  const { wireTransferId, action, reason, adminNotes, userEmail, userName } = req.body;

  if (!wireTransferId || !action) {
    return res.status(400).json({ error: 'Wire transfer ID and action are required' });
  }

  try {
    const { data: transfer, error: fetchError } = await supabaseAdmin
      .from('wire_transfers')
      .select('*')
      .eq('id', wireTransferId)
      .single();

    if (fetchError || !transfer) {
      return res.status(404).json({ error: 'Wire transfer not found' });
    }

    await findOrUpdateTransactionReference(transfer);

    let updateData = {
      updated_at: new Date().toISOString(),
      updated_by: adminId
    };

    let newStatus = transfer.status;
    let emailSubject = '';
    let emailHtml = '';

    const bankDetails = await getBankDetails();
    const bankName = bankDetails.name || process.env.BANK_NAME || 'Oakline Bank';
    const supportEmail = bankDetails.email_support || process.env.EMAIL_SUPPORT || `support@${process.env.BANK_EMAIL_DOMAIN || 'theoaklinebank.com'}`;
    const supportPhone = bankDetails.phone || process.env.BANK_PHONE || '+1 (636) 635-6122';

    switch (action) {
      case 'approve':
        if (!['pending', 'rejected', 'cancelled', 'failed'].includes(transfer.status)) {
          return res.status(400).json({ error: 'Only pending, rejected, cancelled, or failed transfers can be approved' });
        }
        updateData.status = 'processing';
        updateData.approved_by = adminId;
        updateData.approved_at = new Date().toISOString();
        if (adminNotes) updateData.admin_notes = adminNotes;

        newStatus = 'processing';

        // If approving a previously rejected/cancelled transfer, we need to deduct from account again
        if (['rejected', 'cancelled'].includes(transfer.status)) {
          const { data: account, error: accountFetchError } = await supabaseAdmin
            .from('accounts')
            .select('balance')
            .eq('id', transfer.from_account_id)
            .single();

          if (account && !accountFetchError) {
            // Deduct the amount from account balance
            const { error: deductError } = await supabaseAdmin
              .from('accounts')
              .update({
                balance: parseFloat(account.balance) - parseFloat(transfer.total_amount),
                updated_at: new Date().toISOString()
              })
              .eq('id', transfer.from_account_id);

            if (deductError) {
              console.error('Error deducting from account:', deductError);
              return res.status(500).json({ error: 'Failed to deduct amount from account' });
            }
          }
        }

        // Update related transaction status to pending
        const { data: txApproveResult, error: txApproveError } = await supabaseAdmin
          .from('transactions')
          .update({
            status: 'pending',
            description: `Wire transfer approved and processing`,
            updated_at: new Date().toISOString()
          })
          .eq('reference', `WIRE-${wireTransferId}`)
          .eq('account_id', transfer.from_account_id)
          .select();

        if (txApproveError) {
          console.error('Error updating transaction on approve:', txApproveError);
        } else {
          console.log(`✅ Updated ${txApproveResult?.length || 0} transaction(s) to pending status`);
        }
        emailSubject = `✅ Wire Transfer Approved - ${bankName}`;
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; background-color: #f8f9fa; }
              .info-box { background-color: #d1fae5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .footer { background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
              .amount { font-size: 24px; color: #059669; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">✅ Wire Transfer Approved</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">${bankName}</p>
              </div>
              <div class="content">
                <p>Dear ${userName || 'Customer'},</p>
                <div class="info-box">
                  <strong>Great news!</strong> Your wire transfer has been approved and is now being processed.
                </div>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #111827;">Transfer Details:</h3>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Transfer ID:</span>
                    <strong>${wireTransferId.slice(0, 8)}...</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Amount:</span>
                    <span class="amount">$${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Recipient:</span>
                    <strong>${transfer.recipient_name}</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Bank:</span>
                    <strong>${transfer.recipient_bank}</strong>
                  </div>
                  <div class="detail-row" style="border-bottom: none;">
                    <span style="color: #6b7280;">Status:</span>
                    <strong style="color: #059669;">Processing</strong>
                  </div>
                </div>
                <p>Your transfer is now being processed and will be completed shortly. You will receive another notification once the transfer is completed.</p>
                <p>If you have any questions, please contact us:</p>
                <p><strong>📞 Phone:</strong> ${supportPhone}<br>
                <strong>📧 Email:</strong> ${supportEmail}</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${bankName}. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'reject':
        if (!reason) {
          return res.status(400).json({ error: 'Rejection reason is required' });
        }
        updateData.status = 'rejected';
        updateData.rejection_reason = reason;
        updateData.rejected_by = adminId;
        updateData.rejected_at = new Date().toISOString();
        if (adminNotes) updateData.admin_notes = adminNotes;

        newStatus = 'rejected';

        // Find and update the related transaction to 'cancelled' status
        const { data: relatedTransactions, error: txFindError } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('reference', `WIRE-${wireTransferId}`)
          .eq('account_id', transfer.from_account_id);

        if (txFindError) {
          console.error('Error finding transaction:', txFindError);
        }

        // Handle the transaction - it might be an array or single result
        const relatedTransaction = relatedTransactions && relatedTransactions.length > 0 ? relatedTransactions[0] : null;

        if (relatedTransaction) {
          // Update transaction to cancelled
          const { error: txUpdateError } = await supabaseAdmin
            .from('transactions')
            .update({
              status: 'cancelled',
              description: `Wire transfer rejected: ${reason}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', relatedTransaction.id);

          if (txUpdateError) {
            console.error('Error updating transaction:', txUpdateError);
          } else {
            console.log(`✅ Transaction ${relatedTransaction.id} updated to cancelled`);
          }

          // Only refund if not already refunded (check if transaction was pending)
          if (relatedTransaction.status === 'pending') {
            const { data: account, error: accountFetchError } = await supabaseAdmin
              .from('accounts')
              .select('balance')
              .eq('id', transfer.from_account_id)
              .single();

            if (account && !accountFetchError) {
              const { error: refundError } = await supabaseAdmin
                .from('accounts')
                .update({
                  balance: parseFloat(account.balance) + parseFloat(transfer.total_amount),
                  updated_at: new Date().toISOString()
                })
                .eq('id', transfer.from_account_id);

              if (refundError) {
                console.error('Error refunding account:', refundError);
              } else {
                console.log(`✅ Account refunded: ${transfer.total_amount}`);
                // Create a refund transaction record
                const { error: refundTxError } = await supabaseAdmin
                  .from('transactions')
                  .insert({
                    user_id: transfer.user_id,
                    account_id: transfer.from_account_id,
                    type: 'credit',
                    amount: transfer.total_amount,
                    description: `Refund for rejected wire transfer - ${reason}`,
                    reference: `WIRE-REFUND-${wireTransferId}`,
                    status: 'completed',
                    balance_before: account.balance,
                    balance_after: parseFloat(account.balance) + parseFloat(transfer.total_amount)
                  });

                if (refundTxError) {
                  console.error('Error creating refund transaction:', refundTxError);
                }
              }
            }
          }
        } else {
          console.log('⚠️ No related transaction found to update');
        }
        emailSubject = `Important: Wire Transfer Request Update - ${bankName}`;
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 40px 30px; text-align: center; }
              .content { padding: 40px 30px; }
              .info-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 8px; }
              .detail-card { background: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; }
              .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
              .detail-row:last-child { border-bottom: none; }
              .refund-notice { background-color: #d1fae5; border-left: 4px solid #059669; padding: 20px; margin: 25px 0; border-radius: 8px; }
              .action-section { background-color: #eff6ff; padding: 25px; border-radius: 12px; margin: 25px 0; }
              .footer { background-color: #f7fafc; padding: 30px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; }
              .contact-info { margin: 20px 0; }
              .contact-item { display: inline-block; margin: 0 15px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Wire Transfer Request Update</h1>
                <p style="margin: 12px 0 0 0; opacity: 0.95; font-size: 16px;">${bankName}</p>
              </div>

              <div class="content">
                <p style="font-size: 16px; margin: 0 0 20px 0;">Dear ${userName || 'Valued Customer'},</p>

                <p style="font-size: 16px; line-height: 1.8; margin: 0 0 25px 0;">
                  We appreciate you choosing ${bankName} for your wire transfer needs. After careful review of your recent wire transfer request, we are unable to process this transaction at this time.
                </p>

                <div class="detail-card">
                  <h3 style="margin: 0 0 20px 0; color: #1e40af; font-size: 18px; font-weight: 600;">Transfer Details</h3>
                  <div class="detail-row">
                    <span style="color: #64748b; font-weight: 500;">Reference Number:</span>
                    <strong style="font-family: monospace; font-size: 14px;">${wireTransferId.slice(0, 13)}</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #64748b; font-weight: 500;">Transfer Amount:</span>
                    <strong style="font-size: 18px; color: #1e40af;">$${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #64748b; font-weight: 500;">Recipient Name:</span>
                    <strong>${transfer.recipient_name}</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #64748b; font-weight: 500;">Recipient Bank:</span>
                    <strong>${transfer.recipient_bank}</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #64748b; font-weight: 500;">Current Status:</span>
                    <strong style="color: #dc2626;">Unable to Process</strong>
                  </div>
                </div>

                <div class="info-box">
                  <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px; font-weight: 600;">📋 Why This Occurred</h3>
                  <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #78350f;">
                    ${reason === 'Insufficient documentation' ? 'We require additional documentation to verify this transfer. Please ensure all required documents are submitted and accurate.' :
                      reason === 'Suspicious activity detected' ? 'Our security systems have flagged this transaction for review as part of our commitment to protecting your account. We take the security of your funds very seriously.' :
                      reason === 'Invalid beneficiary information' ? 'The recipient information provided does not match our records or contains errors. Please verify and resubmit with accurate beneficiary details.' :
                      reason === 'Compliance requirements not met' ? 'This transfer does not meet certain regulatory compliance requirements. Additional information or documentation may be needed to proceed.' :
                      reason === 'Duplicate transfer request' ? 'Our records indicate a similar transfer was recently processed or is pending. Please verify this is not a duplicate request.' :
                      reason === 'Account restrictions' ? 'Your account currently has restrictions that prevent this type of transaction. Please contact us to resolve any outstanding issues.' :
                      reason}
                  </p>
                </div>

                <div class="refund-notice">
                  <h3 style="margin: 0 0 12px 0; color: #065f46; font-size: 16px; font-weight: 600;">✓ Account Refund Processed</h3>
                  <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #047857;">
                    The transfer amount of <strong>$${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> has been returned to your account. The funds are now available for your use.
                  </p>
                </div>

                <div class="action-section">
                  <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px; font-weight: 600;">What You Can Do Next</h3>
                  <ul style="margin: 0; padding-left: 20px; color: #1e40af; line-height: 1.9;">
                    <li style="margin-bottom: 8px;">Contact our support team for detailed clarification</li>
                    <li style="margin-bottom: 8px;">Submit a new transfer request with corrected information</li>
                    <li style="margin-bottom: 8px;">Provide any additional documentation that may be required</li>
                    <li style="margin-bottom: 8px;">Speak with a banking specialist about alternative transfer options</li>
                  </ul>
                </div>

                <p style="font-size: 16px; line-height: 1.8; margin: 25px 0;">
                  We understand this may be inconvenient, and we're here to help you complete your transfer successfully. Our team is ready to assist you with any questions or concerns.
                </p>

                <div class="contact-info">
                  <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px; font-weight: 600; text-align: center;">Need Assistance?</h3>
                  <div style="text-align: center;">
                    <div class="contact-item">
                      <strong style="color: #1e40af;">📞 Phone:</strong> <a href="tel:${supportPhone}" style="color: #3b82f6; text-decoration: none;">${supportPhone}</a>
                    </div>
                    <div class="contact-item">
                      <strong style="color: #1e40af;">📧 Email:</strong> <a href="mailto:${supportEmail}" style="color: #3b82f6; text-decoration: none;">${supportEmail}</a>
                    </div>
                  </div>
                  <p style="text-align: center; margin: 15px 0 0 0; font-size: 14px; color: #64748b;">
                    Available 24/7 for your convenience
                  </p>
                </div>

                <p style="font-size: 15px; margin: 30px 0 0 0; color: #64748b;">
                  Thank you for your understanding and for banking with ${bankName}.
                </p>
              </div>

              <div class="footer">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e40af;">
                  ${bankName}
                </p>
                <p style="margin: 0 0 15px 0;">
                  &copy; ${new Date().getFullYear()} ${bankName}. All rights reserved.
                </p>
                <p style="margin: 0; font-size: 12px; opacity: 0.8;">
                  This is an automated notification. Please do not reply directly to this email.<br>
                  For assistance, please use the contact information provided above.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'cancel':
        if (!reason) {
          return res.status(400).json({ error: 'Cancellation reason is required' });
        }
        if (!['pending', 'processing', 'on_hold', 'rejected'].includes(transfer.status)) {
          return res.status(400).json({ error: 'Cannot cancel a completed, failed, or already cancelled transfer' });
        }
        updateData.status = 'cancelled';
        updateData.cancellation_reason = reason;
        updateData.cancelled_by = adminId;
        updateData.cancelled_at = new Date().toISOString();
        if (adminNotes) updateData.admin_notes = adminNotes;

        newStatus = 'cancelled';

        // Find and update the related transaction to 'cancelled' status
        const { data: relatedCancelTransactions, error: txCancelFindError } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('reference', `WIRE-${wireTransferId}`)
          .eq('account_id', transfer.from_account_id);

        if (txCancelFindError) {
          console.error('Error finding transaction:', txCancelFindError);
        }

        const relatedCancelTransaction = relatedCancelTransactions && relatedCancelTransactions.length > 0 ? relatedCancelTransactions[0] : null;

        if (relatedCancelTransaction) {
          // Update transaction to cancelled
          const { error: txCancelUpdateError } = await supabaseAdmin
            .from('transactions')
            .update({
              status: 'cancelled',
              description: `Wire transfer cancelled - ${reason}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', relatedCancelTransaction.id);

          if (txCancelUpdateError) {
            console.error('Error updating transaction:', txCancelUpdateError);
          } else {
            console.log(`✅ Transaction ${relatedCancelTransaction.id} updated to cancelled`);
          }

          // Only refund if not already refunded (check if transaction was pending or completed)
          if (['pending', 'completed'].includes(relatedCancelTransaction.status)) {
            const { data: cancelAccount, error: cancelAccountFetchError } = await supabaseAdmin
              .from('accounts')
              .select('balance')
              .eq('id', transfer.from_account_id)
              .single();

            if (cancelAccount && !cancelAccountFetchError) {
              const { error: cancelRefundError } = await supabaseAdmin
                .from('accounts')
                .update({
                  balance: parseFloat(cancelAccount.balance) + parseFloat(transfer.total_amount),
                  updated_at: new Date().toISOString()
                })
                .eq('id', transfer.from_account_id);

              if (cancelRefundError) {
                console.error('Error refunding account:', cancelRefundError);
              } else {
                console.log(`✅ Account refunded: ${transfer.total_amount}`);
                // Create a refund transaction record
                const { error: refundTxError } = await supabaseAdmin
                  .from('transactions')
                  .insert({
                    user_id: transfer.user_id,
                    account_id: transfer.from_account_id,
                    type: 'credit',
                    amount: transfer.total_amount,
                    description: `Refund for cancelled wire transfer - ${reason}`,
                    reference: `WIRE-REFUND-${wireTransferId}`,
                    status: 'completed',
                    balance_before: cancelAccount.balance,
                    balance_after: parseFloat(cancelAccount.balance) + parseFloat(transfer.total_amount)
                  });

                if (refundTxError) {
                  console.error('Error creating refund transaction:', refundTxError);
                }
              }
            }
          }
        } else {
          console.log('⚠️ No related transaction found to update');
        }
        emailSubject = `⚠️ Wire Transfer Cancelled - ${bankName}`;
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; background-color: #f8f9fa; }
              .warning-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .footer { background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">⚠️ Wire Transfer Cancelled</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">${bankName}</p>
              </div>
              <div class="content">
                <p>Dear ${userName || 'Customer'},</p>
                <p>Your wire transfer has been cancelled.</p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <div class="detail-row">
                    <span style="color: #6b7280;">Transfer ID:</span>
                    <strong>${wireTransferId.slice(0, 8)}...</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Amount:</span>
                    <strong>$${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Recipient:</span>
                    <strong>${transfer.recipient_name}</strong>
                  </div>
                  <div class="detail-row" style="border-bottom: none;">
                    <span style="color: #6b7280;">Status:</span>
                    <strong style="color: #f59e0b;">Cancelled</strong>
                  </div>
                </div>
                <div class="warning-box">
                  <strong>Reason for Cancellation:</strong><br>
                  ${reason}
                </div>
                <p>If you have any questions about this cancellation, please contact us.</p>
                <p><strong>📞 Phone:</strong> ${supportPhone}<br>
                <strong>📧 Email:</strong> ${supportEmail}</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${bankName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'reverse':
        if (!reason) {
          return res.status(400).json({ error: 'Reversal reason is required' });
        }
        if (transfer.status !== 'completed') {
          return res.status(400).json({ error: 'Only completed transfers can be reversed' });
        }
        updateData.status = 'reversed';
        updateData.reversal_reason = reason;
        updateData.reversed_by = adminId;
        updateData.reversed_at = new Date().toISOString();
        if (adminNotes) updateData.admin_notes = adminNotes;

        newStatus = 'reversed';

        // Update related transaction to reversed
        const { error: txReverseError } = await supabaseAdmin
          .from('transactions')
          .update({
            status: 'reversed',
            description: `Wire transfer reversed - ${reason}`,
            updated_at: new Date().toISOString()
          })
          .eq('reference', `WIRE-${wireTransferId}`)
          .eq('account_id', transfer.from_account_id);

        if (txReverseError) {
          console.error('Error updating transaction for reversal:', txReverseError);
        } else {
          console.log(`✅ Transaction updated to reversed`);
        }

        // Refund the account balance
        const { data: reverseAccount, error: reverseAccountFetchError } = await supabaseAdmin
          .from('accounts')
          .select('balance')
          .eq('id', transfer.from_account_id)
          .single();

        if (reverseAccount && !reverseAccountFetchError) {
          const { error: reverseRefundError } = await supabaseAdmin
            .from('accounts')
            .update({
              balance: parseFloat(reverseAccount.balance) + parseFloat(transfer.total_amount),
              updated_at: new Date().toISOString()
            })
            .eq('id', transfer.from_account_id);

          if (!reverseRefundError) {
            console.log(`✅ Account refunded for reversal: ${transfer.total_amount}`);
            // Create a reversal transaction record
            const { error: reversalTxError } = await supabaseAdmin
              .from('transactions')
              .insert({
                user_id: transfer.user_id,
                account_id: transfer.from_account_id,
                type: 'credit',
                amount: transfer.total_amount,
                description: `Reversal of wire transfer - ${reason}`,
                reference: `WIRE-REVERSAL-${wireTransferId}`,
                status: 'completed',
                balance_before: reverseAccount.balance,
                balance_after: parseFloat(reverseAccount.balance) + parseFloat(transfer.total_amount)
              });

            if (reversalTxError) {
              console.error('Error creating reversal transaction:', reversalTxError);
            }
          } else {
            console.error('Error refunding account for reversal:', reverseRefundError);
          }
        }
        emailSubject = `🔄 Wire Transfer Reversed - ${bankName}`;
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; background-color: #f8f9fa; }
              .info-box { background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .footer { background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🔄 Wire Transfer Reversed</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">${bankName}</p>
              </div>
              <div class="content">
                <p>Dear ${userName || 'Customer'},</p>
                <p>Your wire transfer has been reversed and the funds will be returned to your account.</p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <div class="detail-row">
                    <span style="color: #6b7280;">Transfer ID:</span>
                    <strong>${wireTransferId.slice(0, 8)}...</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Amount Being Returned:</span>
                    <strong style="color: #3b82f6; font-size: 18px;">$${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Original Recipient:</span>
                    <strong>${transfer.recipient_name}</strong>
                  </div>
                  <div class="detail-row" style="border-bottom: none;">
                    <span style="color: #6b7280;">Status:</span>
                    <strong style="color: #3b82f6;">Reversed</strong>
                  </div>
                </div>
                <div class="info-box">
                  <strong>Reason for Reversal:</strong><br>
                  ${reason}
                </div>
                <p>The funds should be credited back to your account within 1-3 business days.</p>
                <p><strong>📞 Phone:</strong> ${supportPhone}<br>
                <strong>📧 Email:</strong> ${supportEmail}</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${bankName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'hold':
        if (!reason) {
          return res.status(400).json({ error: 'Hold reason is required' });
        }
        if (!['pending', 'processing'].includes(transfer.status)) {
          return res.status(400).json({ error: 'Can only place pending or processing transfers on hold' });
        }
        updateData.status = 'on_hold';
        updateData.hold_reason = reason;
        updateData.held_by = adminId;
        updateData.held_at = new Date().toISOString();
        if (adminNotes) updateData.admin_notes = adminNotes;

        newStatus = 'on_hold';

        // Update related transaction status to hold
        const { error: txHoldError } = await supabaseAdmin
          .from('transactions')
          .update({
            status: 'hold',
            description: `Wire transfer on hold - ${reason}`,
            updated_at: new Date().toISOString()
          })
          .eq('reference', `WIRE-${wireTransferId}`)
          .eq('account_id', transfer.from_account_id);

        if (txHoldError) {
          console.error('Error updating transaction for hold:', txHoldError);
        } else {
          console.log(`✅ Transaction updated to hold`);
        }
        emailSubject = `⏸️ Wire Transfer On Hold - ${bankName}`;
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; background-color: #f8f9fa; }
              .warning-box { background-color: #ffedd5; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .footer { background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">⏸️ Wire Transfer On Hold</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">${bankName}</p>
              </div>
              <div class="content">
                <p>Dear ${userName || 'Customer'},</p>
                <p>Your wire transfer has been temporarily placed on hold for review.</p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <div class="detail-row">
                    <span style="color: #6b7280;">Transfer ID:</span>
                    <strong>${wireTransferId.slice(0, 8)}...</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Amount:</span>
                    <strong>$${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Recipient:</span>
                    <strong>${transfer.recipient_name}</strong>
                  </div>
                  <div class="detail-row" style="border-bottom: none;">
                    <span style="color: #6b7280;">Status:</span>
                    <strong style="color: #f97316;">On Hold</strong>
                  </div>
                </div>
                <div class="warning-box">
                  <strong>Reason for Hold:</strong><br>
                  ${reason}
                </div>
                <p>We will review your transfer and contact you shortly. No action is required from your end at this time.</p>
                <p><strong>📞 Phone:</strong> ${supportPhone}<br>
                <strong>📧 Email:</strong> ${supportEmail}</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${bankName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'release':
        if (transfer.status !== 'on_hold') {
          return res.status(400).json({ error: 'Only transfers on hold can be released' });
        }
        updateData.status = 'processing';
        updateData.released_at = new Date().toISOString();
        updateData.released_by = adminId;
        if (adminNotes) updateData.admin_notes = adminNotes;

        newStatus = 'processing';

        // Update related transaction status
        const { error: txReleaseError } = await supabaseAdmin
          .from('transactions')
          .update({
            status: 'pending',
            description: `Wire transfer released from hold and processing`,
            updated_at: new Date().toISOString()
          })
          .eq('reference', `WIRE-${wireTransferId}`)
          .eq('account_id', transfer.from_account_id);

        if (txReleaseError) {
          console.error('Error updating transaction for release:', txReleaseError);
        } else {
          console.log(`✅ Transaction updated for release`);
        }
        emailSubject = `▶️ Wire Transfer Released - ${bankName}`;
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; background-color: #f8f9fa; }
              .info-box { background-color: #d1fae5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .footer { background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">▶️ Wire Transfer Released</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">${bankName}</p>
              </div>
              <div class="content">
                <p>Dear ${userName || 'Customer'},</p>
                <div class="info-box">
                  <strong>Good news!</strong> Your wire transfer has been released from hold and is now being processed.
                </div>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <div class="detail-row">
                    <span style="color: #6b7280;">Transfer ID:</span>
                    <strong>${wireTransferId.slice(0, 8)}...</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Amount:</span>
                    <strong style="color: #059669; font-size: 18px;">$${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Recipient:</span>
                    <strong>${transfer.recipient_name}</strong>
                  </div>
                  <div class="detail-row" style="border-bottom: none;">
                    <span style="color: #6b7280;">Status:</span>
                    <strong style="color: #059669;">Processing</strong>
                  </div>
                </div>
                <p>Your transfer is now being processed and will be completed shortly.</p>
                <p><strong>📞 Phone:</strong> ${supportPhone}<br>
                <strong>📧 Email:</strong> ${supportEmail}</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${bankName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'complete':
        if (transfer.status !== 'processing') {
          return res.status(400).json({ error: 'Only processing transfers can be marked as completed' });
        }
        updateData.status = 'completed';
        updateData.processed_at = new Date().toISOString();
        if (adminNotes) updateData.admin_notes = adminNotes;

        newStatus = 'completed';

        // Update related transaction status to completed
        const { error: txCompleteError } = await supabaseAdmin
          .from('transactions')
          .update({
            status: 'completed',
            description: `Wire transfer completed successfully`,
            updated_at: new Date().toISOString()
          })
          .eq('reference', `WIRE-${wireTransferId}`)
          .eq('account_id', transfer.from_account_id);

        if (txCompleteError) {
          console.error('Error updating transaction to completed:', txCompleteError);
        } else {
          console.log(`✅ Transaction updated to completed`);
        }
        emailSubject = `✅ Wire Transfer Completed - ${bankName}`;
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; background-color: #f8f9fa; }
              .success-box { background-color: #d1fae5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .footer { background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
              .amount { font-size: 24px; color: #059669; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">✅ Wire Transfer Completed</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">${bankName}</p>
              </div>
              <div class="content">
                <p>Dear ${userName || 'Customer'},</p>
                <div class="success-box">
                  <strong>Success!</strong> Your wire transfer has been completed successfully.
                </div>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #111827;">Transfer Details:</h3>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Transfer ID:</span>
                    <strong>${wireTransferId.slice(0, 8)}...</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Amount Transferred:</span>
                    <span class="amount">$${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Recipient:</span>
                    <strong>${transfer.recipient_name}</strong>
                  </div>
                  <div class="detail-row">
                    <span style="color: #6b7280;">Bank:</span>
                    <strong>${transfer.recipient_bank}</strong>
                  </div>
                  <div class="detail-row" style="border-bottom: none;">
                    <span style="color: #6b7280;">Status:</span>
                    <strong style="color: #059669;">Completed</strong>
                  </div>
                </div>
                <p>The funds have been successfully transferred to the recipient's account.</p>
                <p>Thank you for banking with us!</p>
                <p><strong>📞 Phone:</strong> ${supportPhone}<br>
                <strong>📧 Email:</strong> ${supportEmail}</p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${bankName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'delete':
        // Delete the wire transfer completely

        // First, find ALL related transactions using LIKE pattern to catch all variations
        const { data: relatedDeleteTransactions, error: txDeleteFindError } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .or(`reference.eq.WIRE-${wireTransferId},reference.like.WIRE-REFUND-${wireTransferId}%,reference.like.WIRE-REVERSAL-${wireTransferId}%`)
          .eq('account_id', transfer.from_account_id);

        if (txDeleteFindError) {
          console.error('Error finding related transactions:', txDeleteFindError);
        }

        console.log(`Found ${relatedDeleteTransactions?.length || 0} related transactions to delete for wire transfer ${wireTransferId}`);

        // Refund account if there are pending or completed transactions
        if (relatedDeleteTransactions && relatedDeleteTransactions.length > 0) {
          const pendingOrCompletedTx = relatedDeleteTransactions.find(tx => 
            ['pending', 'completed'].includes(tx.status)
          );

          if (pendingOrCompletedTx) {
            const { data: deleteAccount, error: deleteAccountFetchError } = await supabaseAdmin
              .from('accounts')
              .select('balance')
              .eq('id', transfer.from_account_id)
              .single();

            if (deleteAccount && !deleteAccountFetchError) {
              const refundAmount = parseFloat(transfer.total_amount);
              const newBalance = parseFloat(deleteAccount.balance) + refundAmount;

              const { error: refundError } = await supabaseAdmin
                .from('accounts')
                .update({
                  balance: newBalance,
                  updated_at: new Date().toISOString()
                })
                .eq('id', transfer.from_account_id);

              if (refundError) {
                console.error('Error refunding account:', refundError);
              } else {
                console.log(`✅ Account refunded: $${refundAmount.toFixed(2)}, new balance: $${newBalance.toFixed(2)}`);
              }
            }
          }

          // Delete all related transactions
          for (const tx of relatedDeleteTransactions) {
            const { error: txDeleteError } = await supabaseAdmin
              .from('transactions')
              .delete()
              .eq('id', tx.id);

            if (txDeleteError) {
              console.error(`Error deleting transaction ${tx.id}:`, txDeleteError);
            } else {
              console.log(`✅ Deleted transaction ${tx.id} (reference: ${tx.reference})`);
            }
          }
        }

        // Delete the wire transfer
        const { error: deleteError } = await supabaseAdmin
          .from('wire_transfers')
          .delete()
          .eq('id', wireTransferId);

        if (deleteError) {
          console.error('Error deleting wire transfer:', deleteError);
          return res.status(500).json({ error: 'Failed to delete wire transfer', details: deleteError.message });
        }

        console.log(`✅ Wire transfer ${wireTransferId} deleted successfully`);

        return res.status(200).json({
          success: true,
          message: 'Wire transfer and all related transactions deleted successfully',
          deleted: true,
          transactionsDeleted: relatedDeleteTransactions?.length || 0
        });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const { data: updatedTransfer, error: updateError } = await supabaseAdmin
      .from('wire_transfers')
      .update(updateData)
      .eq('id', wireTransferId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating wire transfer:', updateError);
      return res.status(500).json({ error: 'Failed to update wire transfer', details: updateError.message });
    }

    // Send email notification
    if (userEmail && emailSubject && emailHtml) {
      try {
        await sendEmail({
          to: userEmail,
          subject: emailSubject,
          html: emailHtml,
          type: EMAIL_TYPES.NOTIFY
        });

        console.log(`✅ Email notification sent successfully to ${userEmail} for ${action} action`);
      } catch (emailError) {
        console.error('❌ Failed to send email notification:', emailError);
        // Don't fail the entire operation if email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: `Wire transfer ${action}ed successfully`,
      transfer: updatedTransfer,
      newStatus,
      emailSent: !!(userEmail && emailSubject && emailHtml)
    });
  } catch (error) {
    console.error('Error in update-wire-transfer-status:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}