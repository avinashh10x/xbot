import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTweetQueue } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const twitterAccessToken = cookieStore.get("twitter_access_token")?.value;

    if (!twitterAccessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // For now, we'll fetch tweets from the queue
    // In a real scenario, you'd have user auth working properly
    const tweets = await getTweetQueue("user-id-here"); // This needs proper user ID

    return NextResponse.json({
      success: true,
      count: tweets.length,
      tweets,
    });
  } catch (error: any) {
    console.error("Error fetching tweets:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tweets" },
      { status: 500 }
    );
  }
}
