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
  status: 'pending' | 'posted' | 'failed';
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
