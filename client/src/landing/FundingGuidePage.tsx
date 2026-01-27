import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Fuel, Coins, ExternalLink, AlertCircle, CheckCircle, Copy, HelpCircle, ArrowLeft } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

// USDC contract address on Base Sepolia
const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Production URLs
const PROD_APP_URL = 'https://app.fanclubz.app';

const FundingGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const [copiedAddress, setCopiedAddress] = React.useState(false);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(USDC_CONTRACT_ADDRESS);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleGoToApp = () => {
    window.location.href = import.meta.env.PROD ? `${PROD_APP_URL}/wallet` : '/wallet';
  };

  return (
    <div className="bg-gradient-to-b from-[#211234] via-[#1b1130] to-[#130c24] text-white min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToHome}
              className="p-2 -ml-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <img
                src="/icons/icon-32.png"
                alt="FanClubZ"
                className="h-8 w-8"
                style={{ objectFit: 'contain' }}
              />
              <span className="text-lg font-semibold tracking-wide">FanClubZ</span>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_20%_20%,rgba(34,197,94,0.15),transparent_60%),radial-gradient(600px_circle_at_80%_0%,rgba(59,130,246,0.12),transparent_60%)]" />
          <div className="relative mx-auto max-w-4xl px-4 py-12 md:py-16">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
                <Wallet className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
                How to Fund Your Wallet
              </h1>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                FanClubZ uses the Base Sepolia testnet. Follow these steps to get test tokens and start making predictions.
              </p>
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="mx-auto max-w-4xl px-4 pb-16">
          <div className="space-y-6">
            
            {/* Step 1: Install Wallet */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white text-sm font-bold">1</span>
                <h2 className="text-xl font-semibold">Install a Wallet</h2>
              </div>
              <p className="text-white/70 mb-4">
                You'll need a crypto wallet to interact with FanClubZ. We recommend MetaMask, but any WalletConnect-compatible wallet works.
              </p>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-orange-400 text-lg font-bold">M</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">MetaMask</p>
                    <p className="text-sm text-white/50">Browser extension & mobile app</p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/70" />
              </a>
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-sm text-blue-300">
                  <strong>Tip:</strong> This is a one-time setup. Once installed, your wallet will work across all Web3 apps.
                </p>
              </div>
            </div>

            {/* Step 2: Add Network */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white text-sm font-bold">2</span>
                <h2 className="text-xl font-semibold">Add Base Sepolia Network</h2>
              </div>
              <p className="text-white/70 mb-4">
                Add the Base Sepolia testnet to your wallet using these settings:
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/50">Network Name</span>
                  <span className="font-medium text-white">Base Sepolia</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/50">RPC URL</span>
                  <span className="font-mono text-sm text-white">https://sepolia.base.org</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/50">Chain ID</span>
                  <span className="font-mono text-white">84532</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/50">Currency Symbol</span>
                  <span className="font-medium text-white">ETH</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/50">Block Explorer</span>
                  <a 
                    href="https://sepolia.basescan.org" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    sepolia.basescan.org
                  </a>
                </div>
              </div>
            </div>

            {/* Step 3: Get ETH */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white text-sm font-bold">3</span>
                <h2 className="text-xl font-semibold">Get Base Sepolia ETH (Gas)</h2>
              </div>
              <p className="text-white/70 mb-4">
                You need a small amount of ETH to pay for transaction fees (gas). Use any of these free faucets:
              </p>
              <div className="space-y-3">
                {[
                  { name: 'Alchemy Faucet', url: 'https://www.alchemy.com/faucets/base-sepolia', desc: 'Fast & reliable' },
                  { name: 'Chainlink Faucet', url: 'https://faucets.chain.link', desc: 'Select "Base Sepolia"' },
                  { name: 'QuickNode Faucet', url: 'https://faucet.quicknode.com', desc: 'Select "Base Sepolia"' },
                ].map((faucet) => (
                  <a
                    key={faucet.name}
                    href={faucet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <Fuel className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{faucet.name}</p>
                        <p className="text-sm text-white/50">{faucet.desc}</p>
                      </div>
                    </div>
                    <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/70" />
                  </a>
                ))}
              </div>
              <div className="mt-4 flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-300">
                  After claiming, confirm your wallet shows a small ETH balance on Base Sepolia before proceeding.
                </p>
              </div>
            </div>

            {/* Step 4: Get USDC */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white text-sm font-bold">4</span>
                <h2 className="text-xl font-semibold">Get Base Sepolia USDC</h2>
              </div>
              <p className="text-white/70 mb-4">
                USDC is the currency used for predictions on FanClubZ. Get test USDC from these faucets:
              </p>
              <div className="space-y-3">
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Coins className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Circle USDC Faucet</p>
                      <p className="text-sm text-white/50">Select "Base Sepolia" if available</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/70" />
                </a>
                <a
                  href="https://portal.cdp.coinbase.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Coins className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Coinbase Developer Platform</p>
                      <p className="text-sm text-white/50">Alternative USDC source</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-white/70" />
                </a>
              </div>

              {/* Warning */}
              <div className="mt-4 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-300">
                  <strong>Important:</strong> Only connect your wallet to trusted websites. Always verify the URL before approving any transactions.
                </p>
              </div>

              {/* USDC Token Address */}
              <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-sm text-white/50 mb-2">USDC Token Address (Base Sepolia)</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm font-mono text-white/80 break-all">
                    {USDC_CONTRACT_ADDRESS}
                  </code>
                  <button
                    onClick={handleCopyAddress}
                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                    aria-label="Copy address"
                  >
                    {copiedAddress ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-white/50 mt-2">
                  If USDC doesn't appear in your wallet, use "Import Token" and paste this address.
                </p>
              </div>
            </div>

            {/* Step 5: Use in App */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white text-sm font-bold">5</span>
                <h2 className="text-xl font-semibold">Use It in the App</h2>
              </div>
              <p className="text-white/70 mb-4">
                Now you're ready to start making predictions!
              </p>
              <ol className="space-y-3">
                {[
                  { step: 'Open the app and go to Wallet' },
                  { step: 'Tap Connect Wallet and select your wallet' },
                  { step: 'Tap Deposit to add USDC to your escrow balance' },
                  { step: 'Approve the transaction in your wallet when prompted' },
                  { step: 'Start placing predictions using your Available balance!' },
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-white/70 text-xs font-medium flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <p className="text-white/70">{item.step}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Troubleshooting */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <HelpCircle className="w-6 h-6 text-white/50" />
                <h2 className="text-xl font-semibold">Troubleshooting</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-white mb-1">No wallet prompt appearing?</p>
                  <p className="text-sm text-white/60">Make sure your wallet is set to Base Sepolia network, then try again.</p>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <p className="font-medium text-white mb-1">Balance didn't update?</p>
                  <p className="text-sm text-white/60">Wait a few seconds for the transaction to confirm, then refresh the page.</p>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <p className="font-medium text-white mb-1">USDC not visible in wallet?</p>
                  <p className="text-sm text-white/60">Import the USDC token using the address shown above.</p>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <p className="font-medium text-white mb-1">Out of gas?</p>
                  <p className="text-sm text-white/60">Grab a bit more Base Sepolia ETH from any of the faucets listed above.</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-white/70 mb-4">
                Ready to start making predictions?
              </p>
              <button
                onClick={handleGoToApp}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 text-sm font-semibold text-black shadow-xl transition hover:brightness-95"
              >
                Open the App
              </button>
            </div>

          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/icons/icon-32.png"
                alt="FanClubZ"
                className="h-6 w-6"
                style={{ objectFit: 'contain' }}
              />
              <span className="font-semibold">FanClubZ</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/50">
              <button onClick={handleBackToHome} className="hover:text-white transition-colors">
                Home
              </button>
              <button onClick={() => navigate('/support')} className="hover:text-white transition-colors">
                Support
              </button>
              <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">
                Privacy
              </button>
              <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">
                Terms
              </button>
              <button onClick={() => navigate('/guidelines')} className="hover:text-white transition-colors">
                Guidelines
              </button>
              <button onClick={() => navigate('/cookies')} className="hover:text-white transition-colors">
                Cookies
              </button>
              <a href="mailto:tech@fanclubz.app" className="hover:text-white transition-colors">
                Contact
              </a>
            </div>
          </div>
          <div className="mt-6 text-center text-xs text-white/50">
            © {CURRENT_YEAR} FanClubZ. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FundingGuidePage;
