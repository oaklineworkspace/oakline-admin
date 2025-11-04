-- ============================================================================
-- ATOMIC LOAN PAYMENT APPROVAL FUNCTION
-- Run this in your Supabase SQL Editor to create a safe approval function
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_loan_payment_atomic(
  p_payment_id uuid,
  p_admin_id uuid,
  p_action text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment record;
  v_loan record;
  v_current_balance numeric;
  v_new_balance numeric;
  v_principal numeric;
  v_next_payment_date date;
  v_result jsonb;
BEGIN
  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid action. Must be "approve" or "reject"';
  END IF;

  SELECT * INTO v_payment
  FROM loan_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.status != 'pending' THEN
    RAISE EXCEPTION 'Payment is already %. Only pending payments can be processed.', v_payment.status;
  END IF;

  IF p_action = 'reject' THEN
    UPDATE loan_payments
    SET status = 'failed',
        notes = COALESCE(notes, '') || ' | Rejected: ' || COALESCE(p_rejection_reason, 'No reason provided'),
        updated_at = now()
    WHERE id = p_payment_id;

    INSERT INTO audit_logs (action, admin_id, details, created_at)
    VALUES (
      'loan_payment_rejected',
      p_admin_id,
      jsonb_build_object(
        'payment_id', p_payment_id,
        'loan_id', v_payment.loan_id,
        'amount', v_payment.amount,
        'reason', COALESCE(p_rejection_reason, 'No reason provided')
      ),
      now()
    );

    v_result := jsonb_build_object(
      'success', true,
      'message', 'Payment rejected successfully',
      'payment', jsonb_build_object('id', p_payment_id, 'status', 'failed')
    );

    RETURN v_result;
  END IF;

  SELECT * INTO v_loan
  FROM loans
  WHERE id = v_payment.loan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan not found';
  END IF;

  v_current_balance := v_loan.remaining_balance;
  v_principal := v_payment.principal_amount;
  v_new_balance := GREATEST(0, v_current_balance - v_principal);

  v_next_payment_date := (now() + INTERVAL '30 days')::date;

  UPDATE loans
  SET remaining_balance = v_new_balance,
      last_payment_date = now(),
      payments_made = COALESCE(payments_made, 0) + 1,
      is_late = false,
      next_payment_date = v_next_payment_date,
      status = CASE WHEN v_new_balance = 0 THEN 'closed' ELSE status END,
      updated_at = now()
  WHERE id = v_payment.loan_id
  AND remaining_balance = v_current_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan balance changed during approval. Please retry.';
  END IF;

  UPDATE loan_payments
  SET status = 'completed',
      balance_after = v_new_balance,
      notes = COALESCE(notes, '') || ' | Approved by admin',
      updated_at = now()
  WHERE id = p_payment_id;

  INSERT INTO audit_logs (action, admin_id, details, created_at)
  VALUES (
    'loan_payment_approved',
    p_admin_id,
    jsonb_build_object(
      'payment_id', p_payment_id,
      'loan_id', v_payment.loan_id,
      'amount', v_payment.amount,
      'previous_balance', v_current_balance,
      'new_balance', v_new_balance
    ),
    now()
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Payment approved successfully',
    'payment', jsonb_build_object(
      'id', p_payment_id,
      'status', 'completed',
      'amount', v_payment.amount
    ),
    'loan', jsonb_build_object(
      'remaining_balance', v_new_balance,
      'payments_made', v_loan.payments_made + 1,
      'status', CASE WHEN v_new_balance = 0 THEN 'closed' ELSE v_loan.status END
    )
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users (admin check is done in app layer)
GRANT EXECUTE ON FUNCTION approve_loan_payment_atomic TO authenticated;

COMMENT ON FUNCTION approve_loan_payment_atomic IS 'Atomically approve or reject a pending loan payment with optimistic locking';
