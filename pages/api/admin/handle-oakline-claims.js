import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { claimIds, action } = req.body;

    if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
      return res.status(400).json({ error: 'Claim IDs are required' });
    }

    if (!['approve', 'reject', 'complete', 'cancel'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Create Supabase admin client for API routes
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch all claims
    const { data: claims, error: fetchError } = await supabaseAdmin
      .from('oakline_pay_pending_claims')
      .select('*')
      .in('id', claimIds);

    if (fetchError || !claims) {
      throw new Error('Failed to fetch claims');
    }

    // Fetch bank details for email
    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('custom_emails')
      .single();

    const transferEmail = bankDetails?.custom_emails?.transfer || 'transfer@theoaklinebank.com';

    // Update all claims based on action
    let updateData = { updated_at: new Date().toISOString() };
    
    if (action === 'approve') {
      updateData.approval_status = 'approved';
      updateData.status = 'claimed';
    } else if (action === 'reject') {
      updateData.approval_status = 'rejected';
      updateData.status = 'expired';
    } else if (action === 'complete') {
      updateData.status = 'claimed';
      updateData.approval_status = 'approved';
    } else if (action === 'cancel') {
      updateData.status = 'expired';
      updateData.approval_status = 'rejected';
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('oakline_pay_pending_claims')
      .update(updateData)
      .in('id', claimIds);

    if (updateError) throw updateError;

    // Send email notifications for each claim
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.ADMIN_EMAIL,
          pass: process.env.ADMIN_EMAIL_PASSWORD
        }
      });

      for (const claim of claims) {
        let emailSubject, emailBody;

        if (action === 'approve') {
          emailSubject = 'Your Card Payment Claim Has Been Approved';
          emailBody = `
            <p>Dear ${claim.cardholder_name || 'User'},</p>
            <p>Your card payment claim for <strong>$${claim.amount}</strong> has been approved.</p>
            <p><strong>Claim Details:</strong></p>
            <ul>
              <li>Amount: $${claim.amount}</li>
              <li>Card: ****${claim.card_number?.slice(-4) || 'N/A'}</li>
              <li>Claim Token: ${claim.claim_token}</li>
              <li>Approval Date: ${new Date().toLocaleString()}</li>
            </ul>
            <p>The funds will be processed shortly. Thank you for using Oakline Bank.</p>
            <p>Best regards,<br/>Oakline Bank Card Services</p>
          `;
        } else if (action === 'reject') {
          emailSubject = 'Your Card Payment Claim Has Been Rejected';
          emailBody = `
            <p>Dear ${claim.cardholder_name || 'User'},</p>
            <p>Your card payment claim for <strong>$${claim.amount}</strong> has been rejected.</p>
            <p><strong>Claim Details:</strong></p>
            <ul>
              <li>Amount: $${claim.amount}</li>
              <li>Card: ****${claim.card_number?.slice(-4) || 'N/A'}</li>
              <li>Claim Token: ${claim.claim_token}</li>
              <li>Rejection Date: ${new Date().toLocaleString()}</li>
            </ul>
          `;
        } else if (action === 'complete') {
          emailSubject = 'Your Card Payment Has Been Completed';
          emailBody = `
            <p>Dear User,</p>
            <p>Your card payment for <strong>$${claim.amount}</strong> has been successfully completed.</p>
            <p><strong>Payment Details:</strong></p>
            <ul>
              <li>Amount: $${claim.amount}</li>
              <li>Card: ****${claim.card_number?.slice(-4) || 'N/A'}</li>
              <li>Recipient: ${claim.recipient_email}</li>
              <li>Completion Date: ${new Date().toLocaleString()}</li>
            </ul>
            <p>Thank you for using Oakline Bank.</p>
            <p>Best regards,<br/>Oakline Bank Card Services</p>
          `;
        } else if (action === 'cancel') {
          emailSubject = 'Your Card Payment Request Was Not Processed - Try Alternative Methods';
          emailBody = `
            <p>Dear User,</p>
            <p>Unfortunately, your card payment request for <strong>$${claim.amount}</strong> could not be processed at this time.</p>
            <p><strong>Payment Details:</strong></p>
            <ul>
              <li>Amount: $${claim.amount}</li>
              <li>Card Last 4: ****${claim.card_number?.slice(-4) || 'N/A'}</li>
              <li>Status: Declined</li>
              <li>Date: ${new Date().toLocaleString()}</li>
            </ul>
            <p><strong>We recommend trying one of these alternatives:</strong></p>
            <ul>
              <li><strong>Use a Different Debit Card:</strong> Try submitting your payment with a different debit card</li>
              <li><strong>Link Your Bank Account:</strong> Connect your bank account directly for fund transfers</li>
              <li><strong>Open an Oakline Account:</strong> Create an account with Oakline Bank for seamless transactions</li>
              <li><strong>Contact Support:</strong> Reach out to our support team for assistance with your payment</li>
            </ul>
            <p>If you have questions, please don't hesitate to contact us at support@theoaklinebank.com or call +1 (636) 635-6122.</p>
            <p>Best regards,<br/>Oakline Bank Payment Services</p>
          `;
        }

        await transporter.sendMail({
          from: transferEmail,
          to: claim.sender_contact || claim.recipient_email,
          subject: emailSubject,
          html: emailBody
        });
      }
    } catch (emailError) {
      console.error('Email notification error:', emailError);
      // Don't fail the request if email fails
    }

    const actionMessage = {
      'approve': 'approved',
      'reject': 'rejected',
      'complete': 'completed',
      'cancel': 'cancelled'
    }[action] || 'updated';

    return res.status(200).json({
      success: true,
      message: `${claims.length} claim(s) ${actionMessage} successfully`,
      claimsUpdated: claims.length
    });
  } catch (error) {
    console.error('Error handling claims:', error);
    return res.status(500).json({ error: error.message || 'Failed to handle claims' });
  }
}
