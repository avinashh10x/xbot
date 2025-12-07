import { NextRequest, NextResponse } from "next/server";
import {
  getPendingTweets,
  markTweetAsPosted,
  markTweetAsFailed,
  getPostingSettings,
  createOrUpdatePostingSettings,
} from "@/lib/db/queries";
import {
  postTweet,
  uploadMedia,
  refreshTwitterToken,
} from "@/lib/twitter/client";
import { updateUserTwitterTokens } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "your-secret-key";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔄 Starting auto-post cron job...");

    // Get all pending tweets that are ready to be posted
    const pendingTweets = await getPendingTweets();

    if (pendingTweets.length === 0) {
      console.log("✅ No pending tweets to post");
      return NextResponse.json({
        success: true,
        message: "No pending tweets",
        processed: 0,
      });
    }

    console.log(`📝 Found ${pendingTweets.length} pending tweets`);

    let posted = 0;
    let failed = 0;
    const results = [];

    for (const tweet of pendingTweets) {
      try {
        // Check posting settings for this user
        const settings = await getPostingSettings(tweet.user_id);

        // Check if auto-posting is enabled
        if (!settings || !settings.auto_post_enabled) {
          console.log(
            `⏭️  Skipping tweet ${tweet.id} - auto-posting disabled for user`
          );
          continue;
        }

        // Check daily post limit
        if (settings.posts_today >= settings.max_posts_per_day) {
          console.log(
            `⏭️  Skipping tweet ${tweet.id} - daily limit reached (${settings.posts_today}/${settings.max_posts_per_day})`
          );
          continue;
        }

        // Check post interval
        if (settings.last_post_at) {
          const lastPostTime = new Date(settings.last_post_at).getTime();
          const now = Date.now();
          const minutesSinceLastPost = (now - lastPostTime) / (1000 * 60);

          if (minutesSinceLastPost < settings.post_interval_minutes) {
            console.log(
              `⏭️  Skipping tweet ${tweet.id} - interval not met (${Math.floor(
                minutesSinceLastPost
              )}/${settings.post_interval_minutes} minutes)`
            );
            continue;
          }
        }

        // Check if token needs refresh
        let accessToken = tweet.user.twitter_access_token;

        if (tweet.user.token_expires_at) {
          const expiresAt = new Date(tweet.user.token_expires_at);
          const now = new Date();

          if (expiresAt <= now) {
            console.log(`🔄 Refreshing token for user ${tweet.user_id}`);
            const refreshed = await refreshTwitterToken(
              tweet.user.twitter_refresh_token!
            );
            accessToken = refreshed.accessToken;

            await updateUserTwitterTokens(tweet.user_id, {
              access_token: refreshed.accessToken,
              refresh_token: refreshed.refreshToken,
              expires_at: refreshed.expiresAt,
            });
          }
        }

        // Upload media if exists
        let mediaId: string | undefined;
        if (tweet.media_url) {
          try {
            mediaId = await uploadMedia(accessToken!, tweet.media_url);
          } catch (mediaError) {
            console.error(
              `⚠️  Failed to upload media for tweet ${tweet.id}:`,
              mediaError
            );
            // Continue without media rather than failing the whole tweet
          }
        }

        // Post the tweet
        console.log(`📤 Posting tweet ${tweet.id}...`);
        await postTweet(accessToken!, tweet.content, mediaId);

        // Mark as posted
        const postedAt = new Date().toISOString();
        await markTweetAsPosted(tweet.id, postedAt);

        // Update posting settings
        await createOrUpdatePostingSettings(tweet.user_id, {
          posts_today: settings.posts_today + 1,
          last_post_at: postedAt,
        });

        posted++;
        results.push({
          id: tweet.id,
          status: "posted",
          content: tweet.content.substring(0, 50) + "...",
        });

        console.log(`✅ Successfully posted tweet ${tweet.id}`);
      } catch (error) {
        console.error(`❌ Failed to post tweet ${tweet.id}:`, error);

        const errorMessage = (error as Error).message || "Unknown error";
        const newRetryCount = tweet.retry_count + 1;

        // Mark as failed after 3 retries
        if (newRetryCount >= 3) {
          await markTweetAsFailed(tweet.id, errorMessage, newRetryCount);
        }

        failed++;
        results.push({
          id: tweet.id,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    console.log(`✅ Cron job completed: ${posted} posted, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed: pendingTweets.length,
      posted,
      failed,
      results,
    });
  } catch (error) {
    console.error("❌ Cron job error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to process tweets" },
      { status: 500 }
    );
  }
}
