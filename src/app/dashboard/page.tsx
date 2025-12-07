import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  // Authentication is disabled, so we start with empty state
  // User can connect Twitter and add tweets through the UI
  const tweets = [];
  const twitterConnected = false;

  return (
    <DashboardClient
      initialTweets={tweets}
      twitterConnected={twitterConnected}
    />
  );
}
