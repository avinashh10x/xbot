import { Suspense } from 'react';
import { DashboardClient } from "./DashboardClient";
import { TweetQueue } from "@/types";

export default async function DashboardPage() {
  // Authentication is disabled, so we start with empty state
  // User can connect Twitter and add tweets through the UI
  const tweets: TweetQueue[] = [];
  const twitterConnected = false;

  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardClient
        initialTweets={tweets}
        twitterConnected={twitterConnected}
      />
    </Suspense>
  );
}
