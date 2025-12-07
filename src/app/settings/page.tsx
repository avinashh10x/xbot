import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile, getUserPrefs } from '@/lib/db/queries';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getUserProfile(user.id);
  const prefs = await getUserPrefs(user.id);

  const twitterConnected = !!(
    profile?.twitter_access_token && profile?.twitter_refresh_token
  );

  return <SettingsClient initialPrefs={prefs} twitterConnected={twitterConnected} />;
}
