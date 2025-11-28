import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const cookieStore = cookies();
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
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

    // Update all claims with approval status
    const approvalStatus = action === 'approve' ? 'approved' : 'rejected';
    const { error: updateError } = await supabaseAdmin
      .from('oakline_pay_pending_claims')
      .update({
        approval_status: approvalStatus,
        updated_at: new Date().toISOString()
      })
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
        const emailSubject = action === 'approve' 
          ? 'Your Card Payment Claim Has Been Approved'
          : 'Your Card Payment Claim Has Been Rejected';

        const emailBody = action === 'approve'
          ? `
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
          `
          : `
            <p>Dear ${claim.cardholder_name || 'User'},</p>
            <p>Your card payment claim for <strong>$${claim.amount}</strong> has been rejected.</p>
            <p><strong>Claim Details:</strong></p>
            <ul>
              <li>Amount: $${claim.amount}</li>
              <li>Card: ****${claim.card_number?.slice(-4) || 'N/A'}</li>
              <li>Claim Token: ${claim.claim_token}</li>
              <li>Rejection Date: ${new Date().toLocaleString()}</li>
            </ul>
            <p>If you have questions about this decision, please contact our support team.</p>
            <p>Best regards,<br/>Oakline Bank Card Services</p>
          `;

        await transporter.sendMail({
          from: transferEmail,
          to: claim.recipient_email,
          subject: emailSubject,
          html: emailBody
        });
      }
    } catch (emailError) {
      console.error('Email notification error:', emailError);
      // Don't fail the request if email fails
    }

    return res.status(200).json({
      success: true,
      message: `${claims.length} claim(s) ${approvalStatus} successfully`,
      claimsUpdated: claims.length
    });
  } catch (error) {
    console.error('Error handling claims:', error);
    return res.status(500).json({ error: error.message || 'Failed to handle claims' });
  }
}
