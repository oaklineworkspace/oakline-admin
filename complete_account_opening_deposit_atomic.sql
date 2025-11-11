-- PostgreSQL RPC function to atomically complete an account opening deposit
-- This prevents race conditions and ensures data integrity
-- UPDATED: Now credits fees to bank treasury account

CREATE OR REPLACE FUNCTION complete_account_opening_deposit_atomic(
  p_deposit_id UUID,
  p_admin_id UUID,
  p_approved_amount DECIMAL,
  p_tx_hash TEXT DEFAULT NULL,
  p_confirmations INTEGER DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit RECORD;
  v_account RECORD;
  v_treasury_account RECORD;
  v_credit_amount DECIMAL;
  v_fee_amount DECIMAL;
  v_balance_before DECIMAL;
  v_balance_after DECIMAL;
  v_treasury_balance_before DECIMAL;
  v_treasury_balance_after DECIMAL;
  v_tx_reference TEXT;
  v_tx_exists BOOLEAN;
  v_result JSON;
  v_treasury_user_id UUID := '7f62c3ec-31fe-4952-aa00-2c922064d56a';
BEGIN
  -- Lock the deposit row for update to prevent concurrent modifications
  SELECT * INTO v_deposit
  FROM account_opening_crypto_deposits
  WHERE id = p_deposit_id
  FOR UPDATE;

  -- Check if deposit exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Deposit not found'
    );
  END IF;

  -- Check if already completed
  IF v_deposit.status = 'completed' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Deposit has already been completed'
    );
  END IF;

  -- Determine amount to credit (net amount after fees)
  -- The approved_amount passed should already be net of fees (amount - fee)
  IF p_approved_amount IS NOT NULL AND p_approved_amount > 0 THEN
    v_credit_amount := p_approved_amount;
  ELSE
    -- Fallback: calculate net amount from amount - fee
    v_credit_amount := COALESCE(v_deposit.amount, 0) - COALESCE(v_deposit.fee, 0);
  END IF;

  IF v_credit_amount IS NULL OR v_credit_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid deposit amount'
    );
  END IF;

  -- Determine transaction reference
  v_tx_reference := COALESCE(p_tx_hash, v_deposit.tx_hash, p_deposit_id::TEXT);

  -- Check if transaction already exists
  SELECT EXISTS(
    SELECT 1
    FROM transactions
    WHERE reference = v_tx_reference
    AND account_id = v_deposit.account_id
  ) INTO v_tx_exists;

  IF v_tx_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Deposit has already been credited to account'
    );
  END IF;

  -- Get and lock the account row
  SELECT * INTO v_account
  FROM accounts
  WHERE id = v_deposit.account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Account not found'
    );
  END IF;

  -- Calculate new balance
  v_balance_before := COALESCE(v_account.balance, 0);
  v_balance_after := v_balance_before + v_credit_amount;

  -- Update account balance
  UPDATE accounts
  SET balance = v_balance_after,
      updated_at = NOW()
  WHERE id = v_account.id;

  -- Create transaction record for user
  INSERT INTO transactions (
    user_id,
    account_id,
    type,
    amount,
    status,
    description,
    balance_before,
    balance_after,
    reference,
    created_at
  ) VALUES (
    v_deposit.user_id,
    v_deposit.account_id,
    'deposit',
    v_credit_amount,
    'completed',
    'Account opening deposit credited',
    v_balance_before,
    v_balance_after,
    v_tx_reference,
    NOW()
  );

  -- Process fee to treasury account if fee exists
  v_fee_amount := COALESCE(v_deposit.fee, 0);
  
  IF v_fee_amount > 0 THEN
    -- Get and lock the treasury account
    SELECT * INTO v_treasury_account
    FROM accounts
    WHERE user_id = v_treasury_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      -- If treasury account not found, log a warning but don't fail the deposit
      RAISE WARNING 'Treasury account not found. Fee amount: %', v_fee_amount;
    ELSE
      -- Calculate treasury new balance
      v_treasury_balance_before := COALESCE(v_treasury_account.balance, 0);
      v_treasury_balance_after := v_treasury_balance_before + v_fee_amount;

      -- Update treasury account balance
      UPDATE accounts
      SET balance = v_treasury_balance_after,
          updated_at = NOW()
      WHERE id = v_treasury_account.id;

      -- Create transaction record for treasury
      INSERT INTO transactions (
        user_id,
        account_id,
        type,
        amount,
        status,
        description,
        balance_before,
        balance_after,
        reference,
        created_at
      ) VALUES (
        v_treasury_user_id,
        v_treasury_account.id,
        'credit',
        v_fee_amount,
        'completed',
        'Account opening deposit fee from user ' || COALESCE(v_deposit.user_id::TEXT, 'unknown'),
        v_treasury_balance_before,
        v_treasury_balance_after,
        'fee_' || v_tx_reference,
        NOW()
      );
    END IF;
  END IF;

  -- Update deposit status to completed
  UPDATE account_opening_crypto_deposits
  SET status = 'completed',
      approved_by = p_admin_id,
      approved_at = NOW(),
      approved_amount = v_credit_amount,
      completed_at = NOW(),
      tx_hash = COALESCE(p_tx_hash, tx_hash),
      confirmations = COALESCE(p_confirmations, confirmations),
      admin_notes = COALESCE(p_admin_notes, admin_notes),
      updated_at = NOW()
  WHERE id = p_deposit_id;

  -- Build success response with all relevant data
  v_result := json_build_object(
    'success', true,
    'deposit_id', p_deposit_id,
    'account_id', v_deposit.account_id,
    'user_id', v_deposit.user_id,
    'credited_amount', v_credit_amount,
    'fee_amount', v_fee_amount,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'treasury_fee_credited', v_fee_amount > 0,
    'transaction_reference', v_tx_reference,
    'message', 'Deposit completed, balance credited successfully' || 
               CASE WHEN v_fee_amount > 0 
                    THEN ', and fee credited to treasury' 
                    ELSE '' 
               END
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic in PostgreSQL, all changes will be reverted
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to complete deposit: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
-- GRANT EXECUTE ON FUNCTION complete_account_opening_deposit_atomic TO authenticated;

-- Example usage:
-- SELECT * FROM complete_account_opening_deposit_atomic(
--   '123e4567-e89b-12d3-a456-426614174000'::UUID,  -- deposit_id
--   'admin-uuid'::UUID,                             -- admin_id
--   1000.00,                                        -- approved_amount
--   'tx_hash_12345',                                -- tx_hash (optional)
--   10,                                             -- confirmations (optional)
--   'Verified via bank statement'                   -- admin_notes (optional)
-- );