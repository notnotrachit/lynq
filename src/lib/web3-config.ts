import { http, createConfig } from "wagmi";
import { base, baseSepolia, mainnet, sepolia } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";

// PYUSD Token Addresses (from https://github.com/paxosglobal/pyusd-contract)
export const PYUSD_ADDRESSES = {
  [mainnet.id]: "0x6c3ea9036406852006290770bedfcaba0e23a0e8",
  [sepolia.id]: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
  // Base networks - PYUSD not yet officially deployed
  [base.id]: process.env.NEXT_PUBLIC_PYUSD_ADDRESS || "",
  [baseSepolia.id]: process.env.NEXT_PUBLIC_PYUSD_ADDRESS || "",
} as const;

// Contract addresses
export const CONTRACT_ADDRESSES = {
  socialLinking: process.env.NEXT_PUBLIC_SOCIAL_LINKING_ADDRESS || "",
};

// PYUSD has 6 decimals (like USDC)
export const PYUSD_DECIMALS = 6;

// Wagmi configuration
export const config = createConfig({
  chains: [base, baseSepolia, mainnet, sepolia],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

// Helper functions
export function getPYUSDAddress(chainId: number): string {
  const address = PYUSD_ADDRESSES[chainId as keyof typeof PYUSD_ADDRESSES];
  if (!address) {
    throw new Error(`PYUSD not configured for chain ${chainId}`);
  }
  return address;
}

export function formatPYUSD(amount: bigint): string {
  const divisor = BigInt(10 ** PYUSD_DECIMALS);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(PYUSD_DECIMALS, "0");
  return `${whole}.${fractionStr}`;
}

export function parsePYUSD(amount: string): bigint {
  const [whole, fraction = "0"] = amount.split(".");
  const paddedFraction = fraction.padEnd(PYUSD_DECIMALS, "0").slice(0, PYUSD_DECIMALS);
  return BigInt(whole) * BigInt(10 ** PYUSD_DECIMALS) + BigInt(paddedFraction);
}
