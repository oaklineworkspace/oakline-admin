
# Frontend Account Opening Deposit Fix Prompt

Use this prompt in your **frontend repository** with Replit AI:

---

I need to fix the account opening deposit submission flow. Currently, when users submit their minimum deposit for account opening, the frontend is creating records in the `crypto_deposits` table instead of the `account_opening_crypto_deposits` table.

Please locate all files in the frontend that handle account opening crypto deposit submissions and update them to:

1. Submit deposits to the correct API endpoint (should be something like `/api/account-opening/submit-deposit` or similar, NOT the general crypto deposit endpoint)

2. Ensure the payload includes these fields specific to account opening deposits:
   - user_id
   - application_id
   - account_id
   - crypto_asset_id
   - assigned_wallet_id
   - amount
   - tx_hash (transaction hash)
   - memo (if applicable)

3. The deposit should be tracked in the `account_opening_crypto_deposits` table, not `crypto_deposits`

4. Look for any components or pages related to:
   - Account opening flow
   - Initial deposit submission
   - Minimum deposit requirements
   - Crypto wallet assignment for new accounts

5. Common file locations to check:
   - pages/account-opening/ or pages/onboarding/
   - pages/deposit/ or pages/funding/
   - components related to account setup
   - API calls in lib/api.js or similar utility files

Please show me all the files that need to be updated and provide the corrected code for each file.

---

## Backend API Endpoint Already Created

The backend endpoint `/api/account-opening/submit-deposit` has already been created in the admin repository and expects this payload structure:

```javascript
{
  userId: string,
  applicationId: string,
  accountId: string,
  cryptoAssetId: string,
  assignedWalletId: string,
  amount: number,
  txHash: string (optional),
  memo: string (optional)
}
```

The frontend needs to call this endpoint instead of the general crypto deposit endpoint.
