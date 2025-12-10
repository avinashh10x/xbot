import { NextRequest, NextResponse } from "next/server";
import {
  getPendingTweets,
  markTweetAsPosted,
  markTweetAsFailed,
  getPostingSettings,
  updateUserTwitterTokens,
} from "@/lib/db/queries";
import {
  postTweet,
  uploadMedia,
  refreshTwitterToken,
} from "@/lib/twitter/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.log("❌ Unauthorized cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔄 Starting scheduled post cron job...");
    console.log(`⏰ Current time: ${new Date().toISOString()}`);

    // Get all pending tweets whose scheduled time has passed
    const pendingTweets = await getPendingTweets();

    if (pendingTweets.length === 0) {
      console.log("✅ No pending tweets ready to post");
      return NextResponse.json({
        success: true,
        message: "No pending tweets",
        processed: 0,
      });
    }

    console.log(`📝 Found ${pendingTweets.length} tweets ready to post`);

    let posted = 0;
    let skipped = 0;
    let failed = 0;
    const results: Array<{
      id: string;
      status: string;
      content?: string;
      error?: string;
    }> = [];

    for (const tweet of pendingTweets) {
      try {
        // Check if auto-posting is enabled for this user
        const settings = await getPostingSettings(tweet.user_id);

        if (!settings?.auto_post_enabled) {
          console.log(`⏭️ Skipping tweet ${tweet.id} - auto-posting disabled`);
          skipped++;
          continue;
        }

        // Ensure user has valid tokens
        if (!tweet.user.twitter_access_token) {
          console.log(`⏭️ Skipping tweet ${tweet.id} - no access token`);
          skipped++;
          continue;
        }

        let accessToken = tweet.user.twitter_access_token;

        // Refresh token if expired
        if (tweet.user.token_expires_at) {
          const expiresAt = new Date(tweet.user.token_expires_at);
          const now = new Date();

          if (expiresAt <= now && tweet.user.twitter_refresh_token) {
            console.log(
              `🔄 Refreshing expired token for user ${tweet.user_id}`
            );
            try {
              const refreshed = await refreshTwitterToken(
                tweet.user.twitter_refresh_token
              );
              accessToken = refreshed.accessToken;

              await updateUserTwitterTokens(tweet.user_id, {
                access_token: refreshed.accessToken,
                refresh_token: refreshed.refreshToken,
                expires_at: refreshed.expiresAt,
              });
              console.log("✅ Token refreshed successfully");
            } catch (refreshError) {
              console.error("❌ Failed to refresh token:", refreshError);
              await markTweetAsFailed(
                tweet.id,
                "Token refresh failed",
                tweet.retry_count + 1
              );
              failed++;
              continue;
            }
          }
        }

        // Upload media if present
        let mediaId: string | undefined;
        if (tweet.media_url) {
          try {
            console.log(`📷 Uploading media for tweet ${tweet.id}...`);
            mediaId = await uploadMedia(accessToken, tweet.media_url);
          } catch (mediaError) {
            console.error(`⚠️ Media upload failed:`, mediaError);
            // Continue without media
          }
        }

        // Post the tweet
        console.log(
          `📤 Posting tweet ${tweet.id}: "${tweet.content.substring(0, 50)}..."`
        );
        await postTweet(accessToken, tweet.content, mediaId);

        // Mark as posted
        const postedAt = new Date().toISOString();
        await markTweetAsPosted(tweet.id, postedAt);

        posted++;
        results.push({
          id: tweet.id,
          status: "posted",
          content: tweet.content.substring(0, 50),
        });

        console.log(`✅ Successfully posted tweet ${tweet.id}`);
      } catch (error: any) {
        console.error(`❌ Failed to post tweet ${tweet.id}:`, error);

        const errorMessage = error?.message || "Unknown error";
        const newRetryCount = tweet.retry_count + 1;

        // Mark as failed after 3 retries or if rate limited
        if (newRetryCount >= 3 || errorMessage === "RATE_LIMIT") {
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

    console.log(`\n📊 Cron job summary:`);
    console.log(`   Posted: ${posted}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed: pendingTweets.length,
      posted,
      skipped,
      failed,
      results,
    });
  } catch (error: any) {
    console.error("❌ Cron job error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process tweets" },
      { status: 500 }
    );
  }
}
