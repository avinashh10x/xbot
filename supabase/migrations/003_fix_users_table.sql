-- Migration to fix users table for OAuth-only auth
-- Remove the foreign key constraint to auth.users since we don't use Supabase Auth

-- First, drop existing table and recreate without the constraint
-- Note: This will delete all existing data - run only on fresh DB

-- Drop dependent tables first (due to foreign keys)
DROP TABLE IF EXISTS public.posting_settings CASCADE;
DROP TABLE IF EXISTS public.user_prefs CASCADE;
DROP TABLE IF EXISTS public.tweet_queue CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Recreate users table WITHOUT auth.users reference
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  twitter_access_token TEXT,
  twitter_refresh_token TEXT,
  twitter_user_id TEXT UNIQUE,
  twitter_username TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tweet_queue table
CREATE TABLE public.tweet_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed')),
  posted_at TIMESTAMPTZ,
  twitter_tweet_id TEXT,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_prefs table
CREATE TABLE public.user_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  daily_post_time TEXT DEFAULT '20:00',
  auto_post_enabled BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX idx_users_twitter_user_id ON public.users(twitter_user_id);
CREATE INDEX idx_tweet_queue_user_id ON public.tweet_queue(user_id);
CREATE INDEX idx_tweet_queue_status ON public.tweet_queue(status);
CREATE INDEX idx_tweet_queue_scheduled_at ON public.tweet_queue(scheduled_at);
CREATE INDEX idx_tweet_queue_status_scheduled ON public.tweet_queue(status, scheduled_at);

-- Disable RLS for simplicity (single user app)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tweet_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prefs DISABLE ROW LEVEL SECURITY;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tweet_queue_updated_at ON public.tweet_queue;
CREATE TRIGGER update_tweet_queue_updated_at BEFORE UPDATE ON public.tweet_queue
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_prefs_updated_at ON public.user_prefs;
CREATE TRIGGER update_user_prefs_updated_at BEFORE UPDATE ON public.user_prefs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
