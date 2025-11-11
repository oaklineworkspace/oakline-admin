# Deploy Fee-to-Treasury Feature to Production

## What Changed

Previously, when completing account opening deposits:
- ✅ User account was credited with the net amount (deposit - fee)
- ❌ **Fee was lost** - it wasn't going anywhere

Now:
- ✅ User account is credited with the net amount (deposit - fee)  
- ✅ **Fee is credited to the bank treasury account**
- ✅ Transaction records are created for both the user and treasury

## Example

If a user deposits **$100** with a **$5 fee**:

**Before:**
- User receives: $95
- Treasury receives: $0 (fee was lost)

**After:**
- User receives: $95
- Treasury receives: $5 ✨

## Deployment Steps for Production Database

### Step 1: Navigate to Your Supabase Dashboard
1. Go to https://app.supabase.com
2. Select your **production** project
3. Click "SQL Editor" in the left sidebar

### Step 2: Execute the Updated SQL Function
1. Click "New Query"
2. Copy the entire SQL code from the file `complete_account_opening_deposit_atomic.sql` in this repository
3. Paste it into the SQL Editor
4. Click "Run" or press Ctrl+Enter

### Step 3: Verify Deployment
After execution, you should see:
```
Success. No rows returned
```

This confirms the function has been updated successfully.

### Step 4: Test the Feature
1. Go to your admin panel at `/admin/manage-account-opening-deposits`
2. Complete a test deposit that has a fee
3. Check:
   - ✅ User account balance increased by net amount
   - ✅ Treasury account balance increased by fee amount
   - ✅ Two transaction records created (one for user, one for treasury)

## Treasury Account Details

The treasury account is identified by:
- **User ID:** `7f62c3ec-31fe-4952-aa00-2c922064d56a`

You can view the treasury balance at:
- Admin panel → `/admin/treasury`
- Or loans page → `/admin/admin-loans`

## Transaction Records

After completing a deposit with a fee, you'll see:

**User's Transaction:**
- Type: `deposit`
- Amount: Net amount (deposit - fee)
- Description: "Account opening deposit credited"
- Reference: Transaction hash or deposit ID

**Treasury Transaction:**
- Type: `credit`
- Amount: Fee amount
- Description: "Account opening deposit fee from user [user_id]"
- Reference: `fee_[transaction_hash]`

## Important Notes

1. **Development database already updated** - This change is live in your development environment
2. **Production requires manual deployment** - Follow the steps above to deploy to production
3. **Backward compatible** - If a deposit has no fee (fee = 0), it works normally without touching treasury
4. **Atomic operation** - Both user credit and treasury credit happen in one transaction - if either fails, both are rolled back

## Rollback (If Needed)

If you need to revert to the old version without treasury crediting, you can run the old SQL function. However, this is **not recommended** as fees should go to the treasury.

## Questions?

If you encounter any issues:
1. Check that the treasury account exists in your production database
2. Verify the treasury user ID is `7f62c3ec-31fe-4952-aa00-2c922064d56a`
3. Check the PostgreSQL logs in Supabase for any errors

---

**Summary:** This update ensures all account opening deposit fees are properly credited to the bank's treasury account, providing accurate financial tracking and reporting.
