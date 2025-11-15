-- Create crypto_addresses table for storing user blockchain addresses
CREATE TABLE IF NOT EXISTS public.crypto_addresses (
  user_id uuid REFERENCES public.users(id),
  chain_id integer NOT NULL,
  address text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient user address lookups
CREATE INDEX IF NOT EXISTS idx_crypto_addr_user ON public.crypto_addresses(user_id);
