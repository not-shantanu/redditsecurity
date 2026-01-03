# Reddit Token Expiration Guide

## Token Expiration Types

### 1. Temporary Tokens (Default)
- **Expires in**: 1 hour
- **Use case**: Testing, development
- **How to get**: Username/password method (default)

### 2. Permanent Tokens
- **Expires in**: Never (until revoked)
- **Use case**: Production, long-running applications
- **How to get**: OAuth flow with `duration=permanent`

### 3. Refresh Tokens
- **Expires in**: Never (until revoked)
- **Use case**: Automatically get new access tokens
- **How to get**: Included in OAuth response

## Getting a Permanent Token

### Method 1: OAuth Flow with Permanent Duration

1. Create Reddit app at [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)

2. Open this URL in your browser (replace `YOUR_CLIENT_ID`):
```
https://www.reddit.com/api/v1/authorize?client_id=YOUR_CLIENT_ID&response_type=code&state=random_string&redirect_uri=http://localhost:3000&duration=permanent&scope=read submit identity
```

3. Authorize the app

4. You'll be redirected to `http://localhost:3000?code=ACCESS_CODE`

5. Exchange code for permanent token:
```bash
curl -X POST https://www.reddit.com/api/v1/access_token \
  -u "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" \
  -d "grant_type=authorization_code&code=ACCESS_CODE&redirect_uri=http://localhost:3000"
```

**Response will include:**
```json
{
  "access_token": "permanent_token_here",
  "token_type": "bearer",
  "expires_in": 0,
  "scope": "read submit identity",
  "refresh_token": "refresh_token_here"
}
```

- `expires_in: 0` means permanent
- Save both `access_token` and `refresh_token`

### Method 2: Update Helper Script for Permanent Token

We can update the helper script to request permanent tokens. However, Reddit's username/password method doesn't support permanent tokens directly - you need to use OAuth flow.

## Token Refresh (Recommended for Production)

For production applications, implement token refresh:

### Using Refresh Token

When your access token expires, use the refresh token to get a new one:

```bash
curl -X POST https://www.reddit.com/api/v1/access_token \
  -u "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" \
  -d "grant_type=refresh_token&refresh_token=YOUR_REFRESH_TOKEN"
```

## Recommendations

### For Development/Testing:
- Use temporary tokens (1 hour)
- Regenerate when expired using the helper script
- Simple and works for testing

### For Production:
- Use OAuth flow to get permanent token
- Or implement refresh token logic
- Store refresh token securely
- Automatically refresh access token when expired

## Current Implementation

The current RedditFrost implementation uses a single access token from environment variables. For production, you should:

1. **Option A**: Get a permanent token (doesn't expire)
2. **Option B**: Implement token refresh logic (automatically renews expired tokens)

## Quick Fix: Get Permanent Token Now

If you want a token that doesn't expire:

1. Use the OAuth flow method in `REDDIT_SETUP.md`
2. Make sure to include `duration=permanent` in the authorization URL
3. Save the permanent token to `.env.local`

The permanent token will work indefinitely until you revoke it manually in Reddit settings.

