
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { depositId, status } = req.body;

    if (!depositId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get admin user from session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminId = session.user.id;

    // Verify admin
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', adminId)
      .single();

    if (!adminProfile) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get deposit details
    const { data: deposit, error: depositError } = await supabase
      .from('crypto_deposits')
      .select('*, crypto_assets(*), accounts(*)')
      .eq('id', depositId)
      .single();

    if (depositError || !deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    console.log('Deposit fetched:', { id: deposit.id, purpose: deposit.purpose, status: deposit.status });

    // Get bank details for email
    const { data: bankDetails } = await supabase
      .from('bank_details')
      .select('email_crypto')
      .single();

    const fromEmail = bankDetails?.email_crypto || 'crypto@theoaklinebank.com';

    // Handle completion status
    if (status === 'completed' && deposit.status !== 'completed') {
      const amount = parseFloat(deposit.amount || 0);
      const fee = parseFloat(deposit.fee || 0);
      const netAmount = amount - fee;
      const isLoanDeposit = deposit.purpose === 'loan_requirement';
      
      console.log('Completion handling - isLoanDeposit:', isLoanDeposit, 'deposit.purpose:', deposit.purpose);

      // Get user profile for email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', deposit.user_id)
        .single();

      // For LOAN deposits: Credit FULL amount to Treasury account
      if (isLoanDeposit) {
        const { data: treasuryAccount } = await supabase
          .from('accounts')
          .select('*')
          .eq('account_number', 'TREASURY-001')
          .single();

        if (!treasuryAccount) {
          return res.status(400).json({ error: 'Treasury account not found' });
        }

        // Create transaction for the FULL amount to treasury (this is the 10% loan requirement)
        const { error: treasuryTxError } = await supabase
          .from('transactions')
          .insert({
            account_id: treasuryAccount.id,
            type: 'credit',
            amount: netAmount,
            description: `10% Loan requirement deposit - ${deposit.crypto_assets?.crypto_type}`,
            status: 'completed',
            reference: depositId,
            metadata: {
              source: 'loan_requirement_deposit',
              deposit_id: depositId,
              user_id: deposit.user_id,
              crypto_type: deposit.crypto_assets?.crypto_type,
              network: deposit.crypto_assets?.network_type,
              gross_amount: amount,
              fee: fee,
              net_amount: netAmount,
              loan_id: deposit.loan_id
            }
          });

        if (treasuryTxError) {
          console.error('Treasury transaction error:', treasuryTxError);
          return res.status(500).json({ error: 'Failed to credit loan deposit to treasury' });
        }

        // Also credit fee to treasury
        if (fee > 0) {
          const { error: feeError } = await supabase
            .from('transactions')
            .insert({
              account_id: treasuryAccount.id,
              type: 'credit',
              amount: fee,
              description: `Loan deposit processing fee - ${deposit.crypto_assets?.crypto_type}`,
              status: 'completed',
              metadata: {
                source: 'loan_deposit_fee',
                deposit_id: depositId,
                user_id: deposit.user_id,
                crypto_type: deposit.crypto_assets?.crypto_type
              }
            });

          if (feeError) {
            console.error('Fee transaction error:', feeError);
          }
        }
      } else {
        // For GENERAL deposits: Credit to user's account (existing behavior)
        if (!deposit.account_id) {
          return res.status(400).json({ error: 'No account linked to this deposit' });
        }

        // Find existing pending transaction for this deposit
        const { data: existingTx } = await supabase
          .from('transactions')
          .select('id')
          .eq('reference', depositId)
          .eq('type', 'credit')
          .eq('status', 'pending')
          .single();

        if (existingTx) {
          // Update existing pending transaction to completed
          const { data: updatedTx, error: updateTxError } = await supabase
            .from('transactions')
            .update({
              status: 'completed',
              amount: netAmount,
              description: `Crypto deposit - ${deposit.crypto_assets?.crypto_type} (Net after ${fee} fee)`,
              updated_at: new Date().toISOString(),
              metadata: {
                deposit_id: depositId,
                crypto_type: deposit.crypto_assets?.crypto_type,
                network: deposit.crypto_assets?.network_type,
                gross_amount: amount,
                fee: fee,
                net_amount: netAmount
              }
            })
            .eq('id', existingTx.id)
            .select()
            .single();

          if (updateTxError) {
            console.error('Transaction update error:', updateTxError);
            return res.status(500).json({ error: 'Failed to update transaction' });
          }
        } else {
          // Fallback: Create new transaction if none exists
          const { error: userTxError } = await supabase
            .from('transactions')
            .insert({
              user_id: deposit.user_id,
              account_id: deposit.account_id,
              type: 'credit',
              amount: netAmount,
              description: `Crypto deposit - ${deposit.crypto_assets?.crypto_type} (Net after ${fee} fee)`,
              status: 'completed',
              reference: depositId,
              metadata: {
                deposit_id: depositId,
                crypto_type: deposit.crypto_assets?.crypto_type,
                network: deposit.crypto_assets?.network_type,
                gross_amount: amount,
                fee: fee,
                net_amount: netAmount
              }
            })
            .select()
            .single();

          if (userTxError) {
            console.error('User transaction error:', userTxError);
            return res.status(500).json({ error: 'Failed to credit user account' });
          }
        }

        // Credit fee to Treasury account
        if (fee > 0) {
          const { data: treasuryAccount } = await supabase
            .from('accounts')
            .select('*')
            .eq('account_number', 'TREASURY-001')
            .single();

          if (treasuryAccount) {
            const { error: treasuryTxError } = await supabase
              .from('transactions')
              .insert({
                account_id: treasuryAccount.id,
                type: 'credit',
                amount: fee,
                description: `Crypto deposit fee - ${deposit.crypto_assets?.crypto_type}`,
                status: 'completed',
                metadata: {
                  source: 'crypto_deposit_fee',
                  deposit_id: depositId,
                  user_id: deposit.user_id,
                  crypto_type: deposit.crypto_assets?.crypto_type,
                  network: deposit.crypto_assets?.network_type,
                  gross_amount: amount,
                  fee: fee,
                  net_amount: netAmount
                }
              });

            if (treasuryTxError) {
              console.error('Treasury transaction error:', treasuryTxError);
            }
          }
        }
      }

      // Update deposit status
      const { error: updateError } = await supabase
        .from('crypto_deposits')
        .update({
          status: 'completed',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', depositId);

      if (updateError) {
        console.error('Update error:', updateError);
        return res.status(500).json({ error: 'Failed to update deposit status' });
      }

      // Send completion email (with loan deposit flag)
      if (profile?.email) {
        try {
          const emailPayload = {
            to: profile.email,
            fromEmail,
            cryptoType: deposit.crypto_assets?.crypto_type,
            network: deposit.crypto_assets?.network_type,
            amount: amount,
            fee: fee,
            netAmount: netAmount,
            depositId: depositId,
            userName: `${profile.first_name} ${profile.last_name}`,
            isLoanDeposit: isLoanDeposit,
            walletAddress: deposit.wallet_address,
            memo: deposit.memo,
            txHash: deposit.tx_hash
          };
          
          console.log('Sending email with payload:', { isLoanDeposit: emailPayload.isLoanDeposit });

          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'}/api/email/send-deposit-completed-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload)
          });
        } catch (emailError) {
          console.error('Email error:', emailError);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Deposit completed successfully',
        netAmount,
        fee
      });
    }

    // For other status changes
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'confirmed') {
      updateData.approved_by = adminId;
      updateData.approved_at = new Date().toISOString();
    }

    // Update pending transaction if deposit is rejected/failed
    if (status === 'rejected' || status === 'failed') {
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('reference', depositId)
        .eq('type', 'credit')
        .eq('status', 'pending')
        .single();

      if (existingTx) {
        await supabase
          .from('transactions')
          .update({
            status: 'failed',
            description: `Crypto deposit - ${deposit.crypto_assets?.crypto_type} - Rejected`,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingTx.id);
      }
    }

    const { error: updateError } = await supabase
      .from('crypto_deposits')
      .update(updateData)
      .eq('id', depositId);

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({ error: 'Failed to update deposit status' });
    }

    return res.status(200).json({
      success: true,
      message: `Deposit ${status} successfully`
    });

  } catch (error) {
    console.error('Error in update-crypto-deposit-status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
