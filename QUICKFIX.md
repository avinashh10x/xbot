# Quick Fix: Twitter OAuth Error

## ❌ The Error

"Something went wrong - You weren't able to give access to the App"

## ✅ The Fix (99% of cases)

### You're probably using the WRONG credentials!

Twitter has TWO types of credentials:

1. **API Key & API Secret** (for server calls) ❌ NOT THIS
2. **OAuth 2.0 Client ID & Client Secret** (for user auth) ✅ USE THIS

### How to Get the RIGHT Credentials:

1. **Go to:** https://developer.twitter.com/en/portal/dashboard
2. **Select** your app
3. **Click** "User authentication settings" (LEFT sidebar)
4. **If you see "Set up" button:** Click it and configure:
   - App permissions: **Read and Write**
   - Type: **Web App, Automated App or Bot**
   - Callback: `http://localhost:3000/api/auth/twitter/callback`
   - Website: `http://localhost:3000`
   - Click **Save**
5. **Copy the credentials shown:**
   - OAuth 2.0 Client ID → Put in `TWITTER_CLIENT_ID`
   - OAuth 2.0 Client Secret → Put in `TWITTER_CLIENT_SECRET`

### Update .env.local:

```env
TWITTER_CLIENT_ID=your-oauth2-client-id-here
TWITTER_CLIENT_SECRET=your-oauth2-client-secret-here
NEXT_PUBLIC_TWITTER_REDIRECT_URI=http://localhost:3000/api/auth/twitter/callback
```

### Restart the server:

```bash
# Ctrl+C to stop, then:
npm run dev
```

### Test:

1. Log into your app first (email/password)
2. Then click "Connect Twitter"
3. Should work now!

## Still not working?

Run this to check your setup:

```bash
npm run check-env
```

Check terminal logs when you try to connect - they'll tell you exactly what's wrong.

Full troubleshooting guide: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
