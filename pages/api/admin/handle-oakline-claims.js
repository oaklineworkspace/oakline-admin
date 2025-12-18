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
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      for (const claim of claims) {
        // Determine recipient email - prioritize recipient_email, then sender_contact
        const recipientEmail = claim.recipient_email || claim.sender_contact;
        
        if (!recipientEmail) {
          console.warn(`No email address found for claim ${claim.id}, skipping notification`);
          continue;
        }

        let emailSubject, emailBody;

        if (action === 'approve') {
          emailSubject = 'Your Card Payment Claim Has Been Approved';
          emailBody = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">💳 Oakline Bank</h1>
                  <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Card Payment Approved</p>
                </div>
                <div style="padding: 40px 32px;">
                  <h2 style="color: #065f46; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                    Payment Claim Approved!
                  </h2>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Dear ${claim.cardholder_name || 'Valued Customer'},
                  </p>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Your card payment claim for <strong>$${claim.amount}</strong> has been approved and will be processed shortly.
                  </p>
                  <div style="background: #f0fdfa; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0; border-radius: 8px;">
                    <h3 style="color: #065f46; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">Claim Details</h3>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                      <li style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Amount:</strong> $${claim.amount}</li>
                      <li style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Card:</strong> ****${claim.card_number?.slice(-4) || 'N/A'}</li>
                      <li style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Claim Token:</strong> ${claim.claim_token}</li>
                      <li style="padding: 8px 0;"><strong>Approval Date:</strong> ${new Date().toLocaleString()}</li>
                    </ul>
                  </div>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                    Thank you for using Oakline Bank.
                  </p>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                    Best regards,<br/>Oakline Bank Card Services
                  </p>
                </div>
                <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #718096; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Oakline Bank. All rights reserved.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `;
        } else if (action === 'reject') {
          emailSubject = 'Your Card Payment Claim Has Been Rejected';
          emailBody = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 32px 24px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">💳 Oakline Bank</h1>
                  <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Payment Claim Status</p>
                </div>
                <div style="padding: 40px 32px;">
                  <h2 style="color: #991b1b; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                    Payment Claim Rejected
                  </h2>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Dear ${claim.cardholder_name || 'Valued Customer'},
                  </p>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Your card payment claim for <strong>$${claim.amount}</strong> has been rejected.
                  </p>
                  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 24px 0; border-radius: 8px;">
                    <h3 style="color: #991b1b; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">Claim Details</h3>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                      <li style="padding: 8px 0; border-bottom: 1px solid #fee2e2;"><strong>Amount:</strong> $${claim.amount}</li>
                      <li style="padding: 8px 0; border-bottom: 1px solid #fee2e2;"><strong>Card:</strong> ****${claim.card_number?.slice(-4) || 'N/A'}</li>
                      <li style="padding: 8px 0; border-bottom: 1px solid #fee2e2;"><strong>Claim Token:</strong> ${claim.claim_token}</li>
                      <li style="padding: 8px 0;"><strong>Rejection Date:</strong> ${new Date().toLocaleString()}</li>
                    </ul>
                  </div>
                </div>
                <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #718096; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Oakline Bank. All rights reserved.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `;
        } else if (action === 'complete') {
          emailSubject = 'Your Card Payment Has Been Completed';
          emailBody = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">💳 Oakline Bank</h1>
                  <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Payment Completed</p>
                </div>
                <div style="padding: 40px 32px;">
                  <h2 style="color: #065f46; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                    Payment Successfully Completed
                  </h2>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Your card payment for <strong>$${claim.amount}</strong> has been successfully completed.
                  </p>
                  <div style="background: #f0fdfa; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0; border-radius: 8px;">
                    <h3 style="color: #065f46; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">Payment Details</h3>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                      <li style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Amount:</strong> $${claim.amount}</li>
                      <li style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Card:</strong> ****${claim.card_number?.slice(-4) || 'N/A'}</li>
                      <li style="padding: 8px 0; border-bottom: 1px solid #d1fae5;"><strong>Recipient:</strong> ${claim.recipient_email || 'N/A'}</li>
                      <li style="padding: 8px 0;"><strong>Completion Date:</strong> ${new Date().toLocaleString()}</li>
                    </ul>
                  </div>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                    Thank you for using Oakline Bank.
                  </p>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                    Best regards,<br/>Oakline Bank Card Services
                  </p>
                </div>
                <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #718096; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Oakline Bank. All rights reserved.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `;
        } else if (action === 'cancel') {
          emailSubject = 'Card Payment Declined - Consider Opening an Oakline Account';
          emailBody = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 24px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">💳 Oakline Bank</h1>
                  <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Payment Processing Update</p>
                </div>
                <div style="padding: 40px 32px;">
                  <h2 style="color: #92400e; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                    Card Payment Could Not Be Processed
                  </h2>
                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Unfortunately, your card payment request for <strong>$${claim.amount}</strong> could not be processed at this time.
                  </p>
                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 24px 0; border-radius: 8px;">
                    <h3 style="color: #92400e; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">Payment Details</h3>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                      <li style="padding: 8px 0; border-bottom: 1px solid #fde68a;"><strong>Amount:</strong> $${claim.amount}</li>
                      <li style="padding: 8px 0; border-bottom: 1px solid #fde68a;"><strong>Card Last 4:</strong> ****${claim.card_number?.slice(-4) || 'N/A'}</li>
                      <li style="padding: 8px 0; border-bottom: 1px solid #fde68a;"><strong>Status:</strong> Declined</li>
                      <li style="padding: 8px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</li>
                    </ul>
                  </div>
                  
                  <h3 style="color: #1e40af; font-size: 20px; font-weight: 600; margin: 32px 0 16px 0;">
                    🏦 Recommended Next Steps
                  </h3>
                  <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 16px 0;">
                    <h4 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                      ✨ Open an Oakline Bank Account
                    </h4>
                    <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
                      Enjoy seamless, instant transfers with an Oakline Bank account. No more payment failures or delays!
                    </p>
                    <ul style="color: #4a5568; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0; padding-left: 20px;">
                      <li>Instant payment processing</li>
                      <li>No transaction limits</li>
                      <li>Enhanced security features</li>
                      <li>24/7 customer support</li>
                      <li>Free online and mobile banking</li>
                    </ul>
                    <div style="text-align: center; margin: 20px 0;">
                      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://theoaklinebank.com'}/apply" 
                         style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
                                color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; 
                                font-weight: 600; font-size: 16px;">
                        Open an Account Today
                      </a>
                    </div>
                  </div>

                  <h4 style="color: #4a5568; font-size: 16px; font-weight: 600; margin: 24px 0 12px 0;">
                    Other Payment Options:
                  </h4>
                  <ul style="color: #4a5568; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li><strong>Use a Different Debit Card:</strong> Try submitting your payment with another card</li>
                    <li><strong>Link Your Bank Account:</strong> Connect your existing bank account for direct transfers</li>
                    <li><strong>Contact Support:</strong> Our team is ready to help you complete your transaction</li>
                  </ul>

                  <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 8px;">
                    <p style="color: #065f46; font-size: 14px; margin: 0; line-height: 1.6;">
                      <strong>💡 Need Assistance?</strong><br/>
                      Contact us at <a href="mailto:support@theoaklinebank.com" style="color: #1e40af;">support@theoaklinebank.com</a> or call <strong>+1 (636) 635-6122</strong>
                    </p>
                  </div>

                  <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
                    Best regards,<br/>
                    <strong>Oakline Bank Payment Services</strong>
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
          `;
        }

        const fromEmail = process.env.SMTP_FROM_PAYMENTS || process.env.SMTP_FROM || transferEmail;
        await transporter.sendMail({
          from: fromEmail,
          to: recipientEmail,
          subject: emailSubject,
          html: emailBody
        });
        
        console.log(`Email sent successfully to ${recipientEmail} for claim ${claim.id}`);
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
