import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile, getTweetQueue } from '@/lib/db/queries';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getUserProfile(user.id);
  const tweets = await getTweetQueue(user.id);

  const twitterConnected = !!(
    profile?.twitter_access_token && profile?.twitter_refresh_token
  );

  return (
    <DashboardClient 
      initialTweets={tweets} 
      twitterConnected={twitterConnected} 
    />
  );
}
