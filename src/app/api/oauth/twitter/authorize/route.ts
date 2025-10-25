import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionJwt } from "@/lib/ethereum-auth";
import { getTwitterAuthUrl, getTwitterOAuthConfig } from "@/lib/oauth-twitter";

export const dynamic = "force-dynamic";

/**
 * Initiate Twitter OAuth flow
 * GET /api/oauth/twitter/authorize
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: "Unauthorized - please sign in first" },
        { status: 401 }
      );
    }
    
    const { payload } = await verifySessionJwt(sessionToken);
    const walletAddress = payload.sub;
    
    // Get Twitter OAuth config
    const config = getTwitterOAuthConfig();
    
    // Generate authorization URL
    const { url, codeVerifier } = getTwitterAuthUrl(config, walletAddress);
    
    // Store code verifier in a secure cookie (needed for callback)
    // Note: In production, consider using Redis or database for state management
    const response = NextResponse.redirect(url);
    response.cookies.set("twitter_oauth_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });
    
    // Redirect to Twitter authorization page
    return response;
  } catch (error: any) {
    console.error("Twitter OAuth authorize error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate Twitter OAuth" },
      { status: 500 }
    );
  }
}
