import { createClient } from "@/lib/supabase/server";
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

export async function updateUserTwitterTokens(
  userId: string,
  tokens: TwitterTokens & { twitter_user_id?: string }
): Promise<boolean> {
  const supabase = await createClient();
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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_prefs")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching user prefs:", error);
    return null;
  }

  return data;
}

export async function updateUserPrefs(
  userId: string,
  prefs: Partial<
    Omit<UserPrefs, "id" | "user_id" | "created_at" | "updated_at">
  >
): Promise<boolean> {
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  const supabase = await createClient();
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
    return null;
  }

  return data;
}

export async function createPostedTweet(
  userId: string,
  content: string,
  mediaUrl?: string,
  postedAt?: string
): Promise<TweetQueue | null> {
  const supabase = await createClient();
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
    return null;
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
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  const supabase = await createClient();

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
  const supabase = await createClient();
  const { error } = await supabase.rpc("increment_posts_today", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Error incrementing posts today:", error);
    return false;
  }

  return true;
}
