
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

-- Update the network_type constraint for loan_crypto_wallets table
ALTER TABLE public.loan_crypto_wallets 
DROP CONSTRAINT IF EXISTS loan_crypto_wallets_network_type_check;

ALTER TABLE public.loan_crypto_wallets 
ADD CONSTRAINT loan_crypto_wallets_network_type_check 
CHECK (network_type = ANY (ARRAY[
  'Bitcoin Mainnet'::text, 
  'BSC (BEP20)'::text, 
  'BSC'::text, 
  'ERC20'::text, 
  'TRC20'::text, 
  'SOL'::text, 
  'TON'::text, 
  'Arbitrum'::text, 
  'Base'::text, 
  'BEP20'::text, 
  'POLYGON'::text
]));

-- Also update crypto_type constraint to match
ALTER TABLE public.loan_crypto_wallets 
DROP CONSTRAINT IF EXISTS loan_crypto_wallets_crypto_type_check;

ALTER TABLE public.loan_crypto_wallets 
ADD CONSTRAINT loan_crypto_wallets_crypto_type_check 
CHECK (crypto_type = ANY (ARRAY[
  'BTC'::text, 
  'USDT'::text, 
  'ETH'::text, 
  'BNB'::text, 
  'SOL'::text, 
  'TON'::text
]));
