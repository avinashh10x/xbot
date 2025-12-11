import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { TwitterApi } from "twitter-api-v2";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Allow without auth in dev mode for testing
    if (process.env.NODE_ENV === "production") {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        console.log("❌ Unauthorized cron request");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("🔄 Starting scheduled post cron job...");
    console.log(`⏰ Current time: ${new Date().toISOString()}`);

    const supabase = await createAdminClient();

    // Get all pending tweets whose scheduled time has passed
    const { data: pendingTweets, error: fetchError } = await supabase
      .from("tweet_queue")
      .select(
        `
        id,
        content,
        scheduled_at,
        retry_count,
        user_id,
        users!inner (
          id,
          twitter_access_token,
          twitter_refresh_token,
          token_expires_at
        )
      `
      )
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("❌ Failed to fetch pending tweets:", fetchError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!pendingTweets || pendingTweets.length === 0) {
      console.log("✅ No pending tweets ready to post");
      return NextResponse.json({
        success: true,
        message: "No pending tweets",
        processed: 0,
      });
    }

    console.log(`📝 Found ${pendingTweets.length} tweets ready to post`);

    let posted = 0;
    let failed = 0;

    for (const tweet of pendingTweets) {
      const user = tweet.users as any;

      if (!user?.twitter_access_token) {
        console.log(`⏭️ Skipping tweet ${tweet.id} - no access token`);
        continue;
      }

      try {
        // Post to Twitter
        const client = new TwitterApi(user.twitter_access_token);
        const result = await client.v2.tweet({ text: tweet.content });

        // Mark as posted
        await supabase
          .from("tweet_queue")
          .update({
            status: "posted",
            posted_at: new Date().toISOString(),
            twitter_tweet_id: result.data.id,
          })
          .eq("id", tweet.id);

        posted++;
        console.log(`✅ Posted tweet ${tweet.id}: ${result.data.id}`);
      } catch (error: any) {
        console.error(`❌ Failed to post tweet ${tweet.id}:`, error?.message);

        const newRetryCount = (tweet.retry_count || 0) + 1;

        // Mark as failed after 3 retries
        await supabase
          .from("tweet_queue")
          .update({
            status: newRetryCount >= 3 ? "failed" : "pending",
            retry_count: newRetryCount,
            error_message: error?.message || "Unknown error",
          })
          .eq("id", tweet.id);

        if (newRetryCount >= 3) {
          failed++;
        }
      }
    }

    console.log(`📊 Results: ${posted} posted, ${failed} failed`);

    return NextResponse.json({
      success: true,
      posted,
      failed,
      total: pendingTweets.length,
    });
  } catch (error: any) {
    console.error("❌ Cron job error:", error);
    return NextResponse.json(
      { error: error?.message || "Cron job failed" },
      { status: 500 }
    );
  }
}
