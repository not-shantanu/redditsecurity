# Environment Variables Required for RedditFrost

## Required Variables

### Supabase (Required)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
**Where to get them:**
- Go to your Supabase project dashboard
- Settings → API
- Copy the "Project URL" and "anon public" key

### Google AI / Gemini (Required)
```env
GOOGLE_API_KEY=your-google-api-key
```
**Where to get it:**
- Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
- Or [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Create a new API key for Gemini API
- Enable the Generative Language API in your Google Cloud project

### Reddit (Required)
```env
REDDIT_ACCESS_TOKEN=your-reddit-access-token
```
**Where to get it:**
- See `REDDIT_SETUP.md` for detailed instructions
- Quick method: Create Reddit app at [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
- Use OAuth flow or username/password method to get access token

⚠️ **Token Expiration:**
- Tokens from username/password method expire in **1 hour**
- For permanent tokens, use OAuth flow with `duration=permanent`
- See `REDDIT_TOKEN_EXPIRATION.md` for permanent token setup

## Optional Variables

### App URL (Optional - has default)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
**Default:** `http://localhost:3000` (used for background job callbacks)

### Reddit OAuth (Optional - if not using access token directly)
```env
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret
REDDIT_USERNAME=your-reddit-username
REDDIT_PASSWORD=your-reddit-password
```
**Where to get them:**
- Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
- Create a new app (choose "script" type)
- Client ID is shown under the app name
- Client Secret is shown when you click "edit" on the app

## Complete .env.local Example

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google AI / Gemini (Required)
GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Reddit (Required - choose one method)
# Method 1: Direct access token
REDDIT_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Method 2: OAuth credentials (if implementing OAuth flow)
# REDDIT_CLIENT_ID=xxxxxxxxxxxxx
# REDDIT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# REDDIT_USERNAME=your_username
# REDDIT_PASSWORD=your_password

# App URL (Optional)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Notes

- **NEXT_PUBLIC_*** variables are exposed to the browser (client-side)
- **Non-NEXT_PUBLIC_*** variables are server-side only (more secure)
- Never commit `.env.local` to version control
- For production, set these in your hosting platform's environment variables section

