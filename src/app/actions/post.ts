"use server";

import { cookies } from "next/headers";
import { TwitterApi } from "twitter-api-v2";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Types for Twitter data
export interface TwitterProfile {
  id: string;
  username: string;
  name: string;
  description?: string;
  profileImageUrl?: string;
  profileBannerUrl?: string;
  location?: string;
  url?: string;
  verified?: boolean;
  verifiedType?: string;
  createdAt?: string;
  // Public metrics
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  listedCount: number;
}

export interface TwitterTweet {
  id: string;
  text: string;
  createdAt: string;
  // Metrics
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  impressionCount: number;
  bookmarkCount: number;
  // Media
  attachments?: {
    mediaKeys?: string[];
    type?: string;
    url?: string;
    previewUrl?: string;
  }[];
  // Engagement
  isRetweet: boolean;
  isReply: boolean;
  conversationId?: string;
}

export interface TwitterDetails {
  profile: TwitterProfile;
  recentTweets: TwitterTweet[];
  pinnedTweet?: TwitterTweet;
}

/**
 * Get comprehensive Twitter details - profile, tweets, metrics, etc.
 */
export async function getTwitterDetails(): Promise<{
  data?: TwitterDetails;
  error?: string;
}> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("twitter_access_token")?.value;
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!accessToken || !twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const client = new TwitterApi(accessToken);

    // Fetch user profile with all available fields
    const { data: user } = await client.v2.me({
      "user.fields": [
        "id",
        "name",
        "username",
        "description",
        "profile_image_url",
        "profile_banner_url",
        "location",
        "url",
        "verified",
        "verified_type",
        "created_at",
        "public_metrics",
        "pinned_tweet_id",
      ],
    });

    // Build profile object
    const profile: TwitterProfile = {
      id: user.id,
      username: user.username,
      name: user.name,
      description: user.description,
      profileImageUrl: user.profile_image_url?.replace("_normal", "_400x400"), // Get higher res
      location: user.location,
      url: user.url,
      verified: user.verified,
      createdAt: user.created_at,
      followersCount: user.public_metrics?.followers_count || 0,
      followingCount: user.public_metrics?.following_count || 0,
      tweetCount: user.public_metrics?.tweet_count || 0,
      listedCount: user.public_metrics?.listed_count || 0,
    };

    // Fetch recent tweets with metrics
    const recentTweets: TwitterTweet[] = [];
    let pinnedTweet: TwitterTweet | undefined;

    try {
      const timeline = await client.v2.userTimeline(twitterUserId, {
        max_results: 20,
        "tweet.fields": [
          "id",
          "text",
          "created_at",
          "public_metrics",
          "attachments",
          "conversation_id",
          "referenced_tweets",
        ],
        "media.fields": ["type", "url", "preview_image_url"],
        expansions: ["attachments.media_keys"],
      });

      if (timeline.data?.data) {
        for (const tweet of timeline.data.data) {
          const tweetData: TwitterTweet = {
            id: tweet.id,
            text: tweet.text,
            createdAt: tweet.created_at || new Date().toISOString(),
            retweetCount: tweet.public_metrics?.retweet_count || 0,
            replyCount: tweet.public_metrics?.reply_count || 0,
            likeCount: tweet.public_metrics?.like_count || 0,
            quoteCount: tweet.public_metrics?.quote_count || 0,
            impressionCount: tweet.public_metrics?.impression_count || 0,
            bookmarkCount: tweet.public_metrics?.bookmark_count || 0,
            isRetweet:
              tweet.referenced_tweets?.some((r) => r.type === "retweeted") ||
              false,
            isReply:
              tweet.referenced_tweets?.some((r) => r.type === "replied_to") ||
              false,
            conversationId: tweet.conversation_id,
          };

          recentTweets.push(tweetData);

          // Check if this is the pinned tweet
          if (user.pinned_tweet_id && tweet.id === user.pinned_tweet_id) {
            pinnedTweet = tweetData;
          }
        }
      }
    } catch (timelineError: any) {
      console.error("Failed to fetch timeline:", timelineError?.message);
      // Continue without tweets - profile is still valid
    }

    return {
      data: {
        profile,
        recentTweets,
        pinnedTweet,
      },
    };
  } catch (error: any) {
    console.error("❌ Failed to fetch Twitter details:", error);

    if (error?.code === 429) {
      return { error: "Rate limited. Please try again later." };
    }

    if (error?.code === 401 || error?.code === 403) {
      return { error: "Twitter authentication expired. Please reconnect." };
    }

    return { error: error?.message || "Failed to fetch Twitter details" };
  }
}

/**
 * Get current Twitter user info from cookies
 */
export async function getTwitterUser() {
  const cookieStore = await cookies();
  const twitterUserId = cookieStore.get("twitter_user_id")?.value;
  const twitterUsername = cookieStore.get("twitter_username")?.value;
  const accessToken = cookieStore.get("twitter_access_token")?.value;

  if (!twitterUserId || !accessToken) {
    return { isConnected: false };
  }

  return {
    isConnected: true,
    twitterUserId,
    twitterUsername: twitterUsername || "Unknown",
  };
}

/**
 * Post a tweet immediately using the token from cookies
 */
export async function postNow(content: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("twitter_access_token")?.value;

    if (!accessToken) {
      return { error: "Twitter not connected. Please connect your account." };
    }

    if (!content || content.trim().length === 0) {
      return { error: "Tweet content is required" };
    }

    if (content.length > 280) {
      return { error: "Tweet exceeds 280 characters" };
    }

    // Post to Twitter
    const client = new TwitterApi(accessToken);
    const result = await client.v2.tweet({ text: content.trim() });

    console.log("✅ Tweet posted:", result.data.id);

    return {
      success: true,
      tweetId: result.data.id,
      text: result.data.text,
    };
  } catch (error: any) {
    console.error("❌ Failed to post tweet:", error);

    if (error?.code === 429) {
      return { error: "Rate limited. Please wait before posting again." };
    }

    if (error?.code === 401 || error?.code === 403) {
      return { error: "Twitter authentication expired. Please reconnect." };
    }

    return { error: error?.message || "Failed to post tweet" };
  }
}

/**
 * Schedule a tweet for later posting
 */
export async function schedulePost(content: string, scheduledAt: string) {
  try {
    const cookieStore = await cookies();
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterUserId) {
      return { error: "Twitter not connected. Please connect your account." };
    }

    if (!content || content.trim().length === 0) {
      return { error: "Tweet content is required" };
    }

    if (content.length > 280) {
      return { error: "Tweet exceeds 280 characters" };
    }

    // Get or create user in DB
    const supabase = await createAdminClient();

    let { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("twitter_user_id", twitterUserId)
      .single();

    if (!user) {
      // User should have been created on OAuth callback
      // But create if missing for robustness
      const accessToken = cookieStore.get("twitter_access_token")?.value;
      const refreshToken = cookieStore.get("twitter_refresh_token")?.value;

      // Create user with explicit UUID
      const newUserId = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          id: newUserId,
          twitter_user_id: twitterUserId,
          twitter_access_token: accessToken,
          twitter_refresh_token: refreshToken,
        })
        .select("id")
        .single();

      if (createError) {
        console.error("Failed to create user:", createError);
        return { error: "Failed to create user record" };
      }

      user = newUser;
    }

    // Add to tweet queue
    const { data: tweet, error: insertError } = await supabase
      .from("tweet_queue")
      .insert({
        user_id: user.id,
        content: content.trim(),
        scheduled_at: scheduledAt,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to schedule tweet:", insertError);
      return { error: "Failed to schedule tweet" };
    }

    console.log("✅ Tweet scheduled for:", scheduledAt);

    revalidatePath("/dashboard");

    return {
      success: true,
      tweet: {
        id: tweet.id,
        content: tweet.content,
        scheduled_at: tweet.scheduled_at,
        status: tweet.status,
        created_at: tweet.created_at,
      },
    };
  } catch (error: any) {
    console.error("❌ Failed to schedule tweet:", error);
    return { error: error?.message || "Failed to schedule tweet" };
  }
}

/**
 * Get all scheduled tweets for the current user
 */
export async function getScheduledTweets() {
  try {
    const cookieStore = await cookies();
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const supabase = await createAdminClient();

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("twitter_user_id", twitterUserId)
      .single();

    if (!user) {
      return { tweets: [] };
    }

    const { data: tweets, error } = await supabase
      .from("tweet_queue")
      .select("id, content, scheduled_at, status, posted_at, created_at")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch tweets:", error);
      return { error: "Failed to fetch tweets" };
    }

    return { tweets: tweets || [] };
  } catch (error: any) {
    console.error("❌ Failed to fetch tweets:", error);
    return { error: error?.message || "Failed to fetch tweets" };
  }
}

/**
 * Delete a scheduled tweet
 */
export async function deleteScheduledTweet(tweetId: string) {
  try {
    const cookieStore = await cookies();
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const supabase = await createAdminClient();

    const { error } = await supabase
      .from("tweet_queue")
      .delete()
      .eq("id", tweetId);

    if (error) {
      console.error("Failed to delete tweet:", error);
      return { error: "Failed to delete tweet" };
    }

    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: any) {
    console.error("❌ Failed to delete tweet:", error);
    return { error: error?.message || "Failed to delete tweet" };
  }
}

/**
 * Get recently posted tweets from DB
 */
export async function getPostedTweets() {
  try {
    const cookieStore = await cookies();
    const twitterUserId = cookieStore.get("twitter_user_id")?.value;

    if (!twitterUserId) {
      return { error: "Twitter not connected" };
    }

    const supabase = await createAdminClient();

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("twitter_user_id", twitterUserId)
      .single();

    if (!user) {
      return { tweets: [] };
    }

    const { data: tweets, error } = await supabase
      .from("tweet_queue")
      .select(
        "id, content, scheduled_at, status, posted_at, twitter_tweet_id, created_at"
      )
      .eq("user_id", user.id)
      .eq("status", "posted")
      .order("posted_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Failed to fetch posted tweets:", error);
      return { error: "Failed to fetch posted tweets" };
    }

    return { tweets: tweets || [] };
  } catch (error: any) {
    console.error("❌ Failed to fetch posted tweets:", error);
    return { error: error?.message || "Failed to fetch posted tweets" };
  }
}
