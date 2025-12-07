export interface User {
  id: string;
  email: string;
  twitter_access_token?: string;
  twitter_refresh_token?: string;
  twitter_user_id?: string;
  token_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TweetQueue {
  id: string;
  user_id: string;
  content: string;
  media_url?: string;
  scheduled_at: string;
  status: "pending" | "posted" | "failed";
  posted_at?: string;
  retry_count: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPrefs {
  id: string;
  user_id: string;
  daily_post_time?: string; // HH:mm format
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface TwitterTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export interface CreateTweetInput {
  content: string;
  media_url?: string;
  scheduled_at: string;
}

export interface UpdateTweetInput {
  id: string;
  content?: string;
  media_url?: string;
  scheduled_at?: string;
}

export interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

export interface PostingSettings {
  id: string;
  user_id: string;
  auto_post_enabled: boolean;
  post_interval_minutes: number;
  max_posts_per_day: number;
  posts_today: number;
  last_post_at?: string;
  created_at: string;
  updated_at: string;
}
