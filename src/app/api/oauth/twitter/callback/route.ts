import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getTwitterOAuthConfig,
  exchangeCodeForToken,
  getTwitterUserInfo,
  decodeState,
} from "@/lib/oauth-twitter";
import {
  buildLinkTwitterTransaction,
} from "@/lib/ethereum-program";
import { ethers } from "ethers";

export const dynamic = "force-dynamic";

/**
 * Twitter OAuth callback handler
 * GET /api/oauth/twitter/callback?code=...&state=...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    
    // Handle OAuth errors
    if (error) {
      const errorDescription = searchParams.get("error_description") || error;
      console.error("Twitter OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/dashboard?error=${encodeURIComponent(`Twitter authorization failed: ${errorDescription}`)}`,
          request.url
        )
      );
    }
    
    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          "/dashboard?error=Missing authorization code or state",
          request.url
        )
      );
    }
    
    // Decode and validate state
    const stateData = decodeState(state);
    if (!stateData) {
      return NextResponse.redirect(
        new URL(
          "/dashboard?error=Invalid or expired OAuth state",
          request.url
        )
      );
    }
    
    const { walletAddress, codeVerifier } = stateData;
    
    // Get OAuth config
    const config = getTwitterOAuthConfig();
    
    // Exchange code for access token
    const { accessToken } = await exchangeCodeForToken(
      config,
      code,
      codeVerifier
    );
    
    // Get Twitter user information
    const userInfo = await getTwitterUserInfo(accessToken);
    
    console.log("Twitter OAuth successful:", {
      wallet: walletAddress,
      twitter: userInfo.username,
    });
    
    // Link Twitter account to wallet on blockchain
    const adminPrivateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
    if (!adminPrivateKey) {
      throw new Error("ADMIN_WALLET_PRIVATE_KEY not configured");
    }
    
    const formattedKey = adminPrivateKey.startsWith("0x")
      ? adminPrivateKey
      : `0x${adminPrivateKey}`;
    
    const adminWallet = new ethers.Wallet(formattedKey);
    
    // Execute blockchain transaction to link account
    const txResponse = await buildLinkTwitterTransaction(
      walletAddress,
      userInfo.username,
      adminWallet
    );
    
    // Wait for transaction confirmation
    const receipt = await txResponse.wait();
    
    if (receipt?.status === 0) {
      throw new Error("Transaction reverted");
    }
    
    console.log("Twitter account linked on-chain:", receipt?.hash);
    
    // Redirect back to dashboard with success message
    const successResponse = NextResponse.redirect(
      new URL(
        `/dashboard?success=${encodeURIComponent(`Twitter account @${userInfo.username} linked successfully!`)}`,
        request.url
      )
    );
    
    // Clear the OAuth verifier cookie
    successResponse.cookies.delete("twitter_oauth_verifier");
    
    return successResponse;
  } catch (error: any) {
    console.error("Twitter OAuth callback error:", error);
    
    // Redirect to dashboard with error
    return NextResponse.redirect(
      new URL(
        `/dashboard?error=${encodeURIComponent(error.message || "Failed to link Twitter account")}`,
        request.url
      )
    );
  }
}
