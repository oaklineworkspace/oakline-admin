
# Crypto Deposit Transaction Update Guide

## Overview
This guide explains how to update the admin approval process to modify existing pending transactions instead of creating new ones.

## Admin Approval Endpoint Changes

When an admin approves a crypto deposit (either in `crypto_deposits` or `account_opening_crypto_deposits`), the system should:

1. **Find the existing pending transaction** using the `deposit_id` reference
2. **Update that transaction** to 'completed' status
3. **NOT create a new transaction entry**

## Implementation Steps

### Step 1: Admin Crypto Deposit Approval
In your admin panel's crypto deposit approval function, add this logic:

```javascript
// After approving the crypto deposit, update the existing transaction
const { data: existingTx } = await supabaseAdmin
  .from('transactions')
  .select('id')
  .eq('reference_number', depositId)
  .eq('type', 'crypto_deposit')
  .eq('status', 'pending')
  .single();

if (existingTx) {
  // Update the existing transaction
  await supabaseAdmin
    .from('transactions')
    .update({
      status: 'completed',
      description: `${cryptoType} Deposit - Completed`,
      completed_at: new Date().toISOString()
    })
    .eq('id', existingTx.id);
} else {
  // Fallback: create transaction if it doesn't exist
  await supabaseAdmin
    .from('transactions')
    .insert([{
      user_id: deposit.user_id,
      account_id: deposit.account_id,
      type: 'crypto_deposit',
      amount: deposit.net_amount || deposit.amount,
      status: 'completed',
      description: `${cryptoType} Deposit - Completed`,
      reference_number: depositId,
      completed_at: new Date().toISOString(),
      metadata: {
        crypto_type: cryptoType,
        network_type: networkType,
        deposit_id: depositId
      }
    }]);
}
```

### Step 2: Handle Rejection
When rejecting a deposit:

```javascript
const { data: existingTx } = await supabaseAdmin
  .from('transactions')
  .select('id')
  .eq('reference_number', depositId)
  .eq('type', 'crypto_deposit')
  .eq('status', 'pending')
  .single();

if (existingTx) {
  await supabaseAdmin
    .from('transactions')
    .update({
      status: 'failed',
      description: `${cryptoType} Deposit - Rejected`,
      metadata: {
        ...existingTx.metadata,
        rejection_reason: rejectionReason
      }
    })
    .eq('id', existingTx.id);
}
```

### Step 3: Update Account Balance
Only update the account balance when status changes to 'completed':

```javascript
if (newStatus === 'completed') {
  const { data: account } = await supabaseAdmin
    .from('accounts')
    .select('balance')
    .eq('id', deposit.account_id)
    .single();

  await supabaseAdmin
    .from('accounts')
    .update({
      balance: (parseFloat(account.balance) || 0) + parseFloat(deposit.net_amount || deposit.amount)
    })
    .eq('id', deposit.account_id);
}
```

## Benefits
- **No duplicate transactions** in user's transaction history
- **Real-time status updates** - users see pending → completed
- **Cleaner data** - one transaction per deposit
- **Better UX** - users can track their deposit from submission to completion

## Database Considerations
Make sure your `transactions` table has:
- `reference_number` column (to link with deposit_id)
- `metadata` jsonb column (to store crypto details)
- `completed_at` timestamp column
