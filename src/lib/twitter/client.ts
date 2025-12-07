import { TwitterApi } from "twitter-api-v2";

export interface TwitterClientConfig {
  accessToken: string;
  refreshToken: string;
}

export function createTwitterClient(config: TwitterClientConfig) {
  return new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  }).readWrite;
}

export function createTwitterClientWithTokens(accessToken: string) {
  return new TwitterApi(accessToken);
}

export async function refreshTwitterToken(refreshToken: string) {
  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    const {
      client: refreshedClient,
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    } = await client.refreshOAuth2Token(refreshToken);

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return {
      accessToken,
      refreshToken: newRefreshToken || refreshToken,
      expiresAt,
    };
  } catch (error) {
    console.error("Failed to refresh Twitter token:", error);
    throw new Error("Failed to refresh Twitter token");
  }
}

export async function uploadMedia(accessToken: string, mediaUrl: string) {
  try {
    // Fetch the media file
    const response = await fetch(mediaUrl);
    const buffer = await response.arrayBuffer();

    // Use Twitter API v1.1 for media upload
    const client = new TwitterApi(accessToken);
    const mediaId = await client.v1.uploadMedia(Buffer.from(buffer), {
      mimeType: response.headers.get("content-type") || "image/jpeg",
    });

    return mediaId;
  } catch (error) {
    console.error("Failed to upload media:", error);
    throw new Error("Failed to upload media to Twitter");
  }
}

export async function postTweet(
  accessToken: string,
  content: string,
  mediaId?: string
) {
  try {
    const client = new TwitterApi(accessToken);

    const tweetPayload: any = { text: content };

    if (mediaId) {
      tweetPayload.media = { media_ids: [mediaId] };
    }

    const tweet = await client.v2.tweet(tweetPayload);
    return tweet.data;
  } catch (error: any) {
    console.error("Failed to post tweet:", error);

    // Check for rate limit error
    if (error?.code === 429 || error?.rateLimit) {
      throw new Error("RATE_LIMIT");
    }

    throw new Error(error?.message || "Failed to post tweet");
  }
}

export function generateOAuthUrl(state: string, codeChallenge: string) {
  console.log("📋 Generating OAuth URL with configuration:");
  console.log(
    "   Client ID:",
    process.env.TWITTER_CLIENT_ID?.substring(0, 10) + "..."
  );
  console.log("   Redirect URI:", process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI);
  console.log("   Scopes: tweet.read, tweet.write, users.read, offline.access");

  const client = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  });

  return client.generateOAuth2AuthLink(
    process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI!,
    {
      scope: ["tweet.read", "tweet.write", "users.read", "offline.access"],
      state,
      codeChallenge,
      codeChallengeMethod: "S256",
    }
  );
}
