-- Create posting_settings table
CREATE TABLE IF NOT EXISTS public.posting_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  auto_post_enabled BOOLEAN DEFAULT false,
  post_interval_minutes INTEGER DEFAULT 60,
  max_posts_per_day INTEGER DEFAULT 10,
  posts_today INTEGER DEFAULT 0,
  last_post_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_posting_settings_user_id ON public.posting_settings(user_id);

-- Enable Row Level Security
ALTER TABLE public.posting_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posting_settings
CREATE POLICY "Users can view own posting settings"
  ON public.posting_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posting settings"
  ON public.posting_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posting settings"
  ON public.posting_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_posting_settings_updated_at BEFORE UPDATE ON public.posting_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to reset daily post counter at midnight
CREATE OR REPLACE FUNCTION reset_daily_post_counter()
RETURNS void AS $$
BEGIN
  UPDATE public.posting_settings
  SET posts_today = 0
  WHERE last_post_at < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to increment posts_today counter
CREATE OR REPLACE FUNCTION increment_posts_today(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posting_settings
  SET 
    posts_today = posts_today + 1,
    last_post_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
