"use server";

import { cookies } from "next/headers";
import { getUserTweets } from "@/lib/twitter/client";

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
    return { error: error.message || "Failed to fetch tweets" };
  }
}
