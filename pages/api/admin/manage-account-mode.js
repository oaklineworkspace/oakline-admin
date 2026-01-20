import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { verifyAdminAuth } from '../../../lib/adminAuth';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await verifyAdminAuth(req);
    if (authResult.error) {
      return res.status(authResult.status || 401).json({ error: authResult.error });
    }

    const adminId = authResult.user?.id;
    const { userId, action, reason, amountRequired } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ error: 'Missing required fields: userId, action' });
    }

    const validActions = ['freeze', 'unfreeze', 'set_unlimited', 'remove_unlimited'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be one of: ' + validActions.join(', ') });
    }

    let updateData = {};
    const now = new Date().toISOString();

    switch (action) {
      case 'freeze':
        updateData = {
          is_frozen: true,
          frozen_at: now,
          frozen_by: adminId,
          frozen_reason: reason || 'Account frozen by admin'
        };
        if (amountRequired !== undefined && amountRequired !== null) {
          updateData.freeze_amount_required = parseFloat(amountRequired) || 0;
        }
        break;
      case 'unfreeze':
        updateData = {
          is_frozen: false,
          frozen_at: null,
          frozen_by: null,
          frozen_reason: null,
          freeze_amount_required: 0
        };
        break;
      case 'set_unlimited':
        updateData = {
          is_unlimited: true,
          unlimited_at: now,
          unlimited_by: adminId,
          unlimited_reason: reason || 'Unlimited access granted by admin'
        };
        break;
      case 'remove_unlimited':
        updateData = {
          is_unlimited: false,
          unlimited_at: null,
          unlimited_by: null,
          unlimited_reason: null
        };
        break;
    }

    updateData.updated_at = now;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Failed to update user status: ' + error.message });
    }

    // Send freeze notification email
    if (action === 'freeze' && data.email) {
      try {
        const freezeAmount = updateData.freeze_amount_required || 0;
        const freezeReason = updateData.frozen_reason || 'Account frozen by administration';
        
        // Get bank details for contact info
        const { data: bankDetails } = await supabaseAdmin
          .from('bank_details')
          .select('name, email_support, email_security, phone')
          .single();

        const bankName = bankDetails?.name || 'Oakline Bank';
        const supportEmail = bankDetails?.email_support || bankDetails?.email_security || 'support@theoaklinebank.com';
        const bankPhone = bankDetails?.phone || '+1 (636) 635-6122';

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">⚠️ Account Frozen</h1>
                <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">${bankName} Security Notice</p>
              </div>
              
              <div style="padding: 40px 32px;">
                <h2 style="color: #dc2626; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                  Dear ${data.first_name || 'Valued Customer'},
                </h2>
                
                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  We regret to inform you that your account has been frozen. During this time, certain account activities may be restricted.
                </p>
                
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 24px 0;">
                  <h3 style="color: #991b1b; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Reason for Account Freeze:</h3>
                  <p style="color: #7f1d1d; font-size: 15px; line-height: 1.5; margin: 0;">
                    ${freezeReason}
                  </p>
                </div>
                
                ${freezeAmount > 0 ? `
                <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 24px 0;">
                  <h3 style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Amount Required to Unfreeze:</h3>
                  <p style="color: #78350f; font-size: 28px; font-weight: 700; margin: 0;">
                    $${parseFloat(freezeAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p style="color: #92400e; font-size: 14px; margin: 12px 0 0 0;">
                    Please deposit or transfer this amount to resolve the freeze on your account.
                  </p>
                </div>
                ` : ''}
                
                <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 24px 0;">
                  <h3 style="color: #0369a1; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Need Assistance?</h3>
                  <p style="color: #0c4a6e; font-size: 14px; line-height: 1.6; margin: 0;">
                    If you believe this action was taken in error or need further clarification, please contact our support team:
                  </p>
                  <p style="color: #0369a1; font-size: 14px; margin: 12px 0 0 0;">
                    📧 Email: <a href="mailto:${supportEmail}" style="color: #0369a1;">${supportEmail}</a><br/>
                    📞 Phone: ${bankPhone}
                  </p>
                </div>
                
                <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                  We appreciate your prompt attention to this matter and look forward to restoring full access to your account.
                </p>
              </div>
              
              <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #718096; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} ${bankName}. All rights reserved.<br/>
                  Member FDIC | This is an automated security notification.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail({
          to: data.email,
          subject: `⚠️ Important: Your ${bankName} Account Has Been Frozen`,
          html: emailHtml,
          type: EMAIL_TYPES.NOTIFY
        });

        console.log(`Freeze notification email sent to ${data.email}`);
      } catch (emailError) {
        console.error('Failed to send freeze notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully ${action.replace('_', ' ')} for user`,
      profile: data
    });

  } catch (error) {
    console.error('Error in manage-account-mode:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
