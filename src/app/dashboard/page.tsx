import { Suspense } from "react";
import { cookies } from "next/headers";
import { DashboardClient } from "./DashboardClient";
import { TweetQueue } from "@/types";

export default async function DashboardPage() {
  // Authentication is disabled, so we start with empty state
  // User can connect Twitter and add tweets through the UI
  const tweets: TweetQueue[] = [];

  // Check if Twitter is connected via cookies
  const cookieStore = await cookies();
  const twitterAccessToken = cookieStore.get("twitter_access_token")?.value;
  const twitterConnected = !!twitterAccessToken;

  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardClient
        initialTweets={tweets}
        twitterConnected={twitterConnected}
      />
    </Suspense>
  );
}
