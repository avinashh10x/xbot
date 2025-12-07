import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { refreshTwitterToken, uploadMedia, postTweet } from '@/lib/twitter/client';
import { TweetQueue, User } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface TweetWithUser extends TweetQueue {
  user: User;
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createAdminClient();

    // Fetch pending tweets
    const { data: tweets, error } = await supabase
      .from('tweet_queue')
      .select(
        `
        *,
        user:users!inner(*)
      `
      )
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching pending tweets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tweets' },
        { status: 500 }
      );
    }

    if (!tweets || tweets.length === 0) {
      return NextResponse.json({ message: 'No pending tweets', processed: 0 });
    }

    const results = {
      processed: 0,
      failed: 0,
      retried: 0,
    };

    // Process each tweet
    for (const tweet of tweets as TweetWithUser[]) {
      try {
        const user = Array.isArray(tweet.user) ? tweet.user[0] : tweet.user;

        if (!user.twitter_access_token || !user.twitter_refresh_token) {
          await supabase
            .from('tweet_queue')
            .update({
              status: 'failed',
              error_message: 'Twitter not connected',
            })
            .eq('id', tweet.id);
          results.failed++;
          continue;
        }

        // Check if token needs refresh
        let accessToken = user.twitter_access_token;
        const tokenExpiresAt = user.token_expires_at
          ? new Date(user.token_expires_at)
          : null;

        if (tokenExpiresAt && tokenExpiresAt <= new Date()) {
          try {
            const refreshed = await refreshTwitterToken(user.twitter_refresh_token);
            accessToken = refreshed.accessToken;

            // Update tokens in database
            await supabase
              .from('users')
              .update({
                twitter_access_token: refreshed.accessToken,
                twitter_refresh_token: refreshed.refreshToken,
                token_expires_at: refreshed.expiresAt,
              })
              .eq('id', user.id);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            await supabase
              .from('tweet_queue')
              .update({
                status: 'failed',
                error_message: 'Token refresh failed',
              })
              .eq('id', tweet.id);
            results.failed++;
            continue;
          }
        }

        // Upload media if present
        let mediaId: string | undefined;
        if (tweet.media_url) {
          try {
            mediaId = await uploadMedia(accessToken, tweet.media_url);
          } catch (mediaError) {
            console.error('Media upload failed:', mediaError);
            // Continue without media
          }
        }

        // Post tweet
        try {
          await postTweet(accessToken, tweet.content, mediaId);

          // Mark as posted
          await supabase
            .from('tweet_queue')
            .update({
              status: 'posted',
              posted_at: new Date().toISOString(),
            })
            .eq('id', tweet.id);

          results.processed++;
        } catch (postError: any) {
          const errorMessage = postError.message || 'Unknown error';

          // Handle rate limit
          if (errorMessage === 'RATE_LIMIT') {
            const retryCount = tweet.retry_count + 1;

            if (retryCount < 3) {
              // Retry in 15 minutes
              const newScheduledAt = new Date(
                Date.now() + 15 * 60 * 1000
              ).toISOString();

              await supabase
                .from('tweet_queue')
                .update({
                  retry_count: retryCount,
                  scheduled_at: newScheduledAt,
                  error_message: 'Rate limited - retrying',
                })
                .eq('id', tweet.id);

              results.retried++;
            } else {
              await supabase
                .from('tweet_queue')
                .update({
                  status: 'failed',
                  error_message: 'Rate limit exceeded - max retries reached',
                  retry_count: retryCount,
                })
                .eq('id', tweet.id);

              results.failed++;
            }
          } else {
            await supabase
              .from('tweet_queue')
              .update({
                status: 'failed',
                error_message: errorMessage.substring(0, 500),
                retry_count: tweet.retry_count + 1,
              })
              .eq('id', tweet.id);

            results.failed++;
          }
        }

        // Small delay between tweets to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error('Error processing tweet:', error);
        results.failed++;
      }
    }

    return NextResponse.json({
      message: 'Cron job completed',
      ...results,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
