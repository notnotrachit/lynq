import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, getPYUSDAddress } from "./web3-config";

// SocialLinking Contract ABI (minimal - add more methods as needed)
export const SOCIAL_LINKING_ABI = [
  "function linkTwitter(address user, string calldata twitterHandle) external",
  "function linkInstagram(address user, string calldata instagramHandle) external",
  "function linkLinkedIn(address user, string calldata linkedinHandle) external",
  "function sendToken(address recipient, uint256 amount) external",
  "function sendTokenToUnlinked(string calldata socialHandle, uint256 amount, uint256 paymentIndex) external",
  "function claimToken(string calldata socialHandle) external",
  "function getSocialLink(address user) external view returns (tuple(address owner, string twitter, string instagram, string linkedin))",
  "function getPendingClaim(string calldata socialHandle) external view returns (tuple(string socialHandle, uint256 amount, bool claimed, uint256 paymentCount))",
  "function getPaymentRecord(string calldata socialHandle, uint256 paymentIndex) external view returns (tuple(address sender, string socialHandle, uint256 amount, uint256 timestamp, bool claimed))",
  "event TwitterLinked(address indexed user, string handle)",
  "event InstagramLinked(address indexed user, string handle)",
  "event LinkedInLinked(address indexed user, string handle)",
  "event TokenSent(address indexed from, address indexed to, uint256 amount)",
  "event TokenSentToUnlinked(address indexed from, string socialHandle, uint256 amount, uint256 paymentIndex)",
  "event TokenClaimed(address indexed claimer, string socialHandle, uint256 amount)",
] as const;

// PYUSD ERC20 ABI (standard ERC20 methods)
export const PYUSD_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const;

export type SocialLink = {
  owner: string;
  twitter: string;
  instagram: string;
  linkedin: string;
};

export type PendingClaim = {
  socialHandle: string;
  amount: bigint;
  claimed: boolean;
  paymentCount: bigint;
};

export type PaymentRecord = {
  sender: string;
  socialHandle: string;
  amount: bigint;
  timestamp: bigint;
  claimed: boolean;
};

// Get RPC provider
export function getProvider(chainId?: number): ethers.JsonRpcProvider {
  // Use environment variable or default RPC URLs
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || getDefaultRpcUrl(chainId);
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getDefaultRpcUrl(chainId?: number): string {
  switch (chainId) {
    case 1: // Ethereum Mainnet
      return process.env.NEXT_PUBLIC_ETHEREUM_RPC || "https://eth.llamarpc.com";
    case 11155111: // Sepolia
      return process.env.NEXT_PUBLIC_SEPOLIA_RPC || "https://1rpc.io/sepolia";
    case 8453: // Base
      return process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org";
    case 84532: // Base Sepolia
      return process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org";
    default:
      return "https://1rpc.io/sepolia"; // Default to Sepolia for testing
  }
}

// Get contract instances
export function getSocialLinkingContract(
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  return new ethers.Contract(
    CONTRACT_ADDRESSES.socialLinking,
    SOCIAL_LINKING_ABI,
    signerOrProvider
  );
}

export function getPYUSDContract(
  chainId: number,
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  return new ethers.Contract(
    getPYUSDAddress(chainId),
    PYUSD_ABI,
    signerOrProvider
  );
}

// Helper functions for server-side operations
export async function getSocialLink(
  userAddress: string,
  chainId?: number
): Promise<SocialLink | null> {
  try {
    const provider = getProvider(chainId);
    const contract = getSocialLinkingContract(provider);
    const result = await contract.getSocialLink(userAddress);
    
    // Check if account exists (owner is not zero address)
    if (result.owner === ethers.ZeroAddress) {
      return null;
    }
    
    return {
      owner: result.owner,
      twitter: result.twitter,
      instagram: result.instagram,
      linkedin: result.linkedin,
    };
  } catch (error) {
    console.error("Error fetching social link:", error);
    return null;
  }
}

export async function getTwitterHandle(
  userAddress: string,
  chainId?: number
): Promise<string | null> {
  const socialLink = await getSocialLink(userAddress, chainId);
  return socialLink?.twitter || null;
}

export async function getInstagramHandle(
  userAddress: string,
  chainId?: number
): Promise<string | null> {
  const socialLink = await getSocialLink(userAddress, chainId);
  return socialLink?.instagram || null;
}

export async function getLinkedInHandle(
  userAddress: string,
  chainId?: number
): Promise<string | null> {
  const socialLink = await getSocialLink(userAddress, chainId);
  return socialLink?.linkedin || null;
}

// Reverse lookup: Find wallet by social handle
export async function findWalletBySocialHandle(
  handle: string,
  platform: "twitter" | "instagram" | "linkedin",
  chainId?: number
): Promise<string | null> {
  try {
    const provider = getProvider(chainId);
    const contract = getSocialLinkingContract(provider);

    // Normalize handle (remove @ if present)
    const normalizedHandle = handle.startsWith("@") ? handle.substring(1) : handle;

    // Get the event name based on platform
    let eventName: string;
    switch (platform) {
      case "twitter":
        eventName = "TwitterLinked";
        break;
      case "instagram":
        eventName = "InstagramLinked";
        break;
      case "linkedin":
        eventName = "LinkedInLinked";
        break;
    }

    // Query events from the contract
    // Get events from the last 10000 blocks (adjust as needed)
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 10000);

    const filter = contract.filters[eventName]();
    const events = await contract.queryFilter(filter, fromBlock, currentBlock);

    // Search through events to find matching handle
    for (const event of events.reverse()) { // Reverse to get most recent first
      // Type guard to check if it's an EventLog
      if ('args' in event) {
        const args = event.args;
        if (args && args.handle.toLowerCase() === normalizedHandle.toLowerCase()) {
          const walletAddress = args.user;
          
          // Verify the link is still active by checking current contract state
          const socialLink = await contract.getSocialLink(walletAddress);
          const isStillLinked = 
            socialLink.twitter.toLowerCase() === normalizedHandle.toLowerCase() ||
            socialLink.instagram.toLowerCase() === normalizedHandle.toLowerCase() ||
            socialLink.linkedin.toLowerCase() === normalizedHandle.toLowerCase();
          
          if (isStillLinked) {
            return walletAddress; // Return the wallet address only if still linked
          }
        }
      }
    }

    return null; // No match found
  } catch (error) {
    console.error("Error finding wallet by social handle:", error);
    return null;
  }
}

export async function getPendingClaim(
  socialHandle: string,
  chainId?: number
): Promise<PendingClaim | null> {
  try {
    const provider = getProvider(chainId);
    const contract = getSocialLinkingContract(provider);
    const result = await contract.getPendingClaim(socialHandle);
    
    return {
      socialHandle: result.socialHandle,
      amount: result.amount,
      claimed: result.claimed,
      paymentCount: result.paymentCount,
    };
  } catch (error) {
    console.error("Error fetching pending claim:", error);
    return null;
  }
}

export async function getPYUSDBalance(
  userAddress: string,
  chainId: number
): Promise<bigint> {
  try {
    const provider = getProvider(chainId);
    const pyusdContract = getPYUSDContract(chainId, provider);
    const balance = await pyusdContract.balanceOf(userAddress);
    return balance;
  } catch (error) {
    console.error("Error fetching PYUSD balance:", error);
    return BigInt(0);
  }
}

// Helper to build transaction for linking social accounts (admin only)
export async function buildLinkTwitterTransaction(
  userAddress: string,
  twitterHandle: string,
  adminWallet: ethers.Wallet
): Promise<ethers.ContractTransactionResponse> {
  // Connect wallet to provider
  const provider = getProvider();
  const signer = adminWallet.connect(provider);
  const contract = getSocialLinkingContract(signer);
  return await contract.linkTwitter(userAddress, twitterHandle);
}

export async function buildLinkInstagramTransaction(
  userAddress: string,
  instagramHandle: string,
  adminWallet: ethers.Wallet
): Promise<ethers.ContractTransactionResponse> {
  const provider = getProvider();
  const signer = adminWallet.connect(provider);
  const contract = getSocialLinkingContract(signer);
  return await contract.linkInstagram(userAddress, instagramHandle);
}

export async function buildLinkLinkedInTransaction(
  userAddress: string,
  linkedinHandle: string,
  adminWallet: ethers.Wallet
): Promise<ethers.ContractTransactionResponse> {
  const provider = getProvider();
  const signer = adminWallet.connect(provider);
  const contract = getSocialLinkingContract(signer);
  return await contract.linkLinkedIn(userAddress, linkedinHandle);
}
