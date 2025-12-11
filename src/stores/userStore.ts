"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Scheduled tweet in queue
export interface ScheduledTweet {
  id: string;
  content: string;
  scheduled_at: string;
  status: "pending" | "posted" | "failed";
  posted_at?: string;
  created_at: string;
}

// Twitter profile from API
export interface TwitterProfile {
  id: string;
  username: string;
  name: string;
  description?: string;
  profileImageUrl?: string;
  profileBannerUrl?: string;
  location?: string;
  url?: string;
  verified?: boolean;
  verifiedType?: string;
  createdAt?: string;
  // Metrics
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  listedCount: number;
}

// Tweet from Twitter API with full metrics
export interface TwitterTweet {
  id: string;
  text: string;
  createdAt: string;
  // Engagement metrics
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  impressionCount: number;
  bookmarkCount: number;
  // Media
  attachments?: {
    mediaKeys?: string[];
    type?: string;
    url?: string;
    previewUrl?: string;
  }[];
  // Tweet type
  isRetweet: boolean;
  isReply: boolean;
  conversationId?: string;
}

interface UserState {
  // Connection status
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Twitter profile
  profile: TwitterProfile | null;

  // Recent tweets from Twitter
  recentTweets: TwitterTweet[];
  pinnedTweet: TwitterTweet | null;

  // Scheduled tweet queue (from DB)
  scheduledTweets: ScheduledTweet[];

  // Actions
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProfile: (profile: TwitterProfile | null) => void;
  setRecentTweets: (tweets: TwitterTweet[]) => void;
  setPinnedTweet: (tweet: TwitterTweet | null) => void;
  setScheduledTweets: (tweets: ScheduledTweet[]) => void;
  addScheduledTweet: (tweet: ScheduledTweet) => void;
  removeScheduledTweet: (id: string) => void;
  updateScheduledTweet: (id: string, updates: Partial<ScheduledTweet>) => void;
  clearAll: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // Initial state
      isConnected: false,
      isLoading: false,
      error: null,
      profile: null,
      recentTweets: [],
      pinnedTweet: null,
      scheduledTweets: [],

      // Setters
      setConnected: (connected) => set({ isConnected: connected }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setProfile: (profile) => set({ profile, isConnected: !!profile }),
      setRecentTweets: (tweets) => set({ recentTweets: tweets }),
      setPinnedTweet: (tweet) => set({ pinnedTweet: tweet }),
      setScheduledTweets: (tweets) => set({ scheduledTweets: tweets }),

      addScheduledTweet: (tweet) =>
        set((state) => ({
          scheduledTweets: [...state.scheduledTweets, tweet],
        })),

      removeScheduledTweet: (id) =>
        set((state) => ({
          scheduledTweets: state.scheduledTweets.filter((t) => t.id !== id),
        })),

      updateScheduledTweet: (id, updates) =>
        set((state) => ({
          scheduledTweets: state.scheduledTweets.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      clearAll: () =>
        set({
          isConnected: false,
          isLoading: false,
          error: null,
          profile: null,
          recentTweets: [],
          pinnedTweet: null,
          scheduledTweets: [],
        }),
    }),
    {
      name: "xbot-user",
      partialize: (state) => ({
        // Only persist essential data
        isConnected: state.isConnected,
        profile: state.profile,
        scheduledTweets: state.scheduledTweets,
      }),
    }
  )
);
