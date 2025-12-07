# TweetPilot Setup Guide

## Quick Setup (5 minutes)

### Step 1: Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create account
2. Click "New Project"
3. Fill in:
   - Name: `tweetpilot`
   - Database Password: (save this)
   - Region: (closest to you)
4. Wait for project to be ready (~2 minutes)

5. **Run Database Migration**:

   - Click "SQL Editor" in left sidebar
   - Click "New Query"
   - Copy entire content of `supabase/migrations/001_initial_schema.sql`
   - Paste and click "Run"
   - Should see success message

6. **Get Credentials**:
   - Click Settings (gear icon) → API
   - Copy:
     - Project URL
     - `anon` `public` key
     - `service_role` `secret` key

### Step 2: Twitter Developer Setup

1. Go to [developer.twitter.com/en/portal/dashboard](https://developer.twitter.com/en/portal/dashboard)
2. Sign in with your Twitter/X account
3. Click "Create App" or "Add App" (or select existing app)
4. Fill in:

   - App name: `TweetPilot` (or your preferred name)
   - Description: `Tweet scheduling app`

5. **Configure OAuth 2.0** (CRITICAL STEP):

   - In your app dashboard, click "User authentication settings"
   - Click "Set up"
   - Configure:
     - **App permissions**: Select "Read and Write"
     - **Type of App**: Select "Web App, Automated App or Bot"
     - **App info**:
       - Callback URI / Redirect URL: `http://localhost:3000/api/auth/twitter/callback`
       - Website URL: `http://localhost:3000`
   - Click "Save"

6. **Get OAuth 2.0 Credentials**:
   - After saving, you'll see your OAuth 2.0 credentials
   - Copy **OAuth 2.0 Client ID** (this is what you need!)
   - Copy **OAuth 2.0 Client Secret** (this is what you need!)
   - ⚠️ **Do NOT use** "API Key" or "API Secret Key" from "Keys and tokens" tab

### Step 3: Environment Variables

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and fill in:

```env
# From Supabase (Step 1)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# From Twitter (Step 2)
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
NEXT_PUBLIC_TWITTER_REDIRECT_URI=http://localhost:3000/api/auth/twitter/callback

# Keep these as-is for local
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Generate random string
CRON_SECRET=use_any_random_string_here_abc123xyz
```

### Step 4: Install and Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## First Use

1. Click "Get Started Free"
2. Create account with email/password
3. After login, you'll see dashboard
4. Click "Connect Twitter" in navbar
5. Authorize the app
6. Now you can schedule tweets!

## Production Deployment (Vercel)

### Prerequisites

- GitHub account
- Push your code to GitHub repository

### Deploy Steps

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repo
4. Configure:
   - Framework: Next.js
   - Root Directory: `./`
5. **Add Environment Variables**:
   - Copy all from `.env.local`
   - Update URLs:
     - `NEXT_PUBLIC_APP_URL=https://your-app.vercel.app`
     - `NEXT_PUBLIC_TWITTER_REDIRECT_URI=https://your-app.vercel.app/api/auth/twitter/callback`
6. Click "Deploy"

### Post-Deployment

1. **Update Twitter App**:

   - Go to Twitter Developer Portal
   - Update callback URL to: `https://your-app.vercel.app/api/auth/twitter/callback`
   - Update website URL to: `https://your-app.vercel.app`

2. **Verify Cron Job**:

   - In Vercel dashboard → Cron
   - Should see: `/api/cron/post-tweets` scheduled hourly
   - If not, ensure `vercel.json` is in root

3. **Test Production**:
   - Visit your app URL
   - Sign up
   - Connect Twitter
   - Schedule a test tweet
   - Wait for next hour to see it post

## Troubleshooting

### ❌ "Something went wrong - You weren't able to give access to the App"

This is Twitter's error page. Common causes:

**1. Using wrong credentials type:**

- ❌ **WRONG**: Using API Key & API Secret from "Keys and tokens" tab
- ✅ **CORRECT**: Using OAuth 2.0 Client ID & Client Secret from "User authentication settings"

**Fix:**

1. Go to Twitter Developer Portal → Your App → "User authentication settings"
2. If not set up, click "Set up" and configure OAuth 2.0
3. Copy the **OAuth 2.0 Client ID** (not API Key!)
4. Copy the **OAuth 2.0 Client Secret** (not API Secret!)
5. Update `.env.local` with correct values

**2. OAuth 2.0 not enabled:**

1. Go to Twitter Developer Portal → Your App
2. Click "User authentication settings" → "Set up"
3. Configure:
   - App permissions: **Read and Write**
   - Type of App: **Web App, Automated App or Bot**
   - Callback URI: `http://localhost:3000/api/auth/twitter/callback`
   - Website URL: `http://localhost:3000`
4. Save changes

**3. Redirect URI mismatch:**

- Callback URL in Twitter app MUST match **exactly**: `http://localhost:3000/api/auth/twitter/callback`
- No trailing slash
- Check for `http://` vs `https://`
- Case-sensitive

**4. App permissions insufficient:**

- Go to "User authentication settings"
- Set "App permissions" to **"Read and Write"**
- Save and try again

### 🔍 How to Debug (Check Server Logs)

The app now logs detailed OAuth flow information. Check your terminal:

```bash
npm run dev
```

Look for these log messages:

- ✅ `Starting Twitter OAuth flow...`
- ✅ `Generated OAuth parameters`
- ✅ `Redirecting to Twitter OAuth URL`
- ✅ `Twitter OAuth callback received`
- ✅ `Successfully exchanged code for tokens`

If you see ❌ errors, they'll tell you exactly what's wrong:

- `TWITTER_CLIENT_ID is not set` → Check `.env.local`
- `Unauthorized - Check your Twitter Client ID and Secret` → Wrong credentials
- `Redirect URI mismatch` → Update Twitter app callback URL
- `No authenticated Supabase user found` → Log into your app first

### "Invalid redirect_uri"

- Check Twitter app callback URL matches exactly
- No trailing slashes
- Must be HTTPS in production
- Check `.env.local` has: `NEXT_PUBLIC_TWITTER_REDIRECT_URI=http://localhost:3000/api/auth/twitter/callback`

### "Failed to connect Twitter"

- Verify TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET are OAuth 2.0 credentials
- Check Twitter app has OAuth 2.0 enabled in "User authentication settings"
- Ensure scopes include: tweet.read, tweet.write, users.read, offline.access
- Verify you're logged into your app (Supabase session) before connecting Twitter

### Environment variables not loading

```bash
# Make sure you have .env.local (not just .env.example)
cp .env.example .env.local

# Restart the dev server after changing env vars
# Press Ctrl+C in terminal, then:
npm run dev
```

### "Not authenticated" error

You must be logged into your app BEFORE connecting Twitter:

1. Go to `http://localhost:3000`
2. Sign up or log in with email/password
3. You'll be redirected to dashboard
4. Now click "Connect Twitter" in navbar

### Tweets not posting

- Check Vercel → Functions → Logs
- Look for `/api/cron/post-tweets` execution
- Verify CRON_SECRET is set
- Check Twitter API limits

### Database errors

- Verify all migrations ran successfully
- Check Supabase dashboard → Database → Tables
- Should see: users, tweet_queue, user_prefs
- Check RLS policies are enabled

### Realtime not working

- Ensure Supabase Realtime is enabled (it is by default)
- Check browser console for errors
- Verify you're on latest Supabase tier (free tier has limits)

## Testing the Cron Job Locally

Since Vercel cron only works in production, test locally:

```bash
# Make a request to the cron endpoint
curl -X GET http://localhost:3000/api/cron/post-tweets \
  -H "Authorization: Bearer your_cron_secret"
```

## Support

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Twitter API**: [developer.twitter.com/en/docs](https://developer.twitter.com/en/docs)
- **Next.js**: [nextjs.org/docs](https://nextjs.org/docs)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)

## Next Steps

- Customize UI colors and branding
- Add analytics tracking
- Implement tweet analytics
- Add thread scheduling
- Implement media upload (not just URLs)
- Add more timezones
- Email notifications
