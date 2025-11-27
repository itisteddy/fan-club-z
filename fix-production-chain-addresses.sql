-- Fix Production Chain Addresses for Base Sepolia
-- Run this in your Supabase SQL Editor

-- Insert/Update USDC address for production (Base Sepolia)
INSERT INTO chain_addresses (env, chain_id, kind, address)
VALUES 
  ('prod', 84532, 'usdc', '0x5B966ca41aB58E50056EE1711c9766Ca3382F115')
ON CONFLICT (env, chain_id, kind) 
DO UPDATE SET address = EXCLUDED.address;

-- Insert/Update escrow address for production (Base Sepolia)
-- Replace '0xYourProduction_Escrow_Address' with your actual escrow contract address
INSERT INTO chain_addresses (env, chain_id, kind, address)
VALUES 
  ('prod', 84532, 'escrow', '0xYourProduction_Escrow_Address')
ON CONFLICT (env, chain_id, kind) 
DO UPDATE SET address = EXCLUDED.address;

-- Verify the addresses were inserted
SELECT env, chain_id, kind, address, created_at
FROM chain_addresses
WHERE env = 'prod' AND chain_id = 84532
ORDER BY kind;

