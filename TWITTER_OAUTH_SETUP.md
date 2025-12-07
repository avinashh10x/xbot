# Twitter OAuth 2.0 Setup Checklist

## 🔴 Critical Issue Found

**Redirect URI mismatch between local and production environments**

---

## ✅ Complete Setup Steps

### 1. X Developer Portal Settings

Go to: https://developer.x.com/en/portal/projects/YOUR_PROJECT_ID/apps/YOUR_APP_ID/auth-settings

#### Add BOTH Callback URLs:

```
✓ https://xbot-seven.vercel.app/api/auth/twitter/callback
✓ http://localhost:3000/api/auth/twitter/callback
```

Click "+ Add another URI / URL" to add both.

#### Verify App Settings:

- ✓ Type of App: **Web App** (Confidential Client)
- ✓ OAuth 2.0 is **enabled**
- ✓ Client ID visible: `RUVYbEtRX2lPYnEtSXZjZTdJR3c6MTpjaQ`
- ✓ Client Secret available (regenerate if needed)

---

### 2. Vercel Environment Variables

Dashboard → Settings → Environment Variables

Set these **EXACTLY**:

```bash
TWITTER_CLIENT_ID=RUVYbEtRX2lPYnEtSXZjZTdJR3c6MTpjaQ
TWITTER_CLIENT_SECRET=JCL5qNnhHpiAWXYgwhhJRkAb-VYVKPGs9XEyq4wP0MJcyMmGkz
NEXT_PUBLIC_TWITTER_REDIRECT_URI=https://xbot-seven.vercel.app/api/auth/twitter/callback
```

⚠️ **CRITICAL**:

- Must be `https://` (not `http://`)
- Must match EXACTLY what's in X Developer Portal
- No trailing slashes

After setting, **redeploy** your app in Vercel.

---

### 3. Local Environment (.env.local)

Your local file should have:

```bash
TWITTER_CLIENT_ID=RUVYbEtRX2lPYnEtSXZjZTdJR3c6MTpjaQ
TWITTER_CLIENT_SECRET=JCL5qNnhHpiAWXYgwhhJRkAb-VYVKPGs9XEyq4wP0MJcyMmGkz
NEXT_PUBLIC_TWITTER_REDIRECT_URI=http://localhost:3000/api/auth/twitter/callback
```

✅ Already correct in your `.env.local`

---

### 4. Testing Steps

#### On Production (Vercel):

1. Go to: `https://xbot-seven.vercel.app/dashboard`
2. Click "Connect Twitter"
3. Authorize the app on X
4. Should redirect back successfully

#### Check Vercel Logs:

1. Vercel Dashboard → Deployments → Latest → Runtime Logs
2. Look for:
   ```
   ✅ Starting Twitter OAuth flow...
   📍 Redirect URI: https://xbot-seven.vercel.app/api/auth/twitter/callback
   🔑 Code verifier received from library
   ```
3. On callback, look for:
   ```
   ✅ State verified successfully
   ✅ Successfully exchanged code for tokens
   ✅ Twitter user: @avinash10x
   ```

#### If Error Occurs:

Look for these in logs:

- `❌ Error handling Twitter OAuth callback:`
- `Error data:` - This will show Twitter's exact error
- Common errors:
  - `invalid_request` → redirect_uri mismatch
  - `invalid_client` → wrong Client ID/Secret
  - `invalid_grant` → code expired or already used

---

### 5. Common Issues & Solutions

| Error                          | Cause                     | Fix                                                                          |
| ------------------------------ | ------------------------- | ---------------------------------------------------------------------------- |
| `Request failed with code 400` | Redirect URI mismatch     | Add both http://localhost:3000 AND https://xbot-seven.vercel.app to X Portal |
| `invalid_client`               | Wrong Client ID/Secret    | Regenerate in X Portal, update env vars                                      |
| `missing_stored_params`        | Cookies not working       | Check browser allows cookies, verify sameSite setting                        |
| `State mismatch`               | CSRF protection triggered | Clear cookies, try again                                                     |

---

## 📊 What Our Code Does (Matches X Docs)

✅ **OAuth 2.0 Authorization Code Flow with PKCE**

- Generates `code_challenge` using S256 method
- Sends `state` for CSRF protection
- Requests scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`
- Exchanges authorization code for access + refresh tokens
- Uses confidential client (Client ID + Secret)

✅ **Matches X Documentation Requirements**

- Uses OAuth 2.0 (not 1.0a)
- PKCE enabled
- Refresh tokens enabled (offline.access scope)
- 2-hour token expiration with refresh capability

---

## 🧪 Quick Debug Command

After deploying to Vercel, check environment variables:

```bash
# In Vercel Dashboard → Settings → Environment Variables
# Verify NEXT_PUBLIC_TWITTER_REDIRECT_URI shows:
# https://xbot-seven.vercel.app/api/auth/twitter/callback
```

---

## 📝 Next Steps

1. ✅ Add both callback URLs to X Developer Portal
2. ✅ Update Vercel env vars with production URL
3. ✅ Redeploy on Vercel
4. ✅ Test connection
5. ✅ Check Vercel runtime logs if it fails
6. ✅ Share the error logs with detailed error.data

---

## 🆘 If Still Failing

Copy these from Vercel runtime logs:

1. The full "Error data:" JSON
2. The "Expected redirect_uri:" line
3. The "Error message:" line

This will show the EXACT mismatch.
