-- Address registry for contract addresses per environment
CREATE TABLE IF NOT EXISTS public.chain_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  env text NOT NULL CHECK (env IN ('local','qa','staging','prod')),
  chain_id integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('usdc','escrow')),
  address text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (env, chain_id, kind)
);
