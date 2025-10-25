import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { getProvider, getSocialLinkingContract, getPYUSDContract } from "@/lib/ethereum-program";

export async function POST(request: NextRequest) {
  try {
    console.log("BUILD-UNLINKED-TX: Received request");

    const body = await request.json();
    console.log("BUILD-UNLINKED-TX: Request body:", body);

    const { senderWallet, socialHandle, tokenAddress, amount } = body;

    if (!senderWallet || !socialHandle || !tokenAddress || !amount) {
      console.error("BUILD-UNLINKED-TX: Missing parameters");
      return NextResponse.json(
        { error: "Missing required parameters: senderWallet, socialHandle, tokenAddress, amount" },
        { status: 400 }
      );
    }

    // Validate Ethereum address
    if (!ethers.isAddress(senderWallet) || !ethers.isAddress(tokenAddress)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    console.log("BUILD-UNLINKED-TX: Building Ethereum transaction");
    console.log("BUILD-UNLINKED-TX: Sender:", senderWallet);
    console.log("BUILD-UNLINKED-TX: Social handle (original):", socialHandle);
    console.log("BUILD-UNLINKED-TX: Token address:", tokenAddress);
    console.log("BUILD-UNLINKED-TX: Amount:", amount);

    const provider = getProvider();
    const socialLinkingContract = getSocialLinkingContract(provider);
    // Use Sepolia chainId (11155111)
    const pyusdContract = getPYUSDContract(11155111, provider);

    // Normalize handle (remove @ if present)
    const normalizedHandle = socialHandle.startsWith("@") ? socialHandle.substring(1) : socialHandle;
    console.log("BUILD-UNLINKED-TX: Normalized handle:", normalizedHandle);

    // Get contract address
    const contractAddress = await socialLinkingContract.getAddress();
    console.log("BUILD-UNLINKED-TX: Contract address:", contractAddress);

    // Get current payment count for this social handle
    let paymentIndex = 0;
    try {
      const pendingClaim = await socialLinkingContract.pendingClaims(normalizedHandle);
      console.log("BUILD-UNLINKED-TX: Existing pending claim:", {
        socialHandle: pendingClaim.socialHandle,
        amount: pendingClaim.amount.toString(),
        claimed: pendingClaim.claimed,
        paymentCount: pendingClaim.paymentCount.toString(),
      });
      paymentIndex = Number(pendingClaim.paymentCount || 0);
    } catch (error) {
      // If no pending claim exists, paymentIndex stays 0
      console.log("BUILD-UNLINKED-TX: No existing pending claim, using paymentIndex 0");
    }

    console.log("BUILD-UNLINKED-TX: Payment index:", paymentIndex);

    // Build the transaction data for sendTokenToUnlinked
    // First, we need to approve PYUSD transfer
    const approveTx = await pyusdContract.approve.populateTransaction(
      contractAddress,
      amount
    );

    // Then build the sendTokenToUnlinked transaction
    const sendTx = await socialLinkingContract.sendTokenToUnlinked.populateTransaction(
      normalizedHandle,
      amount,
      paymentIndex
    );

    console.log("BUILD-UNLINKED-TX: Transaction built successfully");
    console.log("BUILD-UNLINKED-TX: Approve data:", approveTx.data);
    console.log("BUILD-UNLINKED-TX: Send data:", sendTx.data);

    // Estimate gas for approve transaction
    const approveGasEstimate = await pyusdContract.approve.estimateGas(
      contractAddress,
      amount
    );

    console.log("BUILD-UNLINKED-TX: Approve gas estimate:", approveGasEstimate.toString());

    // Calculate gas with 20% buffer for approve
    const approveGasWithBuffer = (BigInt(approveGasEstimate) * BigInt(120)) / BigInt(100);
    
    // For the second transaction, we can't estimate gas yet because approval hasn't happened
    // Use a higher gas limit to be safe (500k should be enough for contract calls with storage writes)
    const sendGasLimit = BigInt(500000);

    // For now, return just the approve transaction
    // In a production app, you'd want to handle both approve and send in sequence
    // or use a multicall contract
    return NextResponse.json({
      transaction: {
        from: senderWallet,
        to: tokenAddress,
        data: approveTx.data,
        value: "0x0",
        gas: "0x" + approveGasWithBuffer.toString(16), // Add 20% buffer
      },
      nextTransaction: {
        from: senderWallet,
        to: contractAddress,
        data: sendTx.data,
        value: "0x0",
        gas: "0x" + sendGasLimit.toString(16), // Use default gas limit
      },
      message: `Step 1: Approve PYUSD spending. Step 2: Send to ${socialHandle}`,
      requiresTwoSteps: true,
    });
  } catch (error: any) {
    console.error("BUILD-UNLINKED-TX: Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to build transaction" },
      { status: 500 }
    );
  }
}
