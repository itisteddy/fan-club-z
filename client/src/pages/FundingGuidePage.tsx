import React from 'react';
import { ArrowLeft, Wallet, Globe, Fuel, Coins, Smartphone, ExternalLink, AlertCircle, CheckCircle, Copy, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Page from '../components/ui/layout/Page';
import Card, { CardHeader, CardContent } from '../components/ui/card/Card';

// USDC contract address on Base Sepolia
const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

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

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/wallet');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white h-14 md:h-16 border-b border-gray-100 supports-[padding:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between h-full px-4 md:px-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">
              Funding Guide
            </h1>
          </div>
        </div>
      </header>

      <Page>
        {/* Intro Section */}
        <Card>
          <CardContent>
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">
                  How to Fund Your Wallet
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  FanClubZ uses the Base Sepolia testnet. Follow these steps to get test tokens and start making predictions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Install Wallet */}
        <Card>
          <CardHeader 
            title={
              <div className="flex items-center space-x-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold">1</span>
                <span>Install a Wallet</span>
              </div>
            }
          />
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              You'll need a crypto wallet to interact with FanClubZ. We recommend MetaMask, but any WalletConnect-compatible wallet works.
            </p>
            <div className="space-y-2">
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 text-sm font-bold">M</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">MetaMask</p>
                    <p className="text-xs text-gray-500">Browser extension & mobile app</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </a>
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-700">
                <strong>Tip:</strong> This is a one-time setup. Once installed, your wallet will work across all Web3 apps.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Add Network */}
        <Card>
          <CardHeader 
            title={
              <div className="flex items-center space-x-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold">2</span>
                <span>Add Base Sepolia Network</span>
              </div>
            }
          />
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Add the Base Sepolia testnet to your wallet using these settings:
            </p>
            <div className="space-y-2 bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500">Network Name</span>
                <span className="text-sm font-medium text-gray-900">Base Sepolia</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500">RPC URL</span>
                <span className="text-sm font-mono text-gray-900 break-all text-right">https://sepolia.base.org</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500">Chain ID</span>
                <span className="text-sm font-mono text-gray-900">84532</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500">Currency Symbol</span>
                <span className="text-sm font-medium text-gray-900">ETH</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500">Block Explorer</span>
                <a 
                  href="https://sepolia.basescan.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  sepolia.basescan.org
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Get ETH */}
        <Card>
          <CardHeader 
            title={
              <div className="flex items-center space-x-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold">3</span>
                <span>Get Base Sepolia ETH (Gas)</span>
              </div>
            }
          />
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              You need a small amount of ETH to pay for transaction fees (gas). Use any of these free faucets:
            </p>
            <div className="space-y-2">
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
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Fuel className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{faucet.name}</p>
                      <p className="text-xs text-gray-500">{faucet.desc}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </a>
              ))}
            </div>
            <div className="mt-3 flex items-start space-x-2 p-3 bg-emerald-50 rounded-xl">
              <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-emerald-700">
                After claiming, confirm your wallet shows a small ETH balance on Base Sepolia before proceeding.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Get USDC */}
        <Card>
          <CardHeader 
            title={
              <div className="flex items-center space-x-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold">4</span>
                <span>Get Base Sepolia USDC</span>
              </div>
            }
          />
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              USDC is the currency used for predictions on FanClubZ. Get test USDC from these faucets:
            </p>
            <div className="space-y-2">
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Coins className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Circle USDC Faucet</p>
                    <p className="text-xs text-gray-500">Select "Base Sepolia" if available</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </a>
              <a
                href="https://portal.cdp.coinbase.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Coins className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Coinbase Developer Platform</p>
                    <p className="text-xs text-gray-500">Alternative USDC source</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </a>
            </div>

            {/* Warning */}
            <div className="mt-3 flex items-start space-x-2 p-3 bg-amber-50 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>Important:</strong> Only connect your wallet to trusted websites. Always verify the URL before approving any transactions.
              </p>
            </div>

            {/* USDC Token Address */}
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-2">USDC Token Address (Base Sepolia)</p>
              <div className="flex items-center justify-between">
                <code className="text-xs font-mono text-gray-700 break-all">
                  {USDC_CONTRACT_ADDRESS}
                </code>
                <button
                  onClick={handleCopyAddress}
                  className="ml-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Copy address"
                >
                  {copiedAddress ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                If USDC doesn't appear in your wallet, use "Import Token" and paste this address.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 5: Use in App */}
        <Card>
          <CardHeader 
            title={
              <div className="flex items-center space-x-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold">5</span>
                <span>Use It in the App</span>
              </div>
            }
          />
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Now you're ready to start making predictions!
            </p>
            <ol className="space-y-3">
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium flex-shrink-0 mt-0.5">1</span>
                <p className="text-sm text-gray-700">Open the app and go to <strong>Wallet</strong></p>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium flex-shrink-0 mt-0.5">2</span>
                <p className="text-sm text-gray-700">Tap <strong>Connect Wallet</strong> and select your wallet</p>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium flex-shrink-0 mt-0.5">3</span>
                <p className="text-sm text-gray-700">Tap <strong>Deposit</strong> to add USDC to your escrow balance</p>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium flex-shrink-0 mt-0.5">4</span>
                <p className="text-sm text-gray-700">Approve the transaction in your wallet when prompted</p>
              </li>
              <li className="flex items-start space-x-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium flex-shrink-0 mt-0.5">5</span>
                <p className="text-sm text-gray-700">Start placing predictions using your <strong>Available</strong> balance!</p>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader 
            title={
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-gray-400" />
                <span>Troubleshooting</span>
              </div>
            }
          />
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">No wallet prompt appearing?</p>
                <p className="text-sm text-gray-600">Make sure your wallet is set to Base Sepolia network, then try again.</p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-900 mb-1">Balance didn't update?</p>
                <p className="text-sm text-gray-600">Wait a few seconds for the transaction to confirm, then refresh the page.</p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-900 mb-1">USDC not visible in wallet?</p>
                <p className="text-sm text-gray-600">Import the USDC token using the address shown above.</p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-900 mb-1">Out of gas?</p>
                <p className="text-sm text-gray-600">Grab a bit more Base Sepolia ETH from any of the faucets listed above.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 mb-4">
                Ready to start making predictions?
              </p>
              <button
                onClick={() => navigate('/wallet')}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
              >
                Go to Wallet
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer spacing for bottom nav */}
        <div className="h-4" />
      </Page>
    </div>
  );
};

export default FundingGuidePage;
