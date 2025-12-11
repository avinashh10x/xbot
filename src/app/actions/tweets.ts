"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  createTweet as dbCreateTweet,
  updateTweet as dbUpdateTweet,
  deleteTweet as dbDeleteTweet,
  getNextScheduledTime,
  getUserPrefs,
  createPostedTweet,
  getUserByTwitterId,
} from "@/lib/db/queries";
import { postTweet } from "@/lib/twitter/client";

export async function createTweet(formData: FormData) {
  try {
    const cookieStore = await cookies();
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    console.log("[createTweet] incoming request");
    console.log("[createTweet] twitter_user_id present:", !!twitterUserId);

    if (!twitterUserId) {
      console.error("[createTweet] twitter_user_id not found in cookies");
      return { error: "Twitter not connected" };
    }

    // Find local user UUID by twitter user id (Twitter gives a numeric snowflake string)
    const localUser = await getUserByTwitterId(twitterUserId);
    if (!localUser) {
      console.error(
        "[createTweet] no local user found for twitter_user_id:",
        twitterUserId
      );
      return {
        error: "Local user account not found. Please connect your account.",
      };
    }

    const content = formData.get("content") as string;
    const scheduledAt = formData.get("scheduled_at") as string;
    const mediaUrl = formData.get("media_url") as string | undefined;

    console.log("[createTweet] content length:", content?.length);
    console.log("[createTweet] scheduledAt:", scheduledAt);
    console.log("[createTweet] mediaUrl present:", !!mediaUrl);

    if (!content || !scheduledAt) {
      console.error("[createTweet] missing required fields", {
        content,
        scheduledAt,
      });
      return { error: "Content and scheduled time are required" };
    }

    const tweet = await dbCreateTweet(
      localUser.id,
      content,
      scheduledAt,
      mediaUrl
    );

    revalidatePath("/dashboard");
    return { success: true, tweet };
  } catch (error: any) {
    // Log as much detail as possible for debugging
    try {
      console.error("[createTweet] Error creating tweet:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        errorObject: error,
      });
    } catch (logErr) {
      console.error("[createTweet] Error logging failed:", logErr);
    }

    return { error: error?.message || "Failed to create tweet" };
  }
}

export async function updateTweet(formData: FormData) {
  try {
    const cookieStore = await cookies();
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const id = formData.get("id") as string;
    const content = formData.get("content") as string;
    const scheduledAt = formData.get("scheduled_at") as string;
    const mediaUrl = formData.get("media_url") as string | undefined;

    if (!id) {
      return { error: "Tweet ID is required" };
    }

    const updates: Record<string, string> = {};
    if (content) updates.content = content;
    if (scheduledAt) updates.scheduled_at = scheduledAt;
    if (mediaUrl !== undefined) updates.media_url = mediaUrl;

    const success = await dbUpdateTweet(id, updates);

    if (!success) {
      return { error: "Failed to update tweet" };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating tweet:", error);
    return { error: (error as Error).message || "Failed to update tweet" };
  }
}

export async function deleteTweet(tweetId: string) {
  try {
    const cookieStore = await cookies();
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const success = await dbDeleteTweet(tweetId);

    if (!success) {
      return { error: "Failed to delete tweet" };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting tweet:", error);
    return { error: (error as Error).message || "Failed to delete tweet" };
  }
}

export async function postNow(formData: FormData) {
  try {
    const cookieStore = await cookies();
    const twitterAccessToken = cookieStore.get("twitter_access_token")?.value;
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterAccessToken || !twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const content = formData.get("content") as string;

    if (!content) {
      return { error: "Content is required" };
    }

    // Post directly to Twitter
    const result = await postTweet(twitterAccessToken, content);

    // Record in DB
    const localUser = await getUserByTwitterId(twitterUserId);
    if (localUser) {
      await createPostedTweet(
        localUser.id,
        content,
        undefined,
        new Date().toISOString()
      );
    }

    revalidatePath("/dashboard");
    return { success: true, tweetId: result.id };
  } catch (error: any) {
    console.error("Error posting now:", error);
    if (error?.message === "RATE_LIMIT" || error?.code === 429) {
      return { error: "Rate limited. Please wait before posting again." };
    }
    return { error: error.message || "Failed to post tweet" };
  }
}

/**
 * Add multiple tweets to the queue, each scheduled for consecutive days
 * at the user's preferred daily posting time
 */
export async function addBulkTweets(tweets: string[]) {
  try {
    const cookieStore = await cookies();
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const localUser = await getUserByTwitterId(twitterUserId);
    if (!localUser) {
      return {
        error: "User not found. Please reconnect your Twitter account.",
      };
    }

    // Get user preferences for daily post time
    const prefs = await getUserPrefs(localUser.id);
    const dailyPostTime = prefs?.daily_post_time || "20:00"; // Default 8 PM

    // Get the next available scheduled time (considering existing queue)
    let nextScheduleDate = await getNextScheduledTime(
      localUser.id,
      dailyPostTime
    );

    const createdTweets = [];

    for (const content of tweets) {
      if (!content.trim()) continue;

      const tweet = await dbCreateTweet(
        localUser.id,
        content.trim(),
        nextScheduleDate.toISOString()
      );

      createdTweets.push(tweet);

      // Move to next day for the next tweet
      nextScheduleDate = new Date(nextScheduleDate);
      nextScheduleDate.setDate(nextScheduleDate.getDate() + 1);
    }

    revalidatePath("/dashboard");
    return { success: true, count: createdTweets.length };
  } catch (error: any) {
    console.error("Error adding bulk tweets:", error);
    return { error: error.message || "Failed to add tweets to queue" };
  }
}
