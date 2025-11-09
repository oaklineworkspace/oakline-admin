-- Add partial unique index to prevent duplicate crypto_type + network_type combinations
-- for account opening wallets (where user_id IS NULL)
-- This ensures each crypto type + network type combination can only have ONE account opening wallet

CREATE UNIQUE INDEX IF NOT EXISTS account_opening_wallets_unique_crypto_network 
ON public.admin_assigned_wallets(crypto_type, network_type) 
WHERE user_id IS NULL;

-- Explanation:
-- This partial unique index ensures that for account opening wallets (user_id IS NULL),
-- each combination of crypto_type and network_type can only exist once.
-- For example, you can only have ONE "Bitcoin" + "Bitcoin" wallet for account opening.
-- User-assigned wallets (where user_id IS NOT NULL) are not affected by this constraint.
