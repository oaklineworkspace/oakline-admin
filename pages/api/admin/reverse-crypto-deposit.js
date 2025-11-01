import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';
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
    const { depositId, reason } = req.body;

    if (!depositId) {
      return res.status(400).json({ error: 'Deposit ID is required' });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'Reason is required for reversing a deposit' });
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

    if (deposit.status !== 'confirmed') {
      return res.status(400).json({ 
        error: `Can only reverse confirmed deposits. Current status: ${deposit.status}` 
      });
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('account_number', deposit.account_number)
      .single();

    if (accountError || !account) {
      console.error('Error fetching account:', accountError);
      return res.status(404).json({ error: 'Account not found' });
    }

    const currentBalance = parseFloat(account.balance || 0);
    const depositAmount = parseFloat(deposit.amount);

    if (currentBalance < depositAmount) {
      return res.status(400).json({ 
        error: `Insufficient balance to reverse this deposit. Current balance: $${currentBalance.toFixed(2)}, Required: $${depositAmount.toFixed(2)}` 
      });
    }

    const newBalance = currentBalance - depositAmount;

    const { error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('Error updating account balance:', updateError);
      return res.status(500).json({ error: 'Failed to update account balance' });
    }

    const { error: depositUpdateError } = await supabaseAdmin
      .from('crypto_deposits')
      .update({ 
        status: 'reversed',
        note: reason
      })
      .eq('id', depositId);

    if (depositUpdateError) {
      console.error('Error updating deposit status:', depositUpdateError);

      await supabaseAdmin
        .from('accounts')
        .update({ balance: currentBalance })
        .eq('id', account.id);

      return res.status(500).json({ error: 'Failed to update deposit status' });
    }

    const { data: user } = await supabaseAdmin.auth.admin.getUserById(deposit.user_id);

    if (user && user.user && user.user.email) {
      try {
        await sendEmail({
          to: user.user.email,
          subject: `⚠️ Crypto Deposit Reversed - ${deposit.crypto_type}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 24px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">⚠️ Deposit Reversed</h1>
                  <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
                </div>

                <div style="padding: 40px 32px;">
                  <h2 style="color: #d97706; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                    Your ${deposit.crypto_type} deposit has been reversed
                  </h2>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    A previously confirmed cryptocurrency deposit has been reversed and the amount has been deducted from your account.
                  </p>

                  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 24px 0;">
                    <p style="color: #92400e; font-size: 16px; margin: 0 0 12px 0;"><strong>Reversal Details:</strong></p>
                    <p style="color: #92400e; font-size: 14px; margin: 4px 0;"><strong>Cryptocurrency:</strong> ${deposit.crypto_type}</p>
                    <p style="color: #92400e; font-size: 14px; margin: 4px 0;"><strong>Amount:</strong> $${parseFloat(deposit.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p style="color: #92400e; font-size: 14px; margin: 4px 0;"><strong>Account Number:</strong> ${deposit.account_number}</p>
                    <p style="color: #92400e; font-size: 14px; margin: 4px 0;"><strong>New Balance:</strong> $${newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p style="color: #92400e; font-size: 14px; margin: 12px 0 4px 0;"><strong>Reason:</strong> ${reason}</p>
                  </div>

                  <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                    If you have questions about this reversal, please contact our support team immediately.
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
        console.error('Error sending reversal email:', emailError);
      }
    }

    return res.status(200).json({ 
      success: true,
      message: 'Deposit reversed successfully',
      newBalance
    });

  } catch (error) {
    console.error('Error in reverse-crypto-deposit API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}