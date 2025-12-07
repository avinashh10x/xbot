"use server";

import { cookies } from "next/headers";
import { getUserTweets } from "@/lib/twitter/client";
import { getTweetQueue } from "@/lib/db/queries";

export async function fetchUserTweets() {
  try {
    const cookieStore = await cookies();
    const twitterAccessToken = cookieStore.get("twitter_access_token")?.value;
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterAccessToken || !twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const tweets = await getUserTweets(twitterAccessToken, twitterUserId, 20);

    return { success: true, tweets };
  } catch (error: any) {
    console.error("Error fetching user tweets:", error);

    // If rate-limited, fall back to recently posted tweets from the DB
    if (error?.message === "RATE_LIMIT" || error?.code === 429) {
      console.log(
        "Rate limited fetching user tweets — falling back to DB records"
      );
      try {
        const queue = await getTweetQueue(twitterUserId);
        const posted = (queue || []).filter((t) => t.status === "posted");

        const mapped = posted.map((t) => ({
          id: t.id,
          text: t.content,
          created_at: t.posted_at || t.created_at,
          public_metrics: undefined,
        }));

        return { success: true, tweets: mapped };
      } catch (dbErr: any) {
        console.error("Failed to load fallback tweets from DB:", dbErr);
      }
    }

    return { error: error.message || "Failed to fetch tweets" };
  }
}
