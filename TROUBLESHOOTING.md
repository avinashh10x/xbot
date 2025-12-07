# Twitter OAuth 2.0 Troubleshooting Guide

## The Error You're Seeing

**"Something went wrong - You weren't able to give access to the App"**

This error appears on Twitter's OAuth page and means the OAuth flow failed before even redirecting back to your app.

## Root Causes (Most Common First)

### 1. ❌ Using Wrong Credentials (90% of cases)

**The Problem:** You're using API Key/Secret instead of OAuth 2.0 Client ID/Secret

**Where people get confused:**

- Twitter Developer Portal has TWO types of credentials
- "Keys and tokens" tab shows API Key & API Secret (for server-to-server)
- "User authentication settings" shows OAuth 2.0 Client ID & Secret (for user auth)

**The Fix:**

1. Go to: https://developer.twitter.com/en/portal/dashboard
2. Select your app
3. Click "User authentication settings" (NOT "Keys and tokens")
4. If you see "Set up", click it and configure OAuth 2.0:
   - App permissions: **Read and Write**
   - Type of App: **Web App, Automated App or Bot**
   - Callback URI: `http://localhost:3000/api/auth/twitter/callback`
   - Website URL: `http://localhost:3000`
5. After saving, copy:
   - **OAuth 2.0 Client ID** → This goes in `TWITTER_CLIENT_ID`
   - **OAuth 2.0 Client Secret** → This goes in `TWITTER_CLIENT_SECRET`

### 2. ❌ Redirect URI Mismatch

**The Problem:** The callback URL in your code doesn't match Twitter's configuration

**Check these match EXACTLY:**

```env
# In your .env.local:
NEXT_PUBLIC_TWITTER_REDIRECT_URI=http://localhost:3000/api/auth/twitter/callback

# In Twitter Developer Portal → User authentication settings:
Callback URI: http://localhost:3000/api/auth/twitter/callback
```

**Common mistakes:**

- Trailing slash: `callback/` vs `callback`
- HTTP vs HTTPS: `http://` vs `https://`
- Localhost vs 127.0.0.1
- Port number missing or wrong

### 3. ❌ OAuth 2.0 Not Enabled

**The Problem:** Twitter app doesn't have OAuth 2.0 configured

**The Fix:**

1. Go to your app in Twitter Developer Portal
2. Look for "User authentication settings"
3. If you see "Set up" button → OAuth 2.0 is NOT enabled
4. Click "Set up" and complete the configuration
5. Make sure to select "Read and Write" permissions

### 4. ❌ Wrong App Permissions

**The Problem:** App only has "Read" permission, but needs "Read and Write"

**The Fix:**

1. Go to "User authentication settings"
2. Under "App permissions", select **"Read and Write"**
3. Save changes
4. Wait 1-2 minutes for changes to propagate

## How to Debug

### Step 1: Check Your .env.local File

Run the validation script:

```bash
npm run check-env
```

This will tell you if your environment variables are configured correctly.

### Step 2: Check Server Logs

Start your app with detailed logging:

```bash
npm run dev
```

When you click "Connect Twitter", watch the terminal. You should see:

```
✅ Starting Twitter OAuth flow...
📍 Redirect URI: http://localhost:3000/api/auth/twitter/callback
🔑 Generated OAuth parameters
🔗 Redirecting to Twitter OAuth URL: https://twitter.com/i/oauth2/authorize?...
```

If you see ❌ errors, they'll tell you what's wrong.

### Step 3: Verify Twitter App Configuration

Go to: https://developer.twitter.com/en/portal/dashboard

**Checklist:**

- [ ] App exists and is active
- [ ] "User authentication settings" is configured (not just "Keys and tokens")
- [ ] OAuth 2.0 Client ID exists (long alphanumeric string)
- [ ] OAuth 2.0 Client Secret exists
- [ ] App permissions: "Read and Write" ✓
- [ ] Type of App: "Web App, Automated App or Bot" ✓
- [ ] Callback URI: `http://localhost:3000/api/auth/twitter/callback` ✓
- [ ] Website URL: `http://localhost:3000` ✓

## Testing the Fix

1. **Restart your dev server** after changing .env.local:

   ```bash
   # Press Ctrl+C in terminal, then:
   npm run dev
   ```

2. **Log into your app first**:

   - Go to http://localhost:3000
   - Sign up or log in with email/password
   - You MUST be authenticated before connecting Twitter

3. **Try connecting Twitter**:

   - Click "Connect Twitter" in the navbar
   - You should be redirected to Twitter
   - Authorize the app
   - Should redirect back to dashboard with success message

4. **Check logs** if it fails:
   - Look at terminal output
   - Check for specific error messages
   - Follow the suggestions in the error logs

## Still Not Working?

### Double-check these common issues:

1. **Using example/placeholder values:**

   ```env
   # ❌ WRONG
   TWITTER_CLIENT_ID=your_twitter_client_id

   # ✅ CORRECT
   TWITTER_CLIENT_ID=WlhqX3RZMnRhY2swcTVf...
   ```

2. **Mixed up the credentials:**

   - API Key (25 characters) ≠ Client ID (longer base64)
   - API Secret ≠ Client Secret

3. **Not restarting server after env changes:**

   - Always restart `npm run dev` after editing `.env.local`

4. **Browser cache:**

   - Try in incognito/private window
   - Clear cookies for localhost

5. **Twitter app suspended/restricted:**
   - Check Twitter Developer Portal for any warnings
   - New apps may have limited functionality initially

## Production Deployment

When deploying to production (Vercel):

1. Update Twitter app with production URLs:

   ```
   Callback URI: https://your-app.vercel.app/api/auth/twitter/callback
   Website URL: https://your-app.vercel.app
   ```

2. Update environment variables in Vercel:

   ```env
   NEXT_PUBLIC_TWITTER_REDIRECT_URI=https://your-app.vercel.app/api/auth/twitter/callback
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

3. Must use HTTPS in production (Vercel provides this automatically)

## Quick Reference: Where to Get What

| Variable                        | Where to Find                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `TWITTER_CLIENT_ID`             | Twitter Dev Portal → Your App → "User authentication settings" → OAuth 2.0 Client ID     |
| `TWITTER_CLIENT_SECRET`         | Twitter Dev Portal → Your App → "User authentication settings" → OAuth 2.0 Client Secret |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → API → Project URL                                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → Project API keys → anon/public                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase → Project Settings → API → Project API keys → service_role                      |

## Need More Help?

Check the detailed logs in your terminal - they're designed to tell you exactly what's wrong and how to fix it.
