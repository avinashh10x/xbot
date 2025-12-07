'use server';

import { revalidatePath } from 'next/cache';
import {
  createTweet as dbCreateTweet,
  updateTweet as dbUpdateTweet,
  deleteTweet as dbDeleteTweet,
} from '@/lib/db/queries';
import { getCurrentUser } from './auth';

export async function createTweet(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const content = formData.get('content') as string;
    const scheduledAt = formData.get('scheduled_at') as string;
    const mediaUrl = formData.get('media_url') as string | undefined;

    if (!content || !scheduledAt) {
      return { error: 'Content and scheduled time are required' };
    }

    const tweet = await dbCreateTweet(user.id, content, scheduledAt, mediaUrl);

    if (!tweet) {
      return { error: 'Failed to create tweet' };
    }

    revalidatePath('/dashboard');
    return { success: true, tweet };
  } catch (error: any) {
    console.error('Error creating tweet:', error);
    return { error: error.message || 'Failed to create tweet' };
  }
}

export async function updateTweet(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const id = formData.get('id') as string;
    const content = formData.get('content') as string;
    const scheduledAt = formData.get('scheduled_at') as string;
    const mediaUrl = formData.get('media_url') as string | undefined;

    if (!id) {
      return { error: 'Tweet ID is required' };
    }

    const updates: any = {};
    if (content) updates.content = content;
    if (scheduledAt) updates.scheduled_at = scheduledAt;
    if (mediaUrl !== undefined) updates.media_url = mediaUrl;

    const success = await dbUpdateTweet(id, updates);

    if (!success) {
      return { error: 'Failed to update tweet' };
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating tweet:', error);
    return { error: error.message || 'Failed to update tweet' };
  }
}

export async function deleteTweet(tweetId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    const success = await dbDeleteTweet(tweetId);

    if (!success) {
      return { error: 'Failed to delete tweet' };
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting tweet:', error);
    return { error: error.message || 'Failed to delete tweet' };
  }
}
