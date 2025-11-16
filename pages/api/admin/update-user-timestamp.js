
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
    const { table, recordId, field, value } = req.body;

    if (!table || !recordId || !field) {
      return res.status(400).json({ error: 'Table, recordId, and field are required' });
    }

    // Whitelist of allowed tables and timestamp fields
    const allowedTables = {
      'applications': ['submitted_at', 'processed_at', 'updated_at'],
      'profiles': ['created_at', 'updated_at', 'enrollment_completed_at'],
      'accounts': ['created_at', 'updated_at', 'approved_at', 'funding_confirmed_at'],
      'cards': ['created_at', 'updated_at', 'activated_at'],
      'loans': ['created_at', 'updated_at', 'start_date', 'approved_at', 'disbursed_at', 'deposit_date', 'next_payment_date', 'last_payment_date'],
      'transactions': ['created_at', 'updated_at'],
      'login_history': ['login_time'],
      'check_deposits': ['created_at', 'updated_at', 'processed_at'],
      'crypto_deposits': ['created_at', 'updated_at', 'approved_at', 'rejected_at', 'completed_at'],
      'account_opening_crypto_deposits': ['created_at', 'updated_at', 'approved_at', 'rejected_at', 'completed_at'],
      'loan_payments': ['created_at', 'updated_at', 'payment_date'],
      'crypto_investments': ['created_at', 'updated_at', 'invested_at', 'closed_at', 'unlock_date'],
      'notifications': ['created_at', 'updated_at'],
      'account_requests': ['created_at', 'updated_at', 'request_date', 'reviewed_date'],
      'card_applications': ['requested_at', 'reviewed_at'],
      'user_sessions': ['created_at', 'last_activity', 'ended_at'],
      'suspicious_activity': ['created_at', 'resolved_at'],
      'password_history': ['changed_at']
    };

    if (!allowedTables[table]) {
      return res.status(400).json({ error: 'Invalid table' });
    }

    if (!allowedTables[table].includes(field)) {
      return res.status(400).json({ error: `Field ${field} is not allowed for table ${table}` });
    }

    // Update the timestamp
    const { data, error } = await supabaseAdmin
      .from(table)
      .update({ [field]: value })
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      console.error('Error updating timestamp:', error);
      return res.status(500).json({ error: 'Failed to update timestamp', details: error.message });
    }

    // Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: authResult.adminId,
        action: `Updated ${field} in ${table}`,
        table_name: table,
        old_data: { id: recordId },
        new_data: { [field]: value }
      });

    return res.status(200).json({
      success: true,
      message: `Successfully updated ${field} in ${table}`,
      data
    });
  } catch (error) {
    console.error('Error updating timestamp:', error);
    return res.status(500).json({
      error: 'Failed to update timestamp',
      details: error.message
    });
  }
}
