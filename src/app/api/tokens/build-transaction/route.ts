import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { getProvider, getPYUSDContract } from "@/lib/ethereum-program";

export async function POST(request: NextRequest) {
  try {
    console.log("BUILD-TX: Received request");

    const body = await request.json();
    console.log("BUILD-TX: Request body:", body);

    const { senderWallet, recipientWallet, tokenAddress, amount } = body;

    if (!senderWallet || !recipientWallet || !tokenAddress || !amount) {
      console.error("BUILD-TX: Missing parameters");
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Validate Ethereum addresses
    if (!ethers.isAddress(senderWallet) || !ethers.isAddress(recipientWallet) || !ethers.isAddress(tokenAddress)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    console.log("BUILD-TX: Building Ethereum transaction");

    const provider = getProvider();
    const pyusdContract = getPYUSDContract(11155111, provider); // Sepolia

    // Build the transfer transaction
    const transferTx = await pyusdContract.transfer.populateTransaction(
      recipientWallet,
      amount
    );

    // Estimate gas
    const gasEstimate = await pyusdContract.transfer.estimateGas(
      recipientWallet,
      amount,
      { from: senderWallet }
    );
    const gasWithBuffer = (BigInt(gasEstimate) * BigInt(120)) / BigInt(100);

    console.log("BUILD-TX: Gas estimate:", gasEstimate.toString());

    // Return transaction data
    return NextResponse.json({
      transaction: {
        from: senderWallet,
        to: tokenAddress,
        data: transferTx.data,
        value: "0x0",
        gas: "0x" + gasWithBuffer.toString(16),
      },
      message: `Transfer ${amount / 1_000_000} PYUSD to ${recipientWallet}`,
    });
  } catch (error: any) {
    console.error("BUILD-TX: Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to build transaction" },
      { status: 500 }
    );
  }
}
