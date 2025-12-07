'use server';

import { revalidatePath } from 'next/cache';
import {
  getUserPrefs,
  updateUserPrefs as dbUpdateUserPrefs,
} from '@/lib/db/queries';
import { getCurrentUser } from './auth';

export async function getPreferences() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const prefs = await getUserPrefs(user.id);
    return { success: true, prefs };
  } catch (error: any) {
    console.error('Error fetching preferences:', error);
    return { error: error.message || 'Failed to fetch preferences' };
  }
}

export async function updatePreferences(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const dailyPostTime = formData.get('daily_post_time') as string;
    const timezone = formData.get('timezone') as string;

    const updates: any = {};
    if (dailyPostTime) updates.daily_post_time = dailyPostTime;
    if (timezone) updates.timezone = timezone;

    const success = await dbUpdateUserPrefs(user.id, updates);

    if (!success) {
      return { error: 'Failed to update preferences' };
    }

    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating preferences:', error);
    return { error: error.message || 'Failed to update preferences' };
  }
}
