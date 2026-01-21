import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';
import { createCardForAccount } from '../../../lib/cardGenerator';

async function generateUniqueAccountNumber() {
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const accountNumber = Array.from({length: 12}, () => Math.floor(Math.random() * 10)).join('');

    const { data, error } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('account_number', accountNumber)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking account number uniqueness:', error);
      throw error;
    }

    if (!data) {
      return accountNumber;
    }

    console.log(`Account number collision (attempt ${attempt + 1}/${maxAttempts}), retrying...`);
  }

  throw new Error('Failed to generate unique account number after maximum attempts');
}

async function sendApprovalEmail(userEmail, firstName, accountType, accountNumber, maskedCardNumber) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">🎉 Account Request Approved!</h1>
          <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
        </div>

        <div style="padding: 40px 32px;">
          <h2 style="color: #059669; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
            Great news, ${firstName}!
          </h2>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            Your request for a <strong>${accountType}</strong> account has been approved.
          </p>

          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0;">
            <h3 style="color: #059669; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
              Your New Account Details:
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Account Number:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${accountNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Account Type:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${accountType}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Debit Card:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${maskedCardNumber}</td>
              </tr>
            </table>
          </div>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
            You can now access your new account from your dashboard at 
            <a href="https://www.theoaklinebank.com" style="color: #059669; font-weight: 600;">www.theoaklinebank.com</a>
          </p>

          <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 16px 0;">
            Your new debit card has been activated and is ready to use.
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

  try {
    await sendEmail({
      to: userEmail,
      subject: '🎉 Your Additional Account Request Has Been Approved',
      html: emailHtml,
      type: EMAIL_TYPES.NOTIFY
    });
    console.log('✅ Approval email sent successfully to:', userEmail);
  } catch (error) {
    console.error('❌ Failed to send approval email:', error);
    throw error;
  }
}

async function sendRejectionEmail(userEmail, firstName, accountType, rejectionReason) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">Account Request Status Update</h1>
          <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
        </div>

        <div style="padding: 40px 32px;">
          <h2 style="color: #dc2626; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
            Dear ${firstName},
          </h2>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            We regret to inform you that your request for a <strong>${accountType}</strong> account could not be approved at this time.
          </p>

          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 24px 0;">
            <h3 style="color: #dc2626; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
              Reason:
            </h3>
            <p style="color: #991b1b; font-size: 14px; line-height: 1.6; margin: 0;">
              ${rejectionReason}
            </p>
          </div>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0;">
            If you have any questions or would like to discuss this further, please contact our support team.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="mailto:contact-us@theoaklinebank.com" style="display: inline-block; background-color: #1e40af; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Contact Support
            </a>
          </div>
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

  try {
    await sendEmail({
      to: userEmail,
      subject: 'Account Request Status Update - Oakline Bank',
      html: emailHtml,
      type: EMAIL_TYPES.NOTIFY
    });
    console.log('✅ Rejection email sent successfully to:', userEmail);
  } catch (error) {
    console.error('❌ Failed to send rejection email:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { status } = req.query;

      let query = supabaseAdmin
        .from('account_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: requests, error } = await query;

      if (error) {
        console.error('Error fetching account requests:', error);
        return res.status(500).json({ error: 'Failed to fetch account requests', details: error.message });
      }

      const enrichedRequests = await Promise.all(requests.map(async (request) => {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(request.user_id);
        const { data: accountType } = await supabaseAdmin
          .from('account_types')
          .select('*')
          .eq('id', request.account_type_id)
          .single();

        const userMetadata = userData?.user?.user_metadata || {};

        return {
          ...request,
          user_name: `${userMetadata.first_name || ''} ${userMetadata.last_name || ''}`.trim() || 'Unknown User',
          user_email: userData?.user?.email || 'No email',
          account_type: accountType
        };
      }));

      return res.status(200).json({ success: true, data: enrichedRequests });

    } catch (error) {
      console.error('Error in GET /api/admin/account-requests:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { request_id, action, rejection_reason, admin_id } = req.body;

      if (!request_id || !action) {
        return res.status(400).json({ error: 'request_id and action are required' });
      }

      if (action !== 'approve' && action !== 'reject') {
        return res.status(400).json({ error: 'action must be either "approve" or "reject"' });
      }

      if (action === 'reject' && !rejection_reason) {
        return res.status(400).json({ error: 'rejection_reason is required when rejecting' });
      }

      const { data: request, error: fetchError } = await supabaseAdmin
        .from('account_requests')
        .select('*')
        .eq('id', request_id)
        .single();

      if (fetchError || !request) {
        console.error('Error fetching account request:', fetchError);
        return res.status(404).json({ error: 'Account request not found', details: fetchError?.message });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ error: `Request already ${request.status}` });
      }

      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(request.user_id);
      const { data: accountType } = await supabaseAdmin
        .from('account_types')
        .select('*')
        .eq('id', request.account_type_id)
        .single();

      const userMetadata = userData?.user?.user_metadata || {};
      const firstName = userMetadata.first_name || 'User';
      const lastName = userMetadata.last_name || '';
      const userEmail = userData?.user?.email;

      request.account_type = accountType;

      if (action === 'approve') {
        try {
          const accountNumber = await generateUniqueAccountNumber();

          const { data: bankDetails } = await supabaseAdmin
            .from('bank_details')
            .select('routing_number')
            .limit(1)
            .single();

          const accountData = {
            user_id: request.user_id,
            account_number: accountNumber,
            routing_number: bankDetails?.routing_number || '075915826',
            account_type: request.account_type_name,
            balance: 0,
            status: 'active',
            min_deposit: request.account_type?.min_deposit || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
            approved_by: admin_id || null
          };

          const { data: newAccount, error: accountError } = await supabaseAdmin
            .from('accounts')
            .insert([accountData])
            .select()
            .single();

          if (accountError) {
            console.error('Error creating account:', accountError);
            throw new Error(`Failed to create account: ${accountError.message}`);
          }

          console.log('Account created successfully:', newAccount.id);

          const cardResult = await createCardForAccount(newAccount.id, admin_id);

          if (!cardResult.success) {
            console.error('Failed to create debit card, but account was created');
          }

          console.log('Card created successfully:', cardResult?.cardId);

          const { error: updateError } = await supabaseAdmin
            .from('account_requests')
            .update({
              status: 'approved',
              reviewed_date: new Date().toISOString(),
              reviewed_by: admin_id || null,
              created_account_id: newAccount.id,
              created_card_id: cardResult?.cardId || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', request_id);

          if (updateError) {
            console.error('Error updating request status:', updateError);
          }

          if (userEmail) {
            try {
              await sendApprovalEmail(
                userEmail,
                firstName,
                request.account_type_name,
                accountNumber,
                cardResult.maskedNumber
              );
              console.log('Approval email sent to:', userEmail);
            } catch (emailError) {
              console.error('Error sending approval email:', emailError);
            }
          }

          return res.status(200).json({
            success: true,
            message: 'Account request approved successfully',
            data: {
              account_id: newAccount.id,
              account_number: accountNumber,
              card_id: cardResult.cardId,
              masked_card_number: cardResult.maskedNumber
            }
          });

        } catch (approvalError) {
          console.error('Error during approval process:', approvalError);
          return res.status(500).json({ 
            error: 'Failed to approve request', 
            details: approvalError.message 
          });
        }
      }

      if (action === 'reject') {
        const { error: updateError } = await supabaseAdmin
          .from('account_requests')
          .update({
            status: 'rejected',
            reviewed_date: new Date().toISOString(),
            reviewed_by: admin_id || null,
            rejection_reason: rejection_reason,
            updated_at: new Date().toISOString()
          })
          .eq('id', request_id);

        if (updateError) {
          console.error('Error rejecting request:', updateError);
          return res.status(500).json({ error: 'Failed to reject request', details: updateError.message });
        }

        if (userEmail) {
          try {
            await sendRejectionEmail(
              userEmail,
              firstName,
              request.account_type_name,
              rejection_reason
            );
            console.log('Rejection email sent to:', userEmail);
          } catch (emailError) {
            console.error('Error sending rejection email:', emailError);
          }
        }

        return res.status(200).json({
          success: true,
          message: 'Account request rejected successfully'
        });
      }

    } catch (error) {
      console.error('Error in POST /api/admin/account-requests:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account request ID is required' 
        });
      }

      // Delete the account request
      const { error: deleteError } = await supabaseAdmin
        .from('account_requests')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Account request deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting account request:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to delete account request' 
      });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}