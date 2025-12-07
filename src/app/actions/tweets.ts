"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  createTweet as dbCreateTweet,
  updateTweet as dbUpdateTweet,
  deleteTweet as dbDeleteTweet,
} from "@/lib/db/queries";

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
