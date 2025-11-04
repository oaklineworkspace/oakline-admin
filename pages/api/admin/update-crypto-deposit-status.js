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
      .select(`
        *,
        crypto_asset:crypto_asset_id (
          crypto_type,
          network_type,
          symbol
        ),
        loan_wallet:loan_wallet_id (
          wallet_address,
          memo
        )
      `)
      .eq('id', depositId)
      .single();

    if (depositError || !deposit) {
      console.error('Error fetching deposit:', depositError);
      return res.status(404).json({ error: 'Deposit not found' });
    }

    // Flatten the crypto asset and wallet data for easier access
    const cryptoType = deposit.crypto_asset?.crypto_type || 'Unknown';
    const networkType = deposit.crypto_asset?.network_type || 'N/A';
    const walletAddress = deposit.loan_wallet?.wallet_address || 'N/A';
    const walletMemo = deposit.loan_wallet?.memo;

    const oldStatus = deposit.status;
    let newBalance = null;
    let balanceChanged = false;

    if (newStatus === 'confirmed' || newStatus === 'completed') {
      const txReference = deposit.tx_hash || deposit.id;
      const { data: existingTx } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('reference', txReference)
        .eq('account_id', deposit.account_id)
        .single();

      const alreadyCredited = (deposit.approved_by && deposit.approved_at) || existingTx;

      if (alreadyCredited) {
        console.log('Deposit already credited. Skipping duplicate credit. Transaction exists:', !!existingTx);
        const { data: account } = await supabaseAdmin
          .from('accounts')
          .select('balance')
          .eq('id', deposit.account_id)
          .single();
        newBalance = parseFloat(account?.balance || 0);

        // Check if this is a loan deposit
        const isLoanDeposit = deposit.purpose === 'loan_requirement' && deposit.loan_wallet_id;

        // Update loan status if completing a loan deposit (DO THIS BEFORE marking as completed)
        if ((newStatus === 'completed' || newStatus === 'confirmed') && isLoanDeposit) {
          // Find the loan associated with this deposit
          const { data: loans } = await supabaseAdmin
            .from('loans')
            .select('*')
            .eq('user_id', deposit.user_id)
            .in('deposit_status', ['pending', 'not_required'])
            .order('created_at', { ascending: false })
            .limit(1);

          if (loans && loans.length > 0) {
            const loan = loans[0];
            console.log('Updating loan deposit status for loan:', loan.id);
            
            const { error: loanUpdateError } = await supabaseAdmin
              .from('loans')
              .update({
                deposit_status: 'completed',
                deposit_paid: true,
                deposit_amount: parseFloat(deposit.amount),
                deposit_date: new Date().toISOString(),
                deposit_method: 'crypto',
                updated_at: new Date().toISOString()
              })
              .eq('id', loan.id);

            if (loanUpdateError) {
              console.error('Error updating loan deposit status:', loanUpdateError);
            } else {
              console.log('Successfully updated loan deposit status');
            }
          } else {
            console.log('No pending loan found for this deposit');
          }
        }

        // If the new status is 'completed', credit the account
        if (newStatus === 'completed' && (deposit.status !== 'completed')) {
        }
      } else {
        const { data: account, error: accountError } = await supabaseAdmin
          .from('accounts')
          .select('*')
          .eq('id', deposit.account_id)
          .single();

        if (accountError || !account) {
          console.error('Error fetching account:', accountError);
          return res.status(404).json({ error: 'Account not found' });
        }

        const balanceBefore = parseFloat(account.balance || 0);
        const depositAmount = parseFloat(deposit.net_amount || deposit.amount);
        newBalance = balanceBefore + depositAmount;

        const { error: balanceUpdateError } = await supabaseAdmin
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', account.id);

        if (balanceUpdateError) {
          console.error('Error updating account balance:', balanceUpdateError);
          return res.status(500).json({ error: 'Failed to credit account balance. Deposit status not changed.' });
        }

        const { error: transactionError } = await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: deposit.user_id,
            account_id: deposit.account_id,
            type: 'deposit',
            amount: depositAmount,
            status: 'completed',
            description: 'Crypto deposit approved',
            balance_before: balanceBefore,
            balance_after: newBalance,
            reference: txReference,
            created_at: new Date().toISOString()
          });

        if (transactionError) {
          console.error('Error creating transaction record:', transactionError);
          // Rollback balance update
          await supabaseAdmin
            .from('accounts')
            .update({ balance: balanceBefore })
            .eq('id', account.id);
          return res.status(500).json({ error: 'Failed to create transaction record. Balance changes have been rolled back.' });
        }

        balanceChanged = true;
      }
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

      const balanceBefore = parseFloat(account.balance || 0);
      const depositAmount = parseFloat(deposit.net_amount || deposit.amount);
      newBalance = balanceBefore - depositAmount;

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

      // Check if reversal transaction already exists
      const reversalRef = `reversal-${deposit.tx_hash || deposit.id}`;
      const { data: existingReversalTx } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('reference', reversalRef)
        .eq('account_id', deposit.account_id)
        .single();

      if (!existingReversalTx) {
        // Create reversal transaction record only if it doesn't exist
        const { error: transactionError } = await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: deposit.user_id,
            account_id: deposit.account_id,
            type: 'withdrawal',
            amount: depositAmount,
            status: 'reversed',
            description: `Crypto deposit reversed${reason ? ': ' + reason : ''}`,
            balance_before: balanceBefore,
            balance_after: newBalance,
            reference: reversalRef,
            created_at: new Date().toISOString()
          });

        if (transactionError) {
          console.error('Error creating reversal transaction record:', transactionError);
          // Rollback balance update
          await supabaseAdmin
            .from('accounts')
            .update({ balance: balanceBefore })
            .eq('id', account.id);
          return res.status(500).json({ error: 'Failed to create reversal transaction record. Balance changes have been rolled back.' });
        }
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

    const { error: depositUpdateError } = await supabaseAdmin
      .from('crypto_deposits')
      .update(updateData)
      .eq('id', depositId);

    if (depositUpdateError) {
      console.error('Error updating deposit status:', depositUpdateError);

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

          // Delete the transaction record we just created
          if (deposit.transaction_hash || deposit.id) {
            await supabaseAdmin
              .from('transactions')
              .delete()
              .eq('reference', deposit.transaction_hash || deposit.id)
              .eq('account_id', deposit.account_id);
          }
        }
      }

      return res.status(500).json({ error: 'Failed to update deposit status. Balance changes have been rolled back.' });
    }

    // Log the status change in audit logs
    await supabaseAdmin
      .from('crypto_deposit_audit_logs')
      .insert({
        deposit_id: depositId,
        changed_by: authResult.user.id,
        old_status: deposit.status,
        new_status: newStatus,
        old_amount: deposit.amount,
        new_amount: deposit.amount,
        note: note || `Status changed from ${deposit.status} to ${newStatus}${reason ? ` - Reason: ${reason}` : ''}`,
        metadata: {
          admin_email: authResult.user.email,
          admin_id: authResult.user.id,
          timestamp: new Date().toISOString(),
          reason: reason || null,
          balance_changed: balanceChanged,
          new_balance: newBalance || null,
          is_loan_deposit: deposit.purpose === 'loan_requirement',
          loan_id: deposit.loan_id || null,
          old_confirmations: deposit.confirmations,
          new_confirmations: deposit.confirmations,
          old_fee: deposit.fee,
          new_fee: deposit.fee,
          old_wallet_address: deposit.wallet_address,
          new_wallet_address: deposit.wallet_address,
          old_approved_by: deposit.approved_by,
          new_approved_by: updateData.approved_by || deposit.approved_by,
          old_approved_at: deposit.approved_at,
          new_approved_at: updateData.approved_at || deposit.approved_at,
          old_rejected_by: deposit.rejected_by,
          new_rejected_by: updateData.rejected_by || deposit.rejected_by,
          old_rejected_at: deposit.rejected_at,
          new_rejected_at: updateData.rejected_at || deposit.rejected_by,
          old_completed_at: deposit.completed_at,
          new_completed_at: updateData.completed_at || deposit.completed_at,
          old_rejection_reason: deposit.rejection_reason,
          new_rejection_reason: updateData.rejection_reason || deposit.rejection_reason,
          old_hold_reason: deposit.hold_reason,
          new_hold_reason: updateData.hold_reason || deposit.hold_reason,
          action_type: note ? 'admin_edit' : 'status_change'
        }
      });


    // Send email notification to user
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(deposit.user_id);

    if (user && user.user && user.user.email) {
      try {
        let emailSubject = '';
        let emailColor = '';
        let emailIcon = '';
        let emailTitle = '';
        let emailMessage = '';

        // Retrieve bank details for email alias and specific messages
        const { data: bankDetails, error: bankDetailsError } = await supabaseAdmin
          .from('bank_details')
          .select('email_alias, email_template_loan_completed')
          .single();

        if (bankDetailsError) {
          console.error('Error fetching bank details:', bankDetailsError);
        }

        // Use loan email for loan deposits, regular email alias for others
        const isLoanDeposit = deposit.purpose === 'loan_requirement';
        const emailAlias = isLoanDeposit 
          ? (bankDetails?.email_loans || 'loans@theoaklinebank.com')
          : (bankDetails?.email_notify || 'noreply@oaklinebank.com');

        switch (newStatus) {
          case 'confirmed':
          case 'completed':
            emailSubject = isLoanDeposit
              ? `✅ Loan Requirement Deposit ${newStatus === 'completed' ? 'Completed' : 'Confirmed'} - ${cryptoType}`
              : `✅ Crypto Deposit ${newStatus === 'completed' ? 'Completed' : 'Confirmed'} - ${cryptoType}`;
            emailColor = '#10b981';
            emailIcon = '✅';
            emailTitle = isLoanDeposit
              ? `Your loan requirement deposit has been ${newStatus}!`
              : `Your ${cryptoType} deposit has been ${newStatus}!`;

            if (isLoanDeposit) {
              emailMessage = `Great news! Your loan requirement deposit has been successfully verified and credited to the bank's treasury account. Your loan application is now ready for final approval.`;
            } else {
              emailMessage = `Good news! Your cryptocurrency deposit has been successfully processed and ${balanceChanged ? 'credited to your account' : 'confirmed'}.`;
            }
            break;
          case 'rejected':
          case 'failed':
            emailSubject = `❌ Crypto Deposit ${newStatus === 'rejected' ? 'Rejected' : 'Failed'} - ${cryptoType}`;
            emailColor = '#dc2626';
            emailIcon = '❌';
            emailTitle = `Your ${cryptoType} deposit could not be processed`;
            emailMessage = `We regret to inform you that your cryptocurrency deposit has been ${newStatus}.`;
            break;
          case 'reversed':
            emailSubject = `⚠️ Crypto Deposit Reversed - ${cryptoType}`;
            emailColor = '#f59e0b';
            emailIcon = '⚠️';
            emailTitle = `Your ${cryptoType} deposit has been reversed`;
            emailMessage = 'Your cryptocurrency deposit has been reversed and the funds have been deducted from your account.';
            break;
          case 'on_hold':
            emailSubject = `⏸️ Crypto Deposit On Hold - ${cryptoType}`;
            emailColor = '#f59e0b';
            emailIcon = '⏸️';
            emailTitle = `Your ${cryptoType} deposit is on hold`;
            emailMessage = 'Your cryptocurrency deposit is currently on hold and under review.';
            break;
          case 'processing':
            emailSubject = `⏳ Crypto Deposit Processing - ${cryptoType}`;
            emailColor = '#3b82f6';
            emailIcon = '⏳';
            emailTitle = `Your ${cryptoType} deposit is being processed`;
            emailMessage = 'Your cryptocurrency deposit is currently being processed.';
            break;
          case 'awaiting_confirmations':
            emailSubject = `⏳ Crypto Deposit Awaiting Confirmations - ${cryptoType}`;
            emailColor = '#f59e0b';
            emailIcon = '⏳';
            emailTitle = `Your ${cryptoType} deposit is awaiting confirmations`;
            emailMessage = 'Your cryptocurrency deposit is awaiting blockchain confirmations.';
            break;
          default:
            emailSubject = `📝 Crypto Deposit Status Update - ${cryptoType}`;
            emailColor = '#64748b';
            emailIcon = '📝';
            emailTitle = `Your ${cryptoType} deposit status has been updated`;
            emailMessage = `Your cryptocurrency deposit status has been changed to ${newStatus}.`;
        }

        await sendEmail({
          to: user.user.email,
          from: emailAlias, // Use the email alias from bank details
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

                  ${isLoanDeposit ? `
                  <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 20px; margin: 24px 0;">
                    <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
                      <strong>⚠️ Important:</strong> This deposit has been credited to our bank treasury to secure your loan application. These funds are <strong>NOT</strong> added to your personal account balance.
                    </p>
                  </div>
                  ` : ''}

                  <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
                    <h3 style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Transaction Details:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      ${isLoanDeposit ? `
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Purpose:</td>
                        <td style="padding: 8px 0; color: #f59e0b; font-size: 14px; font-weight: 600; text-align: right;">Loan Requirement Deposit (Treasury)</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Crypto Type:</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${cryptoType}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Network:</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${networkType}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Wallet Address:</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 12px; font-family: monospace; text-align: right; word-break: break-all;">${walletAddress}</td>
                      </tr>
                      ${walletMemo ? `
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Memo:</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 12px; font-family: monospace; text-align: right; word-break: break-all;">${walletMemo}</td>
                      </tr>
                      ` : ''}
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
                      ${!isLoanDeposit && balanceChanged && newBalance !== null ? `
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