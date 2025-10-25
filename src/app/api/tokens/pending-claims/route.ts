import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { getSocialLink, getPendingClaim } from "@/lib/ethereum-program";

export async function GET(request: NextRequest) {
  try {
    // Get wallet address from headers (set by middleware)
    const walletAddress = request.headers.get("x-wallet-address");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("PENDING-CLAIMS: Checking for wallet:", walletAddress);

    // Validate Ethereum address
    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    // Get user's social links
    const socialLink = await getSocialLink(walletAddress);

    if (!socialLink) {
      return NextResponse.json({
        claims: [],
        message: "No social accounts linked",
      });
    }

    const { twitter, instagram, linkedin } = socialLink;
    const handles = [twitter, instagram, linkedin].filter((h) => h && h.length > 0);

    console.log("PENDING-CLAIMS: Found handles:", handles);

    if (handles.length === 0) {
      return NextResponse.json({
        claims: [],
        message: "No social accounts linked",
      });
    }

    // Check for pending claims for each handle
    const claims = [];

    for (const handle of handles) {
      try {
        // Normalize handle (remove @ if present)
        const normalizedHandle = handle.startsWith("@") ? handle.substring(1) : handle;
        
        console.log("PENDING-CLAIMS: Checking claim for normalized handle:", normalizedHandle);
        
        const pendingClaim = await getPendingClaim(normalizedHandle);
        
        console.log("PENDING-CLAIMS: Pending claim result:", pendingClaim);
        
        if (pendingClaim && !pendingClaim.claimed && pendingClaim.amount > 0) {
          console.log("PENDING-CLAIMS: Found claim for", normalizedHandle, "Amount:", pendingClaim.amount);
          
          claims.push({
            handle: pendingClaim.socialHandle,
            amount: pendingClaim.amount.toString(), // Convert BigInt to string
            paymentCount: pendingClaim.paymentCount.toString(), // Convert BigInt to string
          });
        } else {
          console.log("PENDING-CLAIMS: No valid claim for", normalizedHandle, "- claimed:", pendingClaim?.claimed, "amount:", pendingClaim?.amount);
        }
      } catch (err: any) {
        console.error("PENDING-CLAIMS: Error checking claim for", handle, ":", err.message);
        // Continue checking other handles
      }
    }

    return NextResponse.json({
      claims,
      message: claims.length > 0 ? `Found ${claims.length} pending claim(s)` : "No pending claims",
    });
  } catch (error: any) {
    console.error("PENDING-CLAIMS: Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check pending claims" },
      { status: 500 }
    );
  }
}
