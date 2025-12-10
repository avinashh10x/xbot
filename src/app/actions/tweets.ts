"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  createTweet as dbCreateTweet,
  updateTweet as dbUpdateTweet,
  deleteTweet as dbDeleteTweet,
  getNextScheduledTime,
  getUserPrefs,
} from "@/lib/db/queries";
import {
  createPostedTweet,
  updateUserTwitterTokens,
  getUserByTwitterId,
} from "@/lib/db/queries";
import {
  postTweet,
  uploadMedia,
  refreshTwitterToken,
} from "@/lib/twitter/client";

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
    const twitterRefreshToken = cookieStore.get("twitter_refresh_token")?.value;
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterAccessToken || !twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const content = formData.get("content") as string;
    const mediaUrl = formData.get("media_url") as string | undefined;

    if (!content) {
      return { error: "Content is required" };
    }

    let accessToken = twitterAccessToken;

    const tryPost = async (token: string | undefined) => {
      let mediaId: string | undefined;
      if (mediaUrl) {
        try {
          mediaId = await uploadMedia(token!, mediaUrl);
        } catch (mediaErr) {
          console.error("Media upload failed for immediate post:", mediaErr);
        }
      }

      // Post to Twitter
      return await postTweet(token!, content, mediaId);
    };

    try {
      await tryPost(accessToken);
    } catch (err: any) {
      // If token expired/invalid, try refresh once
      console.error("Initial post attempt failed:", err);
      if (twitterRefreshToken) {
        try {
          const refreshed = await refreshTwitterToken(twitterRefreshToken);
          accessToken = refreshed.accessToken;
          await updateUserTwitterTokens(twitterUserId, {
            access_token: refreshed.accessToken,
            refresh_token: refreshed.refreshToken,
            expires_at: refreshed.expiresAt,
            twitter_user_id: twitterUserId,
          });

          // retry
          await tryPost(accessToken);
        } catch (refreshErr: any) {
          console.error("Refresh + retry failed:", refreshErr);
          if (
            refreshErr?.message === "RATE_LIMIT" ||
            refreshErr?.code === 429
          ) {
            return { error: "RATE_LIMIT" };
          }
          return { error: refreshErr?.message || "Failed to post tweet" };
        }
      } else {
        if (err?.message === "RATE_LIMIT" || err?.code === 429) {
          return { error: "RATE_LIMIT" };
        }
        return { error: err?.message || "Failed to post tweet" };
      }
    }

    // Record posted tweet in DB so it appears in UI
    const localUser = await getUserByTwitterId(twitterUserId);
    if (!localUser) {
      console.error(
        "[postNow] no local user found for twitter_user_id:",
        twitterUserId
      );
      // still return success for the Twitter post but warn client
      return {
        success: true,
        warning: "Posted to Twitter but local user not found",
      };
    }

    const postedAt = new Date().toISOString();
    const record = await createPostedTweet(
      localUser.id,
      content,
      mediaUrl,
      postedAt
    );

    revalidatePath("/dashboard");
    return { success: true, tweet: record };
  } catch (error: any) {
    console.error("Error posting now:", error);
    return { error: error.message || "Failed to post tweet now" };
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
