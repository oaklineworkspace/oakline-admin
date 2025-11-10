-- Drop the old unique constraint on wallet_address
ALTER TABLE public.loan_crypto_wallets 
DROP CONSTRAINT IF EXISTS loan_crypto_wallets_wallet_address_key;

-- Create a composite unique index that allows same wallet address for different crypto types
-- This allows BTC (BEP20) and USDT (BEP20) to share the same wallet address
CREATE UNIQUE INDEX IF NOT EXISTS loan_wallets_unique_combo 
ON public.loan_crypto_wallets(crypto_asset_id) 
WHERE status = 'active';

-- Explanation:
-- This composite unique index ensures that:
-- - Only one active wallet can exist per crypto_asset_id (crypto type + network combination)
-- - Same wallet address can be used for different crypto types on the same network
-- - Example: BTC (BEP20) → 0x123... and USDT (BEP20) → 0x123... is ALLOWED
-- - But duplicate BTC (BEP20) entries are NOT ALLOWED