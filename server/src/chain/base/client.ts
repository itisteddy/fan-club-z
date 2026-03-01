import { createPublicClient, http, webSocket } from 'viem';
import { defineChain } from 'viem/utils';

export function getBaseChain() {
  const chainId = Number(process.env.CHAIN_ID ?? '0');
  if (!chainId) throw new Error('CHAIN_ID missing');
  
  // Minimal custom chain def (Sepolia or Mainnet) – avoids importing full chain packages
  return defineChain({
    id: chainId,
    name: chainId === 8453 ? 'Base' : 'Base Sepolia',
    network: chainId === 8453 ? 'base' : 'base-sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { 
        http: [process.env.RPC_URL!], 
        webSocket: process.env.RPC_WS_URL ? [process.env.RPC_WS_URL] : undefined 
      },
      public: { 
        http: [process.env.RPC_URL!], 
        webSocket: process.env.RPC_WS_URL ? [process.env.RPC_WS_URL] : undefined 
      },
    },
  });
}

export function makePublicClient() {
  const chain = getBaseChain();
  // Always use HTTP for more stability - WebSocket connections can be unreliable
  console.log('[FCZ-PAY] Creating public client with HTTP transport');
  return createPublicClient({ chain, transport: http(process.env.RPC_URL!) });
}
