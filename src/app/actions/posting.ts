"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import {
  getPostingSettings,
  createOrUpdatePostingSettings,
} from "@/lib/db/queries";

export async function fetchPostingSettings() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const settings = await getPostingSettings(user.id);

    // Return default settings if none exist
    if (!settings) {
      return {
        success: true,
        settings: {
          auto_post_enabled: false,
          post_interval_minutes: 60,
          max_posts_per_day: 10,
          posts_today: 0,
        },
      };
    }

    return { success: true, settings };
  } catch (error) {
    console.error("Error fetching posting settings:", error);
    return {
      error: (error as Error).message || "Failed to fetch posting settings",
    };
  }
}

export async function updatePostingSettings(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    const autoPostEnabled = formData.get("auto_post_enabled") === "true";
    const postIntervalMinutes = parseInt(
      formData.get("post_interval_minutes") as string
    );
    const maxPostsPerDay = parseInt(
      formData.get("max_posts_per_day") as string
    );

    if (isNaN(postIntervalMinutes) || isNaN(maxPostsPerDay)) {
      return { error: "Invalid settings values" };
    }

    if (postIntervalMinutes < 15) {
      return { error: "Post interval must be at least 15 minutes" };
    }

    if (maxPostsPerDay < 1 || maxPostsPerDay > 50) {
      return { error: "Max posts per day must be between 1 and 50" };
    }

    const settings = await createOrUpdatePostingSettings(user.id, {
      auto_post_enabled: autoPostEnabled,
      post_interval_minutes: postIntervalMinutes,
      max_posts_per_day: maxPostsPerDay,
    });

    if (!settings) {
      return { error: "Failed to update posting settings" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/settings");
    return { success: true, settings };
  } catch (error) {
    console.error("Error updating posting settings:", error);
    return {
      error: (error as Error).message || "Failed to update posting settings",
    };
  }
}
