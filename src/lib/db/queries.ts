import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  User,
  TweetQueue,
  UserPrefs,
  TwitterTokens,
  PostingSettings,
} from "@/types";

export async function getUserProfile(userId: string): Promise<User | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return data;
}

export async function getUserByTwitterId(
  twitterUserId: string
): Promise<User | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("twitter_user_id", twitterUserId)
    .single();

  if (error) {
    console.error("Error fetching user by twitter id:", error);
    return null;
  }

  return data;
}

export async function updateUserTwitterTokens(
  userId: string,
  tokens: TwitterTokens & { twitter_user_id?: string }
): Promise<boolean> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({
      twitter_access_token: tokens.access_token,
      twitter_refresh_token: tokens.refresh_token,
      token_expires_at: tokens.expires_at,
      twitter_user_id: tokens.twitter_user_id,
    })
    .eq("id", userId);

  if (error) {
    console.error("Error updating Twitter tokens:", error);
    return false;
  }

  return true;
}

export async function getUserPrefs(userId: string): Promise<UserPrefs | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("user_prefs")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    // Not found is OK - user might not have prefs yet
    if (error.code !== "PGRST116") {
      console.error("Error fetching user prefs:", error);
    }
    return null;
  }

  return data;
}

export async function createOrUpdateUserPrefs(
  userId: string,
  prefs: Partial<
    Omit<UserPrefs, "id" | "user_id" | "created_at" | "updated_at">
  >
): Promise<UserPrefs | null> {
  const supabase = await createAdminClient();

  // Try to update first
  const { data: existing } = await supabase
    .from("user_prefs")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from("user_prefs")
      .update(prefs)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating user prefs:", error);
      return null;
    }
    return data;
  } else {
    const { data, error } = await supabase
      .from("user_prefs")
      .insert({ user_id: userId, ...prefs })
      .select()
      .single();

    if (error) {
      console.error("Error creating user prefs:", error);
      return null;
    }
    return data;
  }
}

export async function updateUserPrefs(
  userId: string,
  prefs: Partial<
    Omit<UserPrefs, "id" | "user_id" | "created_at" | "updated_at">
  >
): Promise<boolean> {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("user_prefs")
    .update(prefs)
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating user prefs:", error);
    return false;
  }

  return true;
}

export async function getTweetQueue(userId: string): Promise<TweetQueue[]> {
  // Use admin client for server-side lookups to avoid Row Level Security when
  // the request is not authenticated via Supabase auth cookie.
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("tweet_queue")
    .select("*")
    .eq("user_id", userId)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("Error fetching tweet queue:", error);
    return [];
  }

  return data || [];
}

export async function createTweet(
  userId: string,
  content: string,
  scheduledAt: string,
  mediaUrl?: string
): Promise<TweetQueue | null> {
  // Use admin client for server-side inserts (cron/actions) to bypass RLS
  // when requests are not authenticated with Supabase auth.
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("tweet_queue")
    .insert({
      user_id: userId,
      content,
      scheduled_at: scheduledAt,
      media_url: mediaUrl,
      status: "pending",
      retry_count: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating tweet:", error);
    throw new Error(error.message || "Failed to insert tweet into DB");
  }

  return data;
}

export async function createPostedTweet(
  userId: string,
  content: string,
  mediaUrl?: string,
  postedAt?: string
): Promise<TweetQueue | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("tweet_queue")
    .insert({
      user_id: userId,
      content,
      scheduled_at: postedAt || new Date().toISOString(),
      media_url: mediaUrl,
      status: "posted",
      posted_at: postedAt || new Date().toISOString(),
      retry_count: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating posted tweet:", error);
    throw new Error(error.message || "Failed to insert posted tweet into DB");
  }

  return data;
}

export async function updateTweet(
  tweetId: string,
  updates: Partial<
    Omit<TweetQueue, "id" | "user_id" | "created_at" | "updated_at">
  >
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tweet_queue")
    .update(updates)
    .eq("id", tweetId);

  if (error) {
    console.error("Error updating tweet:", error);
    return false;
  }

  return true;
}

export async function deleteTweet(tweetId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tweet_queue")
    .delete()
    .eq("id", tweetId);

  if (error) {
    console.error("Error deleting tweet:", error);
    return false;
  }

  return true;
}

export async function getPendingTweets(): Promise<
  Array<TweetQueue & { user: User }>
> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("tweet_queue")
    .select(
      `
      *,
      user:users!inner(*)
    `
    )
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("Error fetching pending tweets:", error);
    return [];
  }

  return data || [];
}

export async function markTweetAsPosted(
  tweetId: string,
  postedAt: string
): Promise<boolean> {
  return updateTweet(tweetId, {
    status: "posted",
    posted_at: postedAt,
  });
}

export async function markTweetAsFailed(
  tweetId: string,
  errorMessage: string,
  retryCount: number
): Promise<boolean> {
  return updateTweet(tweetId, {
    status: "failed",
    error_message: errorMessage,
    retry_count: retryCount,
  });
}

// Posting Settings Functions
export async function getPostingSettings(
  userId: string
): Promise<PostingSettings | null> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("posting_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching posting settings:", error);
    return null;
  }

  return data;
}

export async function createOrUpdatePostingSettings(
  userId: string,
  settings: Partial<
    Omit<PostingSettings, "id" | "user_id" | "created_at" | "updated_at">
  >
): Promise<PostingSettings | null> {
  const supabase = await createAdminClient();

  // Try to update first
  const { data: existingData } = await supabase
    .from("posting_settings")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existingData) {
    // Update existing
    const { data, error } = await supabase
      .from("posting_settings")
      .update(settings)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating posting settings:", error);
      return null;
    }
    return data;
  } else {
    // Create new
    const { data, error } = await supabase
      .from("posting_settings")
      .insert({ user_id: userId, ...settings })
      .select()
      .single();

    if (error) {
      console.error("Error creating posting settings:", error);
      return null;
    }
    return data;
  }
}

export async function incrementPostsToday(userId: string): Promise<boolean> {
  const supabase = await createAdminClient();
  const { error } = await supabase.rpc("increment_posts_today", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Error incrementing posts today:", error);
    return false;
  }

  return true;
}

/**
 * Get the next available scheduled time for a user
 * Takes into account existing pending tweets to avoid double-booking
 */
export async function getNextScheduledTime(
  userId: string,
  dailyPostTime: string = "20:00"
): Promise<Date> {
  const supabase = await createAdminClient();

  // Get the latest scheduled pending tweet for this user
  const { data: lastTweet } = await supabase
    .from("tweet_queue")
    .select("scheduled_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("scheduled_at", { ascending: false })
    .limit(1)
    .single();

  const [hours, minutes] = dailyPostTime.split(":").map(Number);
  const now = new Date();

  // Start with today at the preferred time
  let nextDate = new Date();
  nextDate.setHours(hours, minutes, 0, 0);

  // If today's time has passed, start from tomorrow
  if (nextDate <= now) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  // If there's a last scheduled tweet, schedule after that
  if (lastTweet) {
    const lastScheduled = new Date(lastTweet.scheduled_at);
    // Set to the day after the last scheduled tweet
    const dayAfterLast = new Date(lastScheduled);
    dayAfterLast.setDate(dayAfterLast.getDate() + 1);
    dayAfterLast.setHours(hours, minutes, 0, 0);

    // Use whichever is later
    if (dayAfterLast > nextDate) {
      nextDate = dayAfterLast;
    }
  }

  return nextDate;
}
