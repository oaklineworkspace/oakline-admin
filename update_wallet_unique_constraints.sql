
-- Drop the old partial unique index that prevents same wallet for different tokens
DROP INDEX IF EXISTS account_opening_wallets_unique_crypto_network;

-- Create a composite unique index that allows same wallet address for different crypto types
-- This allows BTC (BEP20) and USDT (BEP20) to share the same wallet address
CREATE UNIQUE INDEX IF NOT EXISTS account_opening_wallets_unique_combo 
ON public.admin_assigned_wallets(crypto_type, network_type, wallet_address) 
WHERE user_id IS NULL;

-- For user-assigned wallets, ensure uniqueness per user + crypto + network + wallet
CREATE UNIQUE INDEX IF NOT EXISTS user_wallets_unique_combo 
ON public.admin_assigned_wallets(user_id, crypto_type, network_type, wallet_address) 
WHERE user_id IS NOT NULL;

-- Explanation:
-- These composite unique indexes ensure that:
-- 1. For account opening wallets (user_id IS NULL):
--    - Same wallet address can be used for different crypto types on the same network
--    - Example: BTC (BEP20) → 0x123... and USDT (BEP20) → 0x123... is ALLOWED
--    - But duplicate BTC (BEP20) → 0x123... entries are NOT ALLOWED
--
-- 2. For user-assigned wallets (user_id IS NOT NULL):
--    - Each user can have the same wallet for different tokens
--    - But cannot have duplicate entries for the same user + crypto + network + wallet combo
