
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

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

    let updateData = {
      updated_at: new Date().toISOString(),
      updated_by: adminId
    };

    let newStatus = transfer.status;
    let emailSubject = '';
    let emailHtml = '';

    const bankName = process.env.BANK_NAME || 'Oakline Bank';
    const supportEmail = process.env.EMAIL_SUPPORT || `support@${process.env.BANK_EMAIL_DOMAIN || 'theoaklinebank.com'}`;
    const supportPhone = process.env.BANK_PHONE || '+1 (636) 635-6122';

    switch (action) {
      case 'approve':
        if (transfer.status !== 'pending') {
          return res.status(400).json({ error: 'Only pending transfers can be approved' });
        }
        updateData.status = 'processing';
        updateData.approved_by = adminId;
        updateData.approved_at = new Date().toISOString();
        if (adminNotes) updateData.admin_notes = adminNotes;
        
        newStatus = 'processing';
        
        // Update related transaction status to processing
        const { error: txApproveError } = await supabaseAdmin
          .from('transactions')
          .update({
            status: 'pending',
            description: `Wire transfer approved and processing`,
            updated_at: new Date().toISOString()
          })
          .eq('reference', `WIRE-${wireTransferId}`)
          .eq('account_id', transfer.from_account_id);
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
        const { data: relatedTransaction, error: txFindError } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('reference', `WIRE-${wireTransferId}`)
          .eq('account_id', transfer.from_account_id)
          .single();

        if (relatedTransaction && relatedTransaction.status === 'pending') {
          // Update transaction to cancelled and refund the account
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
          }

          // Refund the account balance
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
              // Create a refund transaction record
              await supabaseAdmin
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
            }
          }
        }
        emailSubject = `❌ Wire Transfer Rejected - ${bankName}`;
        emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; background-color: #f8f9fa; }
              .warning-box { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .footer { background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">❌ Wire Transfer Rejected</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">${bankName}</p>
              </div>
              <div class="content">
                <p>Dear ${userName || 'Customer'},</p>
                <p>We regret to inform you that your wire transfer request has been rejected.</p>
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
                    <strong style="color: #dc2626;">Rejected</strong>
                  </div>
                </div>
                <div class="warning-box">
                  <strong>Reason for Rejection:</strong><br>
                  ${reason}
                </div>
                <p>If you believe this was rejected in error or need further clarification, please contact our support team.</p>
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

      case 'cancel':
        if (!reason) {
          return res.status(400).json({ error: 'Cancellation reason is required' });
        }
        if (!['pending', 'processing', 'on_hold'].includes(transfer.status)) {
          return res.status(400).json({ error: 'Cannot cancel a completed, failed, or already cancelled transfer' });
        }
        updateData.status = 'cancelled';
        updateData.cancellation_reason = reason;
        updateData.cancelled_by = adminId;
        updateData.cancelled_at = new Date().toISOString();
        if (adminNotes) updateData.admin_notes = adminNotes;
        
        newStatus = 'cancelled';
        
        // Find and update the related transaction to 'cancelled' status
        const { data: relatedCancelTransaction, error: txCancelFindError } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('reference', `WIRE-${wireTransferId}`)
          .eq('account_id', transfer.from_account_id)
          .single();

        if (relatedCancelTransaction && relatedCancelTransaction.status === 'pending') {
          // Update transaction to cancelled and refund the account
          const { error: txCancelUpdateError } = await supabaseAdmin
            .from('transactions')
            .update({
              status: 'cancelled',
              description: `Wire transfer cancelled: ${reason}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', relatedCancelTransaction.id);

          if (txCancelUpdateError) {
            console.error('Error updating transaction:', txCancelUpdateError);
          }

          // Refund the account balance
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
              // Create a refund transaction record
              await supabaseAdmin
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
            }
          }
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
            description: `Wire transfer reversed: ${reason}`,
            updated_at: new Date().toISOString()
          })
          .eq('reference', `WIRE-${wireTransferId}`)
          .eq('account_id', transfer.from_account_id);

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
            // Create a reversal transaction record
            await supabaseAdmin
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
