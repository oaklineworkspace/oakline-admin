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
    const { accountId, status, reason } = req.body;

    if (!accountId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate status against schema
    const validStatuses = ['pending_application', 'approved', 'pending_funding', 'active', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }

    // Prepare update data
    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };

    // Add rejection reason if status is rejected
    if (status === 'rejected' && reason) {
      updateData.rejection_reason = reason;
    }

    // Update account status
    const { data, error: updateError } = await supabaseAdmin
      .from('accounts')
      .update(updateData)
      .eq('id', accountId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update account: ${updateError.message}`);
    }

    // Log the action in audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: authResult.user.id,
      action: `Account status changed to ${status}`,
      table_name: 'accounts',
      old_data: { account_id: accountId },
      new_data: data
    });

    // Send email notification if status is 'active' or 'rejected'
    if ((status === 'active' || status === 'rejected') && data.user_id) {
      try {
        // Fetch user details from profiles
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', data.user_id)
          .single();

        if (profile && profile.email) {
          const protocol = req.headers['x-forwarded-proto'] || 'https';
          const host = req.headers['x-forwarded-host'] || req.headers.host;
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

          await fetch(`${siteUrl}/api/send-account-status-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: profile.email,
              firstName: profile.first_name,
              lastName: profile.last_name,
              accountNumber: data.account_number,
              accountType: data.account_type,
              status: status,
              reason: reason || (status === 'rejected' ? 'Your account did not meet our requirements.' : '')
            })
          });

          console.log(`✅ Account ${status} email sent to:`, profile.email);
        }
      } catch (emailError) {
        console.error('❌ Failed to send account status email:', emailError);
        // Don't fail the account status update if email fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Account status updated successfully',
      account: data
    });

  } catch (error) {
    console.error('Error updating account status:', error);
    res.status(500).json({
      error: error.message || 'Failed to update account status'
    });
  }
}
