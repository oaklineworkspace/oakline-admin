import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

const VALID_ACTIONS = ['approve', 'reject', 'cancel', 'reverse', 'hold', 'release', 'complete'];

const REASON_OPTIONS = {
  reject: [
    'Insufficient documentation',
    'Suspicious activity detected',
    'Invalid beneficiary information',
    'Compliance requirements not met',
    'Duplicate transfer request',
    'Account restrictions',
    'Other'
  ],
  cancel: [
    'User request',
    'Duplicate transaction',
    'Incorrect details',
    'Fraudulent activity suspected',
    'System error',
    'Other'
  ],
  reverse: [
    'User request',
    'Sent to wrong account',
    'Duplicate transaction',
    'Incorrect amount',
    'Fraudulent transaction',
    'Bank error',
    'Other'
  ],
  hold: [
    'Under investigation',
    'Additional verification required',
    'Compliance review',
    'Suspicious activity',
    'Large amount verification',
    'Other'
  ]
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  const adminId = authResult.user.id;
  const adminEmail = authResult.user.email;

  try {
    const { wireTransferId, action, reason, adminNotes, userEmail, userName } = req.body;

    if (!wireTransferId || !action) {
      return res.status(400).json({ error: 'Wire transfer ID and action are required' });
    }

    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

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
        emailSubject = 'Wire Transfer Approved - Processing';
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #059669; margin-bottom: 20px;">✅ Wire Transfer Approved</h2>
              <p>Dear ${userName || 'Customer'},</p>
              <p>Your wire transfer has been approved and is now being processed.</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Transfer ID:</strong> ${wireTransferId}</p>
                <p style="margin: 5px 0;"><strong>Amount:</strong> $${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p style="margin: 5px 0;"><strong>Recipient:</strong> ${transfer.recipient_name}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> Processing</p>
              </div>
              ${adminNotes ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>` : ''}
              <p>The funds will be transferred to the recipient's account shortly.</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you have any questions, please contact our support team.
              </p>
            </div>
          </div>
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
        emailSubject = 'Wire Transfer Rejected';
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #dc2626; margin-bottom: 20px;">❌ Wire Transfer Rejected</h2>
              <p>Dear ${userName || 'Customer'},</p>
              <p>We regret to inform you that your wire transfer request has been rejected.</p>
              <div style="background-color: #fee2e2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
                <p style="margin: 5px 0;"><strong>Transfer ID:</strong> ${wireTransferId}</p>
                <p style="margin: 5px 0;"><strong>Amount:</strong> $${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p style="margin: 5px 0;"><strong>Recipient:</strong> ${transfer.recipient_name}</p>
                <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
              </div>
              ${adminNotes ? `<p><strong>Additional Notes:</strong> ${adminNotes}</p>` : ''}
              <p>If you believe this was an error or would like more information, please contact our support team.</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                You may submit a new wire transfer request after addressing the rejection reason.
              </p>
            </div>
          </div>
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
        emailSubject = 'Wire Transfer Cancelled';
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #f59e0b; margin-bottom: 20px;">⚠️ Wire Transfer Cancelled</h2>
              <p>Dear ${userName || 'Customer'},</p>
              <p>Your wire transfer has been cancelled.</p>
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 5px 0;"><strong>Transfer ID:</strong> ${wireTransferId}</p>
                <p style="margin: 5px 0;"><strong>Amount:</strong> $${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p style="margin: 5px 0;"><strong>Recipient:</strong> ${transfer.recipient_name}</p>
                <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
              </div>
              ${adminNotes ? `<p><strong>Additional Notes:</strong> ${adminNotes}</p>` : ''}
              <p>The transfer has been cancelled and no funds have been transferred.</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you did not request this cancellation, please contact our support team immediately.
              </p>
            </div>
          </div>
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
        emailSubject = 'Wire Transfer Reversed';
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #3b82f6; margin-bottom: 20px;">🔄 Wire Transfer Reversed</h2>
              <p>Dear ${userName || 'Customer'},</p>
              <p>Your wire transfer has been reversed and the funds will be returned to your account.</p>
              <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <p style="margin: 5px 0;"><strong>Transfer ID:</strong> ${wireTransferId}</p>
                <p style="margin: 5px 0;"><strong>Amount to be Refunded:</strong> $${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p style="margin: 5px 0;"><strong>Original Recipient:</strong> ${transfer.recipient_name}</p>
                <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
              </div>
              ${adminNotes ? `<p><strong>Additional Notes:</strong> ${adminNotes}</p>` : ''}
              <p>The funds will be credited back to your account within 3-5 business days.</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you have any questions about this reversal, please contact our support team.
              </p>
            </div>
          </div>
        `;
        break;

      case 'hold':
        if (!reason) {
          return res.status(400).json({ error: 'Hold reason is required' });
        }
        if (!['pending', 'processing'].includes(transfer.status)) {
          return res.status(400).json({ error: 'Only pending or processing transfers can be put on hold' });
        }
        updateData.status = 'on_hold';
        updateData.hold_reason = reason;
        updateData.held_by = adminId;
        updateData.held_at = new Date().toISOString();
        if (adminNotes) updateData.admin_notes = adminNotes;
        
        newStatus = 'on_hold';
        emailSubject = 'Wire Transfer Placed On Hold';
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #f97316; margin-bottom: 20px;">⏸️ Wire Transfer On Hold</h2>
              <p>Dear ${userName || 'Customer'},</p>
              <p>Your wire transfer has been temporarily placed on hold for review.</p>
              <div style="background-color: #ffedd5; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f97316;">
                <p style="margin: 5px 0;"><strong>Transfer ID:</strong> ${wireTransferId}</p>
                <p style="margin: 5px 0;"><strong>Amount:</strong> $${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p style="margin: 5px 0;"><strong>Recipient:</strong> ${transfer.recipient_name}</p>
                <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
              </div>
              ${adminNotes ? `<p><strong>Additional Notes:</strong> ${adminNotes}</p>` : ''}
              <p>We are currently reviewing your transfer. You will be notified once the review is complete and the transfer is released or requires further action.</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you have any questions or need to provide additional information, please contact our support team.
              </p>
            </div>
          </div>
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
        emailSubject = 'Wire Transfer Released - Processing';
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #059669; margin-bottom: 20px;">▶️ Wire Transfer Released</h2>
              <p>Dear ${userName || 'Customer'},</p>
              <p>Good news! Your wire transfer has been released from hold and is now being processed.</p>
              <div style="background-color: #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #059669;">
                <p style="margin: 5px 0;"><strong>Transfer ID:</strong> ${wireTransferId}</p>
                <p style="margin: 5px 0;"><strong>Amount:</strong> $${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p style="margin: 5px 0;"><strong>Recipient:</strong> ${transfer.recipient_name}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> Processing</p>
              </div>
              ${adminNotes ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>` : ''}
              <p>The funds will be transferred to the recipient's account shortly.</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Thank you for your patience during the review process.
              </p>
            </div>
          </div>
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
        emailSubject = 'Wire Transfer Completed Successfully';
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #059669; margin-bottom: 20px;">✅ Wire Transfer Completed</h2>
              <p>Dear ${userName || 'Customer'},</p>
              <p>Your wire transfer has been completed successfully!</p>
              <div style="background-color: #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #059669;">
                <p style="margin: 5px 0;"><strong>Transfer ID:</strong> ${wireTransferId}</p>
                <p style="margin: 5px 0;"><strong>Amount Transferred:</strong> $${parseFloat(transfer.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                <p style="margin: 5px 0;"><strong>Recipient:</strong> ${transfer.recipient_name}</p>
                <p style="margin: 5px 0;"><strong>Recipient Bank:</strong> ${transfer.recipient_bank}</p>
                <p style="margin: 5px 0;"><strong>Completed:</strong> ${new Date().toLocaleString()}</p>
              </div>
              ${adminNotes ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>` : ''}
              <p>The funds have been successfully transferred to the recipient's account. Please allow 1-3 business days for the recipient to receive the funds depending on their bank's processing time.</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Thank you for using our wire transfer service!
              </p>
            </div>
          </div>
        `;
        break;
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
      }
    }

    return res.status(200).json({
      success: true,
      message: `Wire transfer ${action}ed successfully`,
      transfer: updatedTransfer,
      newStatus
    });
  } catch (error) {
    console.error('Error in update-wire-transfer-status:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

export { REASON_OPTIONS };
