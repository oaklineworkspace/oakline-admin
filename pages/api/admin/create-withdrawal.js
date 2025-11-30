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

  const {
    user_id,
    account_id,
    amount,
    withdrawal_method,
    destination_account,
    destination_bank,
    routing_number
  } = req.body;

  // Validation
  if (!account_id || !amount || !withdrawal_method) {
    return res.status(400).json({ error: 'Missing required fields: account_id, amount, withdrawal_method' });
  }

  if (isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  const VALID_METHODS = ['bank_transfer', 'wire_transfer', 'check', 'ach'];
  if (!VALID_METHODS.includes(withdrawal_method)) {
    return res.status(400).json({ error: `Invalid method. Must be one of: ${VALID_METHODS.join(', ')}` });
  }

  try {
    // Fetch account to verify it exists and get user_id
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('user_id, balance')
      .eq('id', account_id)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const withdrawalAmount = parseFloat(amount);

    // Check if account has sufficient balance
    if (parseFloat(account.balance) < withdrawalAmount) {
      return res.status(400).json({ error: 'Insufficient balance for withdrawal' });
    }

    // Generate reference number
    const referenceNumber = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create withdrawal record
    const { data: withdrawal, error: createError } = await supabaseAdmin
      .from('withdrawals')
      .insert({
        user_id: user_id || account.user_id,
        account_id,
        amount: withdrawalAmount,
        withdrawal_method,
        destination_account,
        destination_bank,
        routing_number,
        status: 'pending',
        reference_number: referenceNumber,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating withdrawal:', createError);
      return res.status(500).json({ error: 'Failed to create withdrawal' });
    }

    // Log the creation
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: authResult.adminId,
        action: 'withdrawal_created',
        table_name: 'withdrawals',
        new_data: withdrawal
      });

    return res.status(201).json({
      success: true,
      message: 'Withdrawal created successfully',
      withdrawal
    });

  } catch (error) {
    console.error('Error creating withdrawal:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
