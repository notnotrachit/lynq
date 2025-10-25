import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionJwt } from "@/lib/ethereum-auth";
import {
  buildLinkTwitterTransaction,
  buildLinkInstagramTransaction,
  buildLinkLinkedInTransaction,
} from "@/lib/ethereum-program";
import { ethers } from "ethers";

export const dynamic = "force-dynamic";

type LinkSocialRequest = {
  platform: "twitter" | "instagram" | "linkedin";
  handle: string;
  userWallet?: string; // Optional: if linking for another user (admin only)
};

/**
 * Link a social account to a wallet
 * POST /api/social/link
 * 
 * Body: { platform: "twitter" | "instagram" | "linkedin", handle: string, userWallet?: string }
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await verifySessionJwt(sessionToken);
    const userAddress = payload.sub;

    const body: LinkSocialRequest = await req.json();
    const { platform, handle, userWallet } = body;

    if (!platform || !handle) {
      return NextResponse.json(
        { error: "Missing required fields: platform, handle" },
        { status: 400 }
      );
    }

    if (!["twitter", "instagram", "linkedin"].includes(platform)) {
      return NextResponse.json(
        { error: "Invalid platform. Must be twitter, instagram, or linkedin" },
        { status: 400 }
      );
    }

    // Load admin wallet from environment variable
    const adminPrivateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
    if (!adminPrivateKey) {
      throw new Error("ADMIN_WALLET_PRIVATE_KEY not configured");
    }

    // Ensure private key has 0x prefix
    const formattedKey = adminPrivateKey.startsWith("0x") 
      ? adminPrivateKey 
      : `0x${adminPrivateKey}`;

    // Create admin signer
    const adminWallet = new ethers.Wallet(formattedKey);

    // Determine which wallet to link
    const targetWallet = userWallet || userAddress;

    // Validate Ethereum address
    if (!ethers.isAddress(targetWallet)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    // Normalize handle (remove @ if present)
    const normalizedHandle = handle.startsWith("@") ? handle.substring(1) : handle;
    console.log("LINK-SOCIAL: Linking", platform, "handle:", normalizedHandle, "to wallet:", targetWallet);

    // Call the appropriate linking function
    let txResponse: ethers.ContractTransactionResponse;
    switch (platform) {
      case "twitter":
        txResponse = await buildLinkTwitterTransaction(targetWallet, normalizedHandle, adminWallet);
        break;
      case "instagram":
        txResponse = await buildLinkInstagramTransaction(targetWallet, normalizedHandle, adminWallet);
        break;
      case "linkedin":
        txResponse = await buildLinkLinkedInTransaction(targetWallet, normalizedHandle, adminWallet);
        break;
      default:
        return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    // Wait for transaction confirmation
    const receipt = await txResponse.wait();
    const tx = receipt?.hash || txResponse.hash;

    console.log("LINK-SOCIAL: Transaction hash:", tx);
    console.log("LINK-SOCIAL: Transaction status:", receipt?.status);

    if (receipt?.status === 0) {
      throw new Error("Transaction reverted");
    }

    return NextResponse.json({
      success: true,
      transaction: tx,
      platform,
      handle: normalizedHandle,
      wallet: targetWallet,
      message: `${platform} account linked successfully`,
    });
  } catch (error: any) {
    console.error("Link social error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to link social account" },
      { status: 500 }
    );
  }
}
