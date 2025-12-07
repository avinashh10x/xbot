"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  createTweet as dbCreateTweet,
  updateTweet as dbUpdateTweet,
  deleteTweet as dbDeleteTweet,
} from "@/lib/db/queries";
import { createPostedTweet, updateUserTwitterTokens } from "@/lib/db/queries";
import {
  postTweet,
  uploadMedia,
  refreshTwitterToken,
} from "@/lib/twitter/client";

export async function createTweet(formData: FormData) {
  try {
    const cookieStore = await cookies();
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const content = formData.get("content") as string;
    const scheduledAt = formData.get("scheduled_at") as string;
    const mediaUrl = formData.get("media_url") as string | undefined;

    if (!content || !scheduledAt) {
      return { error: "Content and scheduled time are required" };
    }

    const tweet = await dbCreateTweet(
      twitterUserId,
      content,
      scheduledAt,
      mediaUrl
    );

    if (!tweet) {
      return { error: "Failed to create tweet" };
    }

    revalidatePath("/dashboard");
    return { success: true, tweet };
  } catch (error) {
    console.error("Error creating tweet:", error);
    return { error: (error as Error).message || "Failed to create tweet" };
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
    const postedAt = new Date().toISOString();
    const record = await createPostedTweet(
      twitterUserId,
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
