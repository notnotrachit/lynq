import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { getSocialLinkingContract, getProvider, getPendingClaim } from "@/lib/ethereum-program";

export async function POST(request: NextRequest) {
  try {
    // Get wallet address from headers (set by middleware)
    const walletAddress = request.headers.get("x-wallet-address");

    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { socialHandle } = body;

    if (!socialHandle) {
      return NextResponse.json(
        { error: "Missing socialHandle parameter" },
        { status: 400 }
      );
    }

    console.log("BUILD-CLAIM-TX: Processing claim for", socialHandle, "by", walletAddress);

    // Validate Ethereum address
    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    // Normalize handle (remove @ if present)
    const normalizedHandle = socialHandle.startsWith("@") ? socialHandle.substring(1) : socialHandle;

    // Check if user has linked this handle
    const provider = getProvider();
    const contract = getSocialLinkingContract(provider);
    const socialLink = await contract.getSocialLink(walletAddress);
    
    console.log("BUILD-CLAIM-TX: User's social links:", {
      twitter: socialLink.twitter,
      instagram: socialLink.instagram,
      linkedin: socialLink.linkedin,
    });

    const hasLinkedHandle = 
      socialLink.twitter === normalizedHandle ||
      socialLink.instagram === normalizedHandle ||
      socialLink.linkedin === normalizedHandle;

    console.log("BUILD-CLAIM-TX: Has linked handle?", hasLinkedHandle);

    if (!hasLinkedHandle) {
      return NextResponse.json(
        { error: `Social handle '${normalizedHandle}' not linked to your wallet. Please link it first.` },
        { status: 400 }
      );
    }

    // Get pending claim to verify it exists
    const pendingClaim = await getPendingClaim(normalizedHandle);

    if (!pendingClaim || pendingClaim.claimed || pendingClaim.amount === BigInt(0)) {
      return NextResponse.json(
        { error: "No pending claim found or already claimed" },
        { status: 400 }
      );
    }

    console.log("BUILD-CLAIM-TX: Pending claim amount:", pendingClaim.amount.toString());

    const contractAddress = await contract.getAddress();

    // Build the claimToken transaction
    const claimTx = await contract.claimToken.populateTransaction(normalizedHandle);

    // Estimate gas from the user's address
    const gasEstimate = await contract.claimToken.estimateGas(normalizedHandle, {
      from: walletAddress
    });
    const gasWithBuffer = (BigInt(gasEstimate) * BigInt(120)) / BigInt(100);

    console.log("BUILD-CLAIM-TX: Gas estimate:", gasEstimate.toString());

    // Return transaction data
    return NextResponse.json({
      transaction: {
        from: walletAddress,
        to: contractAddress,
        data: claimTx.data,
        value: "0x0",
        gas: "0x" + gasWithBuffer.toString(16),
      },
      amount: Number(pendingClaim.amount),
      message: `Claim ${Number(pendingClaim.amount) / 1_000_000} PYUSD`,
    });
  } catch (error: any) {
    console.error("BUILD-CLAIM-TX: Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to build claim transaction" },
      { status: 500 }
    );
  }
}
