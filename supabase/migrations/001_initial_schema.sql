-- Create users table extensions
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  twitter_access_token TEXT,
  twitter_refresh_token TEXT,
  twitter_user_id TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tweet_queue table
CREATE TABLE IF NOT EXISTS public.tweet_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed')),
  posted_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_prefs table
CREATE TABLE IF NOT EXISTS public.user_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  daily_post_time TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tweet_queue_user_id ON public.tweet_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_tweet_queue_status ON public.tweet_queue(status);
CREATE INDEX IF NOT EXISTS idx_tweet_queue_scheduled_at ON public.tweet_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_tweet_queue_status_scheduled ON public.tweet_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id ON public.user_prefs(user_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tweet_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prefs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for tweet_queue
CREATE POLICY "Users can view own tweets"
  ON public.tweet_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tweets"
  ON public.tweet_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tweets"
  ON public.tweet_queue FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tweets"
  ON public.tweet_queue FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_prefs
CREATE POLICY "Users can view own prefs"
  ON public.user_prefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prefs"
  ON public.user_prefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prefs"
  ON public.user_prefs FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tweet_queue_updated_at BEFORE UPDATE ON public.tweet_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_prefs_updated_at BEFORE UPDATE ON public.user_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_prefs (user_id, timezone)
  VALUES (NEW.id, 'UTC');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
