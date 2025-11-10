
# Frontend Network Fees & Account Opening Deposit Fix

## Critical Issues to Fix

### 1. Network Fee Deduction Not Implemented
Currently, when users make crypto deposits, the system is crediting the exact amount without deducting network fees. This needs to be fixed.

### 2. Wrong Table for Account Opening Deposits
Users making minimum deposits for account opening are having records created in the `crypto_deposits` table instead of the `account_opening_crypto_deposits` table.

---

## Issue #1: Network Fee Implementation

### Problem
The system credits users the full deposit amount without deducting blockchain network fees. This causes the bank to lose money on every transaction.

### Solution Required
Update the deposit submission flow to:

1. **Calculate and display network fees BEFORE submission**
   - Show users the fee amount
   - Show the net amount they will receive
   - Give users the option to add extra to cover fees

2. **Update the deposit submission payload to include:**
   ```javascript
   {
     amount: number,           // Gross amount (what user sends)
     fee: number,             // Network fee amount
     net_amount: number,      // Amount user receives (amount - fee)
     // ... other fields
   }
   ```

3. **Display structure should show:**
   ```
   Deposit Amount:        $1,000.00
   Network Fee:           -$15.00
   You Will Receive:      $985.00
   ```

### Files to Check & Update

Look for components/pages that handle crypto deposits:
- `pages/deposit/` or `pages/crypto-deposit/`
- `pages/account/funding/` or similar
- `components/DepositForm.js` or `CryptoDepositForm.js`
- API call functions in `lib/api.js` or `utils/api.js`

### Expected Behavior

**Before Submission:**
- Fetch current network fee from backend: `GET /api/crypto/network-fees?asset=BTC`
- Calculate net amount: `netAmount = depositAmount - networkFee`
- Show breakdown to user with clear fee disclosure
- Allow user to adjust amount if needed

**On Submission:**
- Send all three values: `amount`, `fee`, `net_amount`
- Backend will validate and store correctly

---

## Issue #2: Account Opening Deposit Flow

### Problem
When users submit their minimum deposit for account opening, the frontend is incorrectly calling the general crypto deposit endpoint and creating records in the `crypto_deposits` table instead of `account_opening_crypto_deposits`.

### Solution Required

The backend already has the correct endpoint: `/api/account-opening/submit-deposit`

**Expected Payload Structure:**
```javascript
{
  userId: string,              // Required
  applicationId: string,       // Required - from the account opening application
  accountId: string,           // Required - the account being funded
  cryptoAssetId: string,       // Required - which crypto (BTC, ETH, etc.)
  assignedWalletId: string,    // Required - the admin-assigned wallet for this deposit
  amount: number,              // Required - gross amount
  fee: number,                 // Required - network fee
  net_amount: number,          // Required - amount - fee
  txHash: string,              // Optional - transaction hash if available
  memo: string                 // Optional - for coins that require memo (XRP, XLM, etc.)
}
```

### Files to Locate & Fix

Search for code related to:
1. **Account opening flow pages**
   - `pages/account-opening/`
   - `pages/onboarding/`
   - `pages/apply/funding/` or `pages/apply/deposit/`

2. **Initial deposit components**
   - Components that show "Make your minimum deposit"
   - Components that display assigned wallet address
   - Components with crypto deposit forms during account setup

3. **Common incorrect patterns to find and fix:**
   ```javascript
   // ❌ WRONG - Don't do this for account opening deposits
   fetch('/api/crypto-deposit', {
     method: 'POST',
     body: JSON.stringify({ ... })
   })
   
   // ❌ WRONG
   submitDeposit({ userId, amount, txHash, ... })
   
   // ✅ CORRECT - Use this for account opening deposits
   fetch('/api/account-opening/submit-deposit', {
     method: 'POST',
     body: JSON.stringify({
       userId,
       applicationId,
       accountId,
       cryptoAssetId,
       assignedWalletId,
       amount,
       fee,
       net_amount,
       txHash,
       memo
     })
   })
   ```

4. **Check utility/API files:**
   - `lib/api.js`
   - `utils/crypto.js`
   - `services/deposit.js`
   - Any file with deposit-related API calls

---

## Combined Implementation Guide

### Step 1: Create Network Fee Utility

Create or update a utility to fetch and calculate fees:

```javascript
// utils/cryptoFees.js or lib/cryptoFees.js
export async function getNetworkFee(assetId) {
  const response = await fetch(`/api/crypto/network-fees?assetId=${assetId}`);
  const data = await response.json();
  return data.fee || 0;
}

export function calculateNetAmount(grossAmount, fee) {
  const net = parseFloat(grossAmount) - parseFloat(fee);
  return Math.max(0, net); // Prevent negative amounts
}
```

### Step 2: Update Account Opening Deposit Component

Find the component that handles account opening deposits and update it:

```javascript
// Example structure - adapt to your actual component
import { useState, useEffect } from 'react';
import { getNetworkFee, calculateNetAmount } from '@/utils/cryptoFees';

function AccountOpeningDepositForm({ 
  userId, 
  applicationId, 
  accountId, 
  cryptoAssetId,
  assignedWalletId,
  minDepositRequired 
}) {
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState(0);
  const [netAmount, setNetAmount] = useState(0);
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch network fee when crypto asset changes
  useEffect(() => {
    async function fetchFee() {
      const networkFee = await getNetworkFee(cryptoAssetId);
      setFee(networkFee);
    }
    if (cryptoAssetId) {
      fetchFee();
    }
  }, [cryptoAssetId]);

  // Recalculate net amount when amount or fee changes
  useEffect(() => {
    if (amount && fee) {
      const net = calculateNetAmount(amount, fee);
      setNetAmount(net);
    }
  }, [amount, fee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/account-opening/submit-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          applicationId,
          accountId,
          cryptoAssetId,
          assignedWalletId,
          amount: parseFloat(amount),
          fee: parseFloat(fee),
          net_amount: parseFloat(netAmount),
          txHash: txHash || null,
          memo: memo || null
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Handle success
        alert('Deposit submitted successfully!');
      } else {
        // Handle error
        alert(data.error || 'Failed to submit deposit');
      }
    } catch (error) {
      console.error('Deposit submission error:', error);
      alert('Failed to submit deposit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Deposit Amount (USD)</label>
        <input
          type="number"
          step="0.01"
          min={minDepositRequired}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      {/* Fee Breakdown Display */}
      {amount && (
        <div style={{ 
          background: '#fef3c7', 
          padding: '1rem', 
          borderRadius: '8px',
          marginTop: '1rem'
        }}>
          <h4>Transaction Breakdown</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Deposit Amount:</span>
            <strong>${parseFloat(amount).toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
            <span>Network Fee:</span>
            <strong>-${parseFloat(fee).toFixed(2)}</strong>
          </div>
          <hr />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem' }}>
            <span><strong>You Will Receive:</strong></span>
            <strong style={{ color: '#059669' }}>${netAmount.toFixed(2)}</strong>
          </div>
          
          {netAmount < minDepositRequired && (
            <div style={{ color: '#dc2626', marginTop: '0.5rem' }}>
              ⚠️ Net amount (${netAmount.toFixed(2)}) is below minimum required (${minDepositRequired.toFixed(2)}).
              Please increase your deposit amount to cover the fee.
            </div>
          )}
        </div>
      )}

      <div>
        <label>Transaction Hash (Optional)</label>
        <input
          type="text"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="Enter transaction hash after sending"
        />
      </div>

      <button 
        type="submit" 
        disabled={loading || !amount || netAmount < minDepositRequired}
      >
        {loading ? 'Submitting...' : 'Submit Deposit'}
      </button>
    </form>
  );
}
```

### Step 3: Create Network Fee API Endpoint (if not exists)

```javascript
// pages/api/crypto/network-fees.js
export default async function handler(req, res) {
  const { assetId } = req.query;

  // Fetch from crypto_assets table
  const { data, error } = await supabase
    .from('crypto_assets')
    .select('network_fee')
    .eq('id', assetId)
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch network fee' });
  }

  return res.json({ 
    fee: data.network_fee || 0,
    assetId 
  });
}
```

---

## Testing Checklist

After making changes, verify:

### Network Fees:
- ✅ Fee is displayed before submission
- ✅ Net amount is calculated correctly (amount - fee)
- ✅ User is warned if net amount is below minimum
- ✅ Fee is included in the API payload
- ✅ Backend stores all three values (amount, fee, net_amount)

### Account Opening Deposits:
- ✅ Deposits go to `/api/account-opening/submit-deposit` endpoint
- ✅ All required fields are included in payload
- ✅ Records are created in `account_opening_crypto_deposits` table
- ✅ NOT in `crypto_deposits` table
- ✅ applicationId and accountId are correctly passed
- ✅ assignedWalletId matches the wallet assigned by admin

### User Experience:
- ✅ Clear fee disclosure before submission
- ✅ Helpful error messages if amount is insufficient
- ✅ Success confirmation after submission
- ✅ No confusion between general deposits and account opening deposits

---

## Common Mistakes to Avoid

1. **Don't calculate fees only on backend** - Show them to users upfront
2. **Don't allow deposits below minimum after fees** - Validate this
3. **Don't mix account opening deposits with regular deposits** - Use correct endpoint
4. **Don't forget to include all required fields** - Missing applicationId, accountId, or assignedWalletId will cause errors
5. **Don't assume fee is always the same** - Fetch it dynamically based on crypto asset

---

## Files You'll Likely Need to Update

Based on typical Next.js structure, check these locations:

1. **Pages/Components:**
   - `pages/account-opening/**/*`
   - `pages/onboarding/**/*`
   - `components/AccountOpening/**/*`
   - `components/CryptoDeposit/**/*`

2. **API Utilities:**
   - `lib/api.js`
   - `utils/crypto.js`
   - `services/deposits.js`

3. **Create New Files:**
   - `utils/cryptoFees.js` (for fee calculations)
   - `pages/api/crypto/network-fees.js` (if not exists)

---

## Questions to Ask While Searching Code

1. Where does the account opening flow happen?
2. Which component renders the "make your minimum deposit" screen?
3. Where is the wallet address displayed to users?
4. What API endpoint is currently being called for deposits?
5. Is there already a fee calculation anywhere in the code?

---

## Backend Endpoints You Should Use

✅ **For Account Opening Deposits:**
- `POST /api/account-opening/submit-deposit`

✅ **For Network Fees:**
- `GET /api/crypto/network-fees?assetId={id}`

❌ **Don't Use for Account Opening:**
- `POST /api/crypto-deposit` (this is for regular deposits only)

---

## Summary

**Fix #1:** Add network fee display and calculation to all deposit forms, deduct fees from credited amount.

**Fix #2:** Route account opening deposits to the correct endpoint (`/api/account-opening/submit-deposit`) with all required fields.

Both fixes require updating frontend components to properly calculate, display, and submit the correct data.
