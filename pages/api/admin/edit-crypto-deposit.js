
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { 
      depositId, 
      amount, 
      fee,
      confirmations, 
      txHash, 
      status,
      rejectionReason,
      holdReason
    } = req.body;

    if (!depositId) {
      return res.status(400).json({ error: 'Deposit ID is required' });
    }

    // Fetch existing deposit
    const { data: deposit, error: depositError } = await supabaseAdmin
      .from('crypto_deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (depositError || !deposit) {
      console.error('Error fetching deposit:', depositError);
      return res.status(404).json({ error: 'Deposit not found' });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Update fields if provided
    if (amount !== undefined) updateData.amount = amount;
    if (fee !== undefined) {
      updateData.fee = fee;
      // Recalculate net amount
      const depositAmount = amount !== undefined ? amount : deposit.amount;
      updateData.net_amount = parseFloat(depositAmount) - parseFloat(fee);
    }
    if (confirmations !== undefined) updateData.confirmations = confirmations;
    if (txHash !== undefined) updateData.tx_hash = txHash;
    if (status !== undefined) updateData.status = status;
    if (rejectionReason !== undefined) updateData.rejection_reason = rejectionReason;
    if (holdReason !== undefined) updateData.hold_reason = holdReason;

    // Update deposit
    const { error: updateError } = await supabaseAdmin
      .from('crypto_deposits')
      .update(updateData)
      .eq('id', depositId);

    if (updateError) {
      console.error('Error updating deposit:', updateError);
      return res.status(500).json({ error: 'Failed to update deposit' });
    }

    // Log the edit in audit logs
    await supabaseAdmin
      .from('crypto_deposit_audit_logs')
      .insert({
        deposit_id: depositId,
        changed_by: authResult.user.id,
        old_status: deposit.status,
        new_status: status || deposit.status,
        old_amount: deposit.amount,
        new_amount: amount || deposit.amount,
        old_confirmations: deposit.confirmations,
        new_confirmations: confirmations !== undefined ? confirmations : deposit.confirmations,
        note: 'Deposit edited via admin panel',
        metadata: {
          admin_email: authResult.user.email,
          changes: updateData
        }
      });

    // Send email notification and credit account if status changed to completed
    if (status === 'completed' && deposit.status !== 'completed') {
      try {
        // Calculate amounts
        const depositAmount = amount !== undefined ? parseFloat(amount) : parseFloat(deposit.amount);
        const depositFee = fee !== undefined ? parseFloat(fee) : parseFloat(deposit.fee || 0);
        const netAmount = depositAmount - depositFee;

        // Credit user account
        if (!deposit.account_id) {
          console.error('No account linked to this deposit');
          return res.status(400).json({ error: 'No account linked to this deposit' });
        }

        // Get account and lock it
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
        const balanceAfter = balanceBefore + netAmount;

        // Update account balance
        const { error: balanceError } = await supabaseAdmin
          .from('accounts')
          .update({
            balance: balanceAfter,
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id);

        if (balanceError) {
          console.error('Error updating account balance:', balanceError);
          return res.status(500).json({ error: 'Failed to update account balance' });
        }

        // Create transaction record
        const { error: txError } = await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: deposit.user_id,
            account_id: deposit.account_id,
            type: 'credit',
            amount: netAmount,
            description: `Crypto deposit - ${deposit.crypto_type} (Net after ${depositFee} fee)`,
            status: 'completed',
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            reference: depositId,
            metadata: {
              deposit_id: depositId,
              crypto_type: deposit.crypto_type,
              network_type: deposit.network_type,
              gross_amount: depositAmount,
              fee: depositFee,
              net_amount: netAmount
            }
          });

        if (txError) {
          console.error('Transaction creation error:', txError);
        }

        // Credit fee to Treasury account
        if (depositFee > 0) {
          const { data: treasuryAccount } = await supabaseAdmin
            .from('accounts')
            .select('*')
            .eq('account_number', 'TREASURY-001')
            .single();

          if (treasuryAccount) {
            const treasuryBalanceBefore = parseFloat(treasuryAccount.balance || 0);
            const treasuryBalanceAfter = treasuryBalanceBefore + depositFee;

            await supabaseAdmin
              .from('accounts')
              .update({
                balance: treasuryBalanceAfter,
                updated_at: new Date().toISOString()
              })
              .eq('id', treasuryAccount.id);

            await supabaseAdmin
              .from('transactions')
              .insert({
                account_id: treasuryAccount.id,
                type: 'credit',
                amount: depositFee,
                description: `Crypto deposit fee - ${deposit.crypto_type}`,
                status: 'completed',
                balance_before: treasuryBalanceBefore,
                balance_after: treasuryBalanceAfter,
                metadata: {
                  source: 'crypto_deposit_fee',
                  deposit_id: depositId,
                  user_id: deposit.user_id,
                  crypto_type: deposit.crypto_type,
                  gross_amount: depositAmount,
                  fee: depositFee,
                  net_amount: netAmount
                }
              });
          }
        }

        // Get user profile for email
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', deposit.user_id)
          .single();

        // Get bank details for email configuration
        const { data: bankDetails } = await supabaseAdmin
          .from('bank_details')
          .select('email_crypto')
          .single();

        const fromEmail = bankDetails?.email_crypto || 'crypto@theoaklinebank.com';

        if (profile?.email) {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'}/api/email/send-deposit-completed-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: profile.email,
              fromEmail,
              cryptoType: deposit.crypto_type,
              network: deposit.network_type,
              amount: depositAmount,
              fee: depositFee,
              netAmount: netAmount,
              depositId: depositId,
              userName: `${profile.first_name} ${profile.last_name}`
            })
          });
          console.log('Deposit completion email sent to:', profile.email);
        }
      } catch (emailError) {
        console.error('Error sending completion email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Deposit updated successfully'
    });

  } catch (error) {
    console.error('Error in edit-crypto-deposit API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
