import { Suspense } from "react";
import { cookies } from "next/headers";
import { DashboardClient } from "./DashboardClient";
import { TweetQueue } from "@/types";
import { getTweetQueue } from "@/lib/db/queries";

export default async function DashboardPage() {
  // Check if Twitter is connected via cookies
  const cookieStore = await cookies();
  const twitterAccessToken = cookieStore.get("twitter_access_token")?.value;
  const twitterUsername = cookieStore.get("twitter_username")?.value;
  const twitterUserId = cookieStore.get("twitter_user_id")?.value;
  const twitterConnected = !!twitterAccessToken;

  // Load tweets if Twitter is connected
  let tweets: TweetQueue[] = [];
  if (twitterUserId) {
    tweets = await getTweetQueue(twitterUserId);
  }

  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardClient
        initialTweets={tweets}
        twitterConnected={twitterConnected}
        twitterUsername={twitterUsername}
        twitterUserId={twitterUserId}
      />
    </Suspense>
  );
}
