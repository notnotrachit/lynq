import { NextResponse } from "next/server";
import { findWalletBySocialHandle } from "@/lib/ethereum-program";

export const dynamic = "force-dynamic";

/**
 * Find wallet address by social handle (Ethereum)
 * GET /api/social/find-wallet?handle=@username&platform=twitter
 * 
 * Searches through contract events to find wallet linked to a social handle.
 * Note: This queries the last 10000 blocks. For production, consider:
 * - Indexing events in a database
 * - Using The Graph protocol
 * - Caching results
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let handle = searchParams.get("handle");
    const platform = searchParams.get("platform");

    if (!handle || !platform) {
      return NextResponse.json(
        { error: "Missing required parameters: handle, platform" },
        { status: 400 }
      );
    }

    if (!["twitter", "instagram", "linkedin"].includes(platform)) {
      return NextResponse.json(
        { error: "Invalid platform. Must be twitter, instagram, or linkedin" },
        { status: 400 }
      );
    }

    // Find wallet by querying contract events
    const wallet = await findWalletBySocialHandle(
      handle,
      platform as "twitter" | "instagram" | "linkedin"
    );

    if (!wallet) {
      return NextResponse.json({
        found: false,
        handle,
        platform,
        wallet: null,
      });
    }

    return NextResponse.json({
      found: true,
      handle,
      platform,
      wallet,
    });
  } catch (error: any) {
    console.error("Find wallet error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to find wallet" },
      { status: 500 }
    );
  }
}
