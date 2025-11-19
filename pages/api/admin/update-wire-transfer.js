
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
  const {
    wireTransferId,
    transfer_type,
    recipient_name,
    recipient_account,
    recipient_bank,
    recipient_bank_address,
    swift_code,
    routing_number,
    amount,
    fee,
    urgent_transfer,
    reference,
    description,
    status,
    created_at,
    updated_at,
    manuallyEditUpdatedAt,
    userEmail,
    userName
  } = req.body;

  if (!wireTransferId) {
    return res.status(400).json({ error: 'Wire transfer ID is required' });
  }

  try {
    // Get the existing wire transfer
    const { data: existingTransfer, error: fetchError } = await supabaseAdmin
      .from('wire_transfers')
      .select('*')
      .eq('id', wireTransferId)
      .single();

    if (fetchError || !existingTransfer) {
      return res.status(404).json({ error: 'Wire transfer not found' });
    }

    const oldStatus = existingTransfer.status;
    const newStatus = status;
    const oldAmount = parseFloat(existingTransfer.total_amount);
    const newTotalAmount = parseFloat(amount) + parseFloat(fee || 0);

    let updateData = {
      transfer_type,
      recipient_name,
      recipient_account,
      recipient_bank,
      recipient_bank_address,
      swift_code,
      routing_number,
      amount: parseFloat(amount),
      fee: parseFloat(fee || 0),
      total_amount: newTotalAmount,
      urgent_transfer,
      reference,
      description,
      status: newStatus,
      created_at: new Date(created_at).toISOString(),
      updated_at: manuallyEditUpdatedAt ? new Date(updated_at).toISOString() : new Date().toISOString(),
      updated_by: adminId
    };

    // Handle status changes that require refunds
    if (oldStatus !== newStatus) {
      // If changing FROM pending TO cancelled or rejected, issue refund
      if (oldStatus === 'pending' && ['cancelled', 'rejected'].includes(newStatus)) {
        const { data: account, error: accountError } = await supabaseAdmin
          .from('accounts')
          .select('balance')
          .eq('id', existingTransfer.from_account_id)
          .single();

        if (account && !accountError) {
          const refundAmount = oldAmount;
          const newBalance = parseFloat(account.balance) + refundAmount;

          // Refund to account
          const { error: refundError } = await supabaseAdmin
            .from('accounts')
            .update({
              balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTransfer.from_account_id);

          if (refundError) {
            console.error('Error refunding account:', refundError);
            return res.status(500).json({ error: 'Failed to refund account balance' });
          }

          // Update transaction to cancelled
          const { error: txError } = await supabaseAdmin
            .from('transactions')
            .update({
              status: 'cancelled',
              description: `Wire transfer ${newStatus} - refunded`,
              updated_at: new Date().toISOString()
            })
            .eq('reference', `WIRE-${wireTransferId}`)
            .eq('account_id', existingTransfer.from_account_id);

          if (txError) {
            console.error('Error updating transaction:', txError);
          }

          // Create refund transaction
          await supabaseAdmin
            .from('transactions')
            .insert({
              user_id: existingTransfer.user_id,
              account_id: existingTransfer.from_account_id,
              type: 'credit',
              amount: refundAmount,
              description: `Refund for ${newStatus} wire transfer`,
              reference: `WIRE-REFUND-${wireTransferId}`,
              status: 'completed',
              balance_before: account.balance,
              balance_after: newBalance
            });

          console.log(`✅ Account refunded: $${refundAmount.toFixed(2)}`);
        }
      }

      // If changing FROM cancelled/rejected TO pending, deduct from account
      if (['cancelled', 'rejected'].includes(oldStatus) && newStatus === 'pending') {
        const { data: account, error: accountError } = await supabaseAdmin
          .from('accounts')
          .select('balance')
          .eq('id', existingTransfer.from_account_id)
          .single();

        if (account && !accountError) {
          const deductAmount = newTotalAmount;
          const newBalance = parseFloat(account.balance) - deductAmount;

          if (newBalance < 0) {
            return res.status(400).json({ error: 'Insufficient account balance' });
          }

          // Deduct from account
          const { error: deductError } = await supabaseAdmin
            .from('accounts')
            .update({
              balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTransfer.from_account_id);

          if (deductError) {
            console.error('Error deducting from account:', deductError);
            return res.status(500).json({ error: 'Failed to deduct from account balance' });
          }

          // Update or create transaction
          const { error: txError } = await supabaseAdmin
            .from('transactions')
            .update({
              status: 'pending',
              description: `Wire transfer to ${recipient_name}`,
              updated_at: new Date().toISOString()
            })
            .eq('reference', `WIRE-${wireTransferId}`)
            .eq('account_id', existingTransfer.from_account_id);

          if (txError) {
            console.error('Error updating transaction:', txError);
          }

          console.log(`✅ Account debited: $${deductAmount.toFixed(2)}`);
        }
      }
    }

    // Update the wire transfer
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

    // Send email notification if status changed
    if (oldStatus !== newStatus && userEmail) {
      try {
        const emailSubject = `Wire Transfer Updated - Status: ${newStatus.replace('_', ' ').toUpperCase()}`;
        const emailHtml = `
          <h2>Wire Transfer Update</h2>
          <p>Dear ${userName || 'Customer'},</p>
          <p>Your wire transfer has been updated.</p>
          <p><strong>Transfer ID:</strong> ${wireTransferId.slice(0, 13)}</p>
          <p><strong>Previous Status:</strong> ${oldStatus.replace('_', ' ').toUpperCase()}</p>
          <p><strong>New Status:</strong> ${newStatus.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Amount:</strong> $${newTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <p><strong>Recipient:</strong> ${recipient_name}</p>
        `;

        await sendEmail({
          to: userEmail,
          subject: emailSubject,
          html: emailHtml,
          type: EMAIL_TYPES.NOTIFY
        });

        console.log(`✅ Email notification sent to ${userEmail}`);
      } catch (emailError) {
        console.error('❌ Failed to send email notification:', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Wire transfer updated successfully',
      transfer: updatedTransfer,
      statusChanged: oldStatus !== newStatus,
      refunded: oldStatus === 'pending' && ['cancelled', 'rejected'].includes(newStatus)
    });
  } catch (error) {
    console.error('Error in update-wire-transfer:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
