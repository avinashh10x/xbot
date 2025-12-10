"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  getUserPrefs,
  createOrUpdateUserPrefs,
  getUserByTwitterId,
  getPostingSettings,
  createOrUpdatePostingSettings,
} from "@/lib/db/queries";

export async function getPreferences() {
  try {
    const cookieStore = await cookies();
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const user = await getUserByTwitterId(twitterUserId);
    if (!user) {
      return { error: "User not found" };
    }

    const prefs = await getUserPrefs(user.id);
    return { success: true, prefs };
  } catch (error: any) {
    console.error("Error fetching preferences:", error);
    return { error: error.message || "Failed to fetch preferences" };
  }
}

export async function updatePreferences(formData: FormData) {
  try {
    const cookieStore = await cookies();
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const user = await getUserByTwitterId(twitterUserId);
    if (!user) {
      return { error: "User not found" };
    }

    const dailyPostTime = formData.get("daily_post_time") as string;
    const timezone = formData.get("timezone") as string;

    const updates: Record<string, string> = {};
    if (dailyPostTime) updates.daily_post_time = dailyPostTime;
    if (timezone) updates.timezone = timezone;

    const result = await createOrUpdateUserPrefs(user.id, updates);

    if (!result) {
      return { error: "Failed to update preferences" };
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating preferences:", error);
    return { error: error.message || "Failed to update preferences" };
  }
}

/**
 * Fetch combined daily schedule settings (time + auto-post enabled)
 */
export async function fetchDailySchedule() {
  try {
    const cookieStore = await cookies();
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const user = await getUserByTwitterId(twitterUserId);
    if (!user) {
      return { error: "User not found" };
    }

    const prefs = await getUserPrefs(user.id);
    const postingSettings = await getPostingSettings(user.id);

    return {
      success: true,
      settings: {
        daily_post_time: prefs?.daily_post_time || "20:00",
        auto_post_enabled: postingSettings?.auto_post_enabled || false,
      },
    };
  } catch (error: any) {
    console.error("Error fetching daily schedule:", error);
    return { error: error.message || "Failed to fetch settings" };
  }
}

/**
 * Update daily schedule settings
 */
export async function updateDailySchedule(time: string, enabled: boolean) {
  try {
    const cookieStore = await cookies();
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const user = await getUserByTwitterId(twitterUserId);
    if (!user) {
      return { error: "User not found" };
    }

    // Update user preferences with daily post time
    await createOrUpdateUserPrefs(user.id, { daily_post_time: time });

    // Update posting settings with auto-post enabled
    await createOrUpdatePostingSettings(user.id, {
      auto_post_enabled: enabled,
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating daily schedule:", error);
    return { error: error.message || "Failed to update settings" };
  }
}
