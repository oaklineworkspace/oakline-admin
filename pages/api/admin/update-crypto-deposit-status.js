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

  try {
    const { depositId, newStatus, reason, note } = req.body;

    if (!depositId || !newStatus) {
      return res.status(400).json({ error: 'Deposit ID and new status are required' });
    }

    const validStatuses = ['pending', 'on_hold', 'awaiting_confirmations', 'confirmed', 'processing', 'completed', 'failed', 'reversed'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const { data: deposit, error: depositError } = await supabaseAdmin
      .from('crypto_deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (depositError || !deposit) {
      console.error('Error fetching deposit:', depositError);
      return res.status(404).json({ error: 'Deposit not found' });
    }

    const oldStatus = deposit.status;
    let newBalance = null;
    let balanceChanged = false;

    if (newStatus === 'confirmed' || newStatus === 'completed') {
      const { data: account, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', deposit.account_id)
        .single();

      if (accountError || !account) {
        console.error('Error fetching account:', accountError);
        return res.status(404).json({ error: 'Account not found' });
      }

      newBalance = parseFloat(account.balance || 0) + parseFloat(deposit.net_amount || deposit.amount);

      const { error: balanceUpdateError } = await supabaseAdmin
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', account.id);

      if (balanceUpdateError) {
        console.error('Error updating account balance:', balanceUpdateError);
        return res.status(500).json({ error: 'Failed to credit account balance. Deposit status not changed.' });
      }

      balanceChanged = true;
    }

    if (newStatus === 'reversed') {
      const { data: account, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', deposit.account_id)
        .single();

      if (accountError || !account) {
        console.error('Error fetching account:', accountError);
        return res.status(404).json({ error: 'Account not found' });
      }

      newBalance = parseFloat(account.balance || 0) - parseFloat(deposit.net_amount || deposit.amount);

      if (newBalance < 0) {
        return res.status(400).json({ error: 'Cannot reverse deposit: insufficient account balance. Deposit status not changed.' });
      }

      const { error: balanceUpdateError } = await supabaseAdmin
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', account.id);

      if (balanceUpdateError) {
        console.error('Error updating account balance:', balanceUpdateError);
        return res.status(500).json({ error: 'Failed to deduct account balance. Deposit status not changed.' });
      }

      balanceChanged = true;
    }

    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    // Update timestamps and admin references based on status
    if (newStatus === 'confirmed' || newStatus === 'completed') {
      updateData.approved_by = authResult.user.id;
      updateData.approved_at = new Date().toISOString();
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    } else if (newStatus === 'rejected' || newStatus === 'failed') {
      updateData.rejected_by = authResult.user.id;
      updateData.rejected_at = new Date().toISOString();
      if (reason) {
        updateData.rejection_reason = reason;
      }
    } else if (newStatus === 'on_hold') {
      if (reason) {
        updateData.hold_reason = reason;
      }
    } else if (newStatus === 'reversed') {
      if (reason) {
        updateData.rejection_reason = reason;
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('crypto_deposits')
      .update(updateData)
      .eq('id', depositId);

    if (updateError) {
      console.error('Error updating deposit status:', updateError);
      
      if (balanceChanged && newBalance !== null) {
        const { data: account } = await supabaseAdmin
          .from('accounts')
          .select('balance')
          .eq('id', deposit.account_id)
          .single();
        
        if (account) {
          const originalBalance = newStatus === 'reversed' 
            ? parseFloat(account.balance) + parseFloat(deposit.net_amount || deposit.amount)
            : parseFloat(account.balance) - parseFloat(deposit.net_amount || deposit.amount);
          
          await supabaseAdmin
            .from('accounts')
            .update({ balance: originalBalance })
            .eq('id', deposit.account_id);
        }
      }
      
      return res.status(500).json({ error: 'Failed to update deposit status. Balance changes have been rolled back.' });
    }

    const auditLogData = {
      deposit_id: depositId,
      changed_by: authResult.user.id,
      old_status: oldStatus,
      new_status: newStatus,
      old_confirmations: deposit.confirmations,
      new_confirmations: deposit.confirmations,
      old_amount: deposit.amount,
      new_amount: deposit.amount,
      old_fee: deposit.fee,
      new_fee: deposit.fee,
      old_wallet_address: deposit.wallet_address,
      new_wallet_address: deposit.wallet_address,
      note: note || `Status changed from ${oldStatus} to ${newStatus}${reason ? ` - Reason: ${reason}` : ''}`,
      metadata: {
        admin_email: authResult.user.email,
        admin_id: authResult.user.id,
        timestamp: new Date().toISOString(),
        reason: reason || null,
        balance_changed: balanceChanged,
        new_balance: newBalance,
        old_approved_by: deposit.approved_by,
        new_approved_by: updateData.approved_by || deposit.approved_by,
        old_approved_at: deposit.approved_at,
        new_approved_at: updateData.approved_at || deposit.approved_at,
        old_rejected_by: deposit.rejected_by,
        new_rejected_by: updateData.rejected_by || deposit.rejected_by,
        old_rejected_at: deposit.rejected_at,
        new_rejected_at: updateData.rejected_at || deposit.rejected_at,
        old_completed_at: deposit.completed_at,
        new_completed_at: updateData.completed_at || deposit.completed_at,
        old_rejection_reason: deposit.rejection_reason,
        new_rejection_reason: updateData.rejection_reason || deposit.rejection_reason,
        old_hold_reason: deposit.hold_reason,
        new_hold_reason: updateData.hold_reason || deposit.hold_reason,
        action_type: note ? 'admin_edit' : 'status_change'
      }
    };

    const { error: auditError } = await supabaseAdmin
      .from('crypto_deposit_audit_logs')
      .insert(auditLogData);

    if (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    // Send email notification to user
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(deposit.user_id);

    if (user && user.user && user.user.email) {
      try {
        let emailSubject = '';
        let emailColor = '';
        let emailIcon = '';
        let emailTitle = '';
        let emailMessage = '';

        switch (newStatus) {
          case 'confirmed':
          case 'completed':
            emailSubject = `✅ Crypto Deposit ${newStatus === 'completed' ? 'Completed' : 'Confirmed'} - ${deposit.crypto_type}`;
            emailColor = '#10b981';
            emailIcon = '✅';
            emailTitle = `Your ${deposit.crypto_type} deposit has been ${newStatus}!`;
            emailMessage = `Good news! Your cryptocurrency deposit has been successfully processed and ${balanceChanged ? 'credited to your account' : 'confirmed'}.`;
            break;
          case 'rejected':
          case 'failed':
            emailSubject = `❌ Crypto Deposit ${newStatus === 'rejected' ? 'Rejected' : 'Failed'} - ${deposit.crypto_type}`;
            emailColor = '#dc2626';
            emailIcon = '❌';
            emailTitle = `Your ${deposit.crypto_type} deposit could not be processed`;
            emailMessage = `We regret to inform you that your cryptocurrency deposit has been ${newStatus}.`;
            break;
          case 'reversed':
            emailSubject = `⚠️ Crypto Deposit Reversed - ${deposit.crypto_type}`;
            emailColor = '#f59e0b';
            emailIcon = '⚠️';
            emailTitle = `Your ${deposit.crypto_type} deposit has been reversed`;
            emailMessage = 'Your cryptocurrency deposit has been reversed and the funds have been deducted from your account.';
            break;
          case 'on_hold':
            emailSubject = `⏸️ Crypto Deposit On Hold - ${deposit.crypto_type}`;
            emailColor = '#f59e0b';
            emailIcon = '⏸️';
            emailTitle = `Your ${deposit.crypto_type} deposit is on hold`;
            emailMessage = 'Your cryptocurrency deposit is currently on hold and under review.';
            break;
          case 'processing':
            emailSubject = `⏳ Crypto Deposit Processing - ${deposit.crypto_type}`;
            emailColor = '#3b82f6';
            emailIcon = '⏳';
            emailTitle = `Your ${deposit.crypto_type} deposit is being processed`;
            emailMessage = 'Your cryptocurrency deposit is currently being processed.';
            break;
          case 'awaiting_confirmations':
            emailSubject = `⏳ Crypto Deposit Awaiting Confirmations - ${deposit.crypto_type}`;
            emailColor = '#f59e0b';
            emailIcon = '⏳';
            emailTitle = `Your ${deposit.crypto_type} deposit is awaiting confirmations`;
            emailMessage = 'Your cryptocurrency deposit is awaiting blockchain confirmations.';
            break;
          default:
            emailSubject = `📝 Crypto Deposit Status Update - ${deposit.crypto_type}`;
            emailColor = '#64748b';
            emailIcon = '📝';
            emailTitle = `Your ${deposit.crypto_type} deposit status has been updated`;
            emailMessage = `Your cryptocurrency deposit status has been changed to ${newStatus}.`;
        }

        await sendEmail({
          to: user.user.email,
          subject: emailSubject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, ${emailColor} 0%, ${emailColor}dd 100%); padding: 32px 24px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">${emailIcon} Deposit ${newStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h1>
                  <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
                </div>
                
                <div style="padding: 40px 32px;">
                  <h2 style="color: ${emailColor}; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                    ${emailTitle}
                  </h2>
                  
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    ${emailMessage}
                  </p>
                  
                  <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
                    <h3 style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Transaction Details:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Crypto Type:</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${deposit.crypto_type}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount:</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">$${parseFloat(deposit.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      ${deposit.fee > 0 ? `
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Fee:</td>
                        <td style="padding: 8px 0; color: #ef4444; font-size: 14px; font-weight: 600; text-align: right;">$${parseFloat(deposit.fee).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      ` : ''}
                      ${deposit.net_amount ? `
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Net Amount:</td>
                        <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-weight: 600; text-align: right;">$${parseFloat(deposit.net_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Status:</td>
                        <td style="padding: 8px 0; color: ${emailColor}; font-size: 14px; font-weight: 600; text-align: right;">${newStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                      </tr>
                      ${reason ? `
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Reason:</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; text-align: right;">${reason}</td>
                      </tr>
                      ` : ''}
                      ${balanceChanged && newBalance !== null ? `
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">New Balance:</td>
                        <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-weight: 600; text-align: right;">$${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>
                  
                  <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                    If you have any questions about this transaction, please contact our support team.
                  </p>
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
          `,
          type: EMAIL_TYPES.NOTIFY
        });
      } catch (emailError) {
        console.error('Error sending status update email:', emailError);
      }
    }

    const responseMessage = balanceChanged
      ? `Deposit ${newStatus} successfully and ${newStatus === 'reversed' ? 'funds deducted' : 'funds credited'}`
      : `Deposit status updated to ${newStatus}`;

    return res.status(200).json({
      success: true,
      message: responseMessage,
      newBalance: newBalance,
      deposit: { ...deposit, status: newStatus }
    });

  } catch (error) {
    console.error('Error in update-crypto-deposit-status API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
