import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authResult = await verifyAdminAuth(req);
  if (authResult.error) {
    return res.status(authResult.status || 401).json({ error: authResult.error });
  }

  try {
    const { paymentId, status } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['pending', 'completed', 'expired', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided' });
    }

    // Fetch the payment transaction
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('oakline_pay_transactions')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      throw new Error('Payment not found');
    }

    // If completing payment, credit user's account
    if (status === 'completed' && payment.status !== 'completed') {
      // Get user's account using sender_id
      const { data: account, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('id, balance, user_id')
        .eq('user_id', payment.sender_id)
        .single();

      if (!accountError && account) {
        const newBalance = parseFloat(account.balance || 0) + parseFloat(payment.amount || 0);
        await supabaseAdmin
          .from('accounts')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', account.id);
      }
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabaseAdmin
      .from('oakline_pay_transactions')
      .update(updateData)
      .eq('id', paymentId);

    if (updateError) throw updateError;

    // Send email notification for status changes
    try {
      // Get bank details for email sender
      const { data: bankDetails } = await supabaseAdmin
        .from('bank_details')
        .select('custom_emails')
        .single();
      
      const transferEmail = bankDetails?.custom_emails?.transfer || 'transfer@theoaklinebank.com';
      
      // Get recipient email from the payment
      const recipientEmail = payment.sender_email || payment.recipient_email;
      
      if (recipientEmail) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_PORT === '465',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        let emailSubject, emailBody;
        
        if (status === 'cancelled') {
          emailSubject = 'Your Oakline Pay Transaction Has Been Cancelled';
          emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1A3E6F; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">🏦 Oakline Bank</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #991b1b;">Transaction Cancelled</h2>
                <p>Dear Valued Customer,</p>
                <p>Your Oakline Pay transaction for <strong>$${parseFloat(payment.amount || 0).toFixed(2)}</strong> has been cancelled.</p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Transaction Details:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Amount:</strong> $${parseFloat(payment.amount || 0).toFixed(2)}</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Recipient:</strong> ${payment.recipient_email || 'N/A'}</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Status:</strong> Cancelled</li>
                    <li style="padding: 8px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</li>
                  </ul>
                </div>
                <p><strong>We recommend trying one of these alternatives:</strong></p>
                <ul>
                  <li>Use a different payment method</li>
                  <li>Contact our support team for assistance</li>
                  <li>Try again with updated payment information</li>
                </ul>
                <p>If you have any questions, please contact us at <a href="mailto:support@theoaklinebank.com">support@theoaklinebank.com</a> or call +1 (636) 635-6122.</p>
                <p>Best regards,<br/>Oakline Bank Payment Services</p>
              </div>
              <div style="background: #374151; padding: 15px; text-align: center; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Oakline Bank. All rights reserved.
              </div>
            </div>
          `;
        } else if (status === 'completed') {
          emailSubject = 'Your Oakline Pay Transaction Has Been Completed';
          emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1A3E6F; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">🏦 Oakline Bank</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #065f46;">Transaction Completed Successfully</h2>
                <p>Dear Valued Customer,</p>
                <p>Your Oakline Pay transaction for <strong>$${parseFloat(payment.amount || 0).toFixed(2)}</strong> has been successfully completed.</p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Transaction Details:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Amount:</strong> $${parseFloat(payment.amount || 0).toFixed(2)}</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Recipient:</strong> ${payment.recipient_email || 'N/A'}</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Status:</strong> ✅ Completed</li>
                    <li style="padding: 8px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</li>
                  </ul>
                </div>
                <p>The funds have been credited to the recipient's account. Thank you for using Oakline Pay!</p>
                <p>Best regards,<br/>Oakline Bank Payment Services</p>
              </div>
              <div style="background: #374151; padding: 15px; text-align: center; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Oakline Bank. All rights reserved.
              </div>
            </div>
          `;
        } else if (status === 'expired') {
          emailSubject = 'Your Oakline Pay Transaction Has Expired';
          emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1A3E6F; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">🏦 Oakline Bank</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #92400e;">Transaction Expired</h2>
                <p>Dear Valued Customer,</p>
                <p>Your Oakline Pay transaction for <strong>$${parseFloat(payment.amount || 0).toFixed(2)}</strong> has expired.</p>
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Transaction Details:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Amount:</strong> $${parseFloat(payment.amount || 0).toFixed(2)}</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Recipient:</strong> ${payment.recipient_email || 'N/A'}</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Status:</strong> Expired</li>
                    <li style="padding: 8px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</li>
                  </ul>
                </div>
                <p>If you would like to initiate a new transaction, please visit our platform.</p>
                <p>Best regards,<br/>Oakline Bank Payment Services</p>
              </div>
              <div style="background: #374151; padding: 15px; text-align: center; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Oakline Bank. All rights reserved.
              </div>
            </div>
          `;
        }

        if (emailSubject && emailBody) {
          const fromEmail = process.env.SMTP_FROM_PAYMENTS || process.env.SMTP_FROM || transferEmail;
          await transporter.sendMail({
            from: fromEmail,
            to: recipientEmail,
            subject: emailSubject,
            html: emailBody
          });
        }
      }
    } catch (emailError) {
      console.error('Email notification error:', emailError);
      // Don't fail the request if email fails
    }

    return res.status(200).json({
      success: true,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return res.status(500).json({
      error: 'Failed to update payment status',
      details: error.message
    });
  }
}
