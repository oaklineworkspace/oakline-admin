
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
