# How to Get Your Deployer Wallet

## What You Need

A **deployer wallet** is just any Ethereum wallet with:
1. A private key (to sign transactions)
2. Some Base Sepolia ETH (to pay gas fees)

## Option 1: Use Your Existing MetaMask (Easiest)

### Step 1: Export Private Key from MetaMask

1. Open MetaMask extension
2. Click the **three dots (⋮)** next to your account name
3. Click **"Account details"**
4. Click **"Show private key"**
5. Enter your MetaMask password
6. **Copy the private key** (starts with `0x`)

### Step 2: Get Base Sepolia ETH

Visit: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

Or try these alternatives:
- https://www.alchemy.com/faucets/base-sepolia
- https://faucet.quicknode.com/base/sepolia

### Step 3: Create contracts/.env File

```bash
cd contracts
cat > .env << 'EOF'
BASE_SEPOLIA_RPC=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
EOF
```

Replace `0xYOUR_PRIVATE_KEY_HERE` with your actual private key from Step 1.

---

## Option 2: Create a New Test Wallet (Recommended for Security)

It's safer to create a **separate wallet just for testing** so you don't risk your main wallet.

### Method A: Using MetaMask

1. Open MetaMask
2. Click your account icon (top right)
3. Click **"Add account or hardware wallet"**
4. Click **"Add a new account"**
5. Name it "Base Sepolia Test"
6. Follow Option 1 steps to export the private key

### Method B: Using an Online Tool

Visit: https://vanity-eth.tk/

1. Click **"Generate"**
2. Save the **Address** and **Private Key**
3. Get Base Sepolia ETH for that address
4. Use that private key in your `.env` file

---

## Option 3: I'll Do It For You (After Dependencies Install)

Since the hardhat installation failed, let's use the existing Base Sepolia USDC instead!

**You don't need to deploy anything!**

Just use the official Base Sepolia USDbC address:
```
0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA
```

Run this SQL in Supabase:
```sql
INSERT INTO chain_addresses (env, chain_id, kind, address)
VALUES ('qa', 84532, 'usdc', '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA')
ON CONFLICT (env, chain_id, kind) DO UPDATE SET address=EXCLUDED.address;
```

Then you can test deposits immediately without deploying anything!

---

## Quick Decision Guide

**Want to test RIGHT NOW?**
→ Use Option 3 (existing Base Sepolia USDC)

**Want to deploy your own contract?**
→ Use Option 1 (MetaMask private key)

**Want maximum security?**
→ Use Option 2 (create new test wallet)

---

## Security Tips

⚠️ **NEVER**:
- Commit your private key to git
- Share your private key with anyone
- Use your main wallet private key in code
- Store private keys in plain text files (except .env which is gitignored)

✅ **ALWAYS**:
- Use a separate test wallet for development
- Keep your .env file in .gitignore
- Only use testnet ETH (never mainnet)
- Double-check you're on Base Sepolia (chain ID 84532)

---

## What I Recommend

**For fastest testing**: Use Option 3 (existing USDC address)
- No wallet setup needed
- No deployment needed
- Can test immediately
- Just need to get some test USDC

**For learning**: Use Option 1 or 2 and deploy your own
- Full control over the contract
- Learn the deployment process
- Can mint unlimited test tokens

Your choice! Both work perfectly.
