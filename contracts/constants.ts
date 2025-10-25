// PYUSD Token Addresses
// Source: https://github.com/paxosglobal/pyusd-contract

export const PYUSD_ADDRESSES = {
  // Ethereum Mainnet
  ethereum: "0x6c3ea9036406852006290770bedfcaba0e23a0e8",
  
  // Base Mainnet - PYUSD not yet deployed, will need to bridge or wait for official deployment
  base: "", // TODO: Update when PYUSD is officially deployed on Base
  
  // Sepolia Testnet - Use faucet at https://faucet.paxos.com/
  sepolia: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
  
  // Base Sepolia - May need to use bridged version or mock
  baseSepolia: "", // TODO: Update when available
} as const;

export const CHAIN_IDS = {
  ethereum: 1,
  sepolia: 11155111,
  base: 8453,
  baseSepolia: 84532,
} as const;

// PYUSD has 6 decimals (like USDC)
export const PYUSD_DECIMALS = 6;

// Helper to get PYUSD address for a chain
export function getPYUSDAddress(chainId: number): string {
  switch (chainId) {
    case CHAIN_IDS.ethereum:
      return PYUSD_ADDRESSES.ethereum;
    case CHAIN_IDS.sepolia:
      return PYUSD_ADDRESSES.sepolia;
    case CHAIN_IDS.base:
      return PYUSD_ADDRESSES.base || "";
    case CHAIN_IDS.baseSepolia:
      return PYUSD_ADDRESSES.baseSepolia || "";
    default:
      throw new Error(`PYUSD not available on chain ${chainId}`);
  }
}
