
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { emailLogId } = req.body;

    if (!emailLogId) {
      return res.status(400).json({ error: 'Email log ID is required' });
    }

    // Fetch the original email log
    const { data: emailLog, error: fetchError } = await supabaseAdmin
      .from('email_logs')
      .select('*')
      .eq('id', emailLogId)
      .single();

    if (fetchError || !emailLog) {
      return res.status(404).json({ error: 'Email log not found' });
    }

    // Prepare email data
    const emailData = {
      to: emailLog.recipient_email,
      subject: emailLog.subject || 'Message from Oakline Bank',
      html: emailLog.email_content_html,
      text: emailLog.email_content_text,
      type: emailLog.email_type || EMAIL_TYPES.DEFAULT
    };

    // Send the email
    const result = await sendEmail(emailData);

    // Log the resend in email_logs
    await supabaseAdmin.from('email_logs').insert({
      recipient_email: emailLog.recipient_email,
      recipient_user_id: emailLog.recipient_user_id,
      subject: `[RESEND] ${emailLog.subject}`,
      email_type: emailLog.email_type,
      provider: result.provider,
      status: 'sent',
      message_id: result.messageId,
      email_content_html: emailLog.email_content_html,
      email_content_text: emailLog.email_content_text,
      metadata: {
        ...emailLog.metadata,
        resent_from_log_id: emailLogId,
        resent_at: new Date().toISOString()
      }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Email resent successfully',
      messageId: result.messageId,
      provider: result.provider
    });

  } catch (error) {
    console.error('Error resending email:', error);
    return res.status(500).json({ 
      error: 'Failed to resend email', 
      details: error.message 
    });
  }
}
