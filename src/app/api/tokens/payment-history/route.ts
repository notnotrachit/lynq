import { NextRequest, NextResponse } from "next/server";
import { getPendingClaim } from "@/lib/ethereum-program";

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get("x-wallet-address");

    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const handle = searchParams.get("handle");

    if (!handle) {
      return NextResponse.json(
        { error: "Handle parameter required" },
        { status: 400 }
      );
    }

    console.log("PAYMENT-HISTORY: Fetching for handle:", handle);

    // Normalize handle (remove @ if present)
    const normalizedHandle = handle.startsWith("@") ? handle.substring(1) : handle;

    // Get pending claim to see payment count
    const pendingClaim = await getPendingClaim(normalizedHandle);

    if (!pendingClaim || pendingClaim.paymentCount === BigInt(0)) {
      console.log("PAYMENT-HISTORY: No payments found");
      return NextResponse.json({
        handle: normalizedHandle,
        payments: [],
        total: 0,
      });
    }

    console.log(`PAYMENT-HISTORY: Found ${pendingClaim.paymentCount} payment(s)`);

    // For now, return a simplified payment history
    // In production, you'd query PaymentRecord events from the contract
    return NextResponse.json({
      handle: normalizedHandle,
      payments: [{
        amount: pendingClaim.amount.toString(),
        timestamp: Date.now(),
        sender: "Multiple senders", // We don't track individual senders in the current contract
      }],
      total: Number(pendingClaim.paymentCount),
    });
  } catch (error: any) {
    console.error("PAYMENT-HISTORY: Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}
