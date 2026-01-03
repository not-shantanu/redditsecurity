# How to Get Reddit Access Token

There are two main methods to get a Reddit access token. Choose the one that works best for you.

## Method 1: Reddit OAuth (Recommended)

### Step 1: Create a Reddit App

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Scroll down and click **"create another app..."** or **"create app"**
3. Fill in the form:
   - **Name**: RedditFrost (or any name you prefer)
   - **App type**: Select **"script"**
   - **Description**: Reddit marketing automation tool
   - **About URL**: (optional, can leave blank)
   - **Redirect URI**: `http://localhost:3000` (or your app URL)
4. Click **"create app"**

### Step 2: Get Your Credentials

After creating the app, you'll see:
- **Client ID**: The string under your app name (looks like: `xxxxxxxxxxxxx`)
- **Client Secret**: Click "edit" on your app to reveal the secret (looks like: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### Step 3: Get Access Token via OAuth Flow

#### Option A: Using Reddit's OAuth Endpoint (Browser)

1. Open this URL in your browser (replace with your credentials):
```
https://www.reddit.com/api/v1/authorize?client_id=YOUR_CLIENT_ID&response_type=code&state=random_string&redirect_uri=http://localhost:3000&duration=permanent&scope=read submit identity
```

2. Authorize the app
3. You'll be redirected to `http://localhost:3000?code=ACCESS_CODE`
4. Copy the `code` from the URL

5. Exchange the code for a token using this command (replace values):
```bash
curl -X POST https://www.reddit.com/api/v1/access_token \
  -u "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" \
  -d "grant_type=authorization_code&code=ACCESS_CODE&redirect_uri=http://localhost:3000"
```

6. You'll get a response with `access_token` - copy that token!

#### Option B: Using Username/Password (Simpler, for testing)

Use this method if you just want to test quickly:

```bash
curl -X POST https://www.reddit.com/api/v1/access_token \
  -u "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" \
  -d "grant_type=password&username=YOUR_REDDIT_USERNAME&password=YOUR_REDDIT_PASSWORD"
```

**Response:**
```json
{
  "access_token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "token_type": "bearer",
  "expires_in": 3600,
  "scope": "read submit identity",
  "refresh_token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

Copy the `access_token` value.

## Method 2: Using a Helper Script

Create a file `get-reddit-token.js`:

```javascript
const https = require('https');

const CLIENT_ID = 'your_client_id';
const CLIENT_SECRET = 'your_client_secret';
const USERNAME = 'your_reddit_username';
const PASSWORD = 'your_reddit_password';

const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

const postData = `grant_type=password&username=${USERNAME}&password=${PASSWORD}`;

const options = {
  hostname: 'www.reddit.com',
  path: '/api/v1/access_token',
  method: 'POST',
  headers: {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'RedditFrost/2.0'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const response = JSON.parse(data);
    console.log('Access Token:', response.access_token);
    console.log('\nAdd this to your .env.local file:');
    console.log(`REDDIT_ACCESS_TOKEN=${response.access_token}`);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(postData);
req.end();
```

Run it:
```bash
node get-reddit-token.js
```

## Method 3: Using Python Script

Create `get_reddit_token.py`:

```python
import requests
import base64
import sys

CLIENT_ID = 'your_client_id'
CLIENT_SECRET = 'your_client_secret'
USERNAME = 'your_reddit_username'
PASSWORD = 'your_reddit_password'

# Encode credentials
credentials = base64.b64encode(f'{CLIENT_ID}:{CLIENT_SECRET}'.encode()).decode()

# Request token
headers = {
    'Authorization': f'Basic {credentials}',
    'User-Agent': 'RedditFrost/2.0'
}

data = {
    'grant_type': 'password',
    'username': USERNAME,
    'password': PASSWORD
}

response = requests.post(
    'https://www.reddit.com/api/v1/access_token',
    headers=headers,
    data=data
)

if response.status_code == 200:
    token_data = response.json()
    print(f"Access Token: {token_data['access_token']}")
    print(f"\nAdd this to your .env.local file:")
    print(f"REDDIT_ACCESS_TOKEN={token_data['access_token']}")
else:
    print(f"Error: {response.status_code}")
    print(response.text)
```

Run it:
```bash
python get_reddit_token.py
```

## Add Token to Your .env.local

Once you have the access token, add it to your `.env.local` file:

```env
REDDIT_ACCESS_TOKEN=your_access_token_here
```

## Token Expiration

⚠️ **Important**: Tokens obtained via username/password method expire after **1 hour**.

### Options:

1. **Temporary Token (1 hour)** - Current method
   - Simple for testing
   - Regenerate when expired

2. **Permanent Token** - Use OAuth flow
   - Never expires (until revoked)
   - See `REDDIT_TOKEN_EXPIRATION.md` for detailed instructions
   - Use `duration=permanent` in OAuth authorization URL

3. **Refresh Token** - Automatic renewal
   - Get refresh token from OAuth flow
   - Use it to get new access tokens automatically

**For production, use permanent tokens or implement refresh logic!**

## Troubleshooting

### "invalid_grant" error
- Check your username and password are correct
- Make sure you're using the right client ID and secret
- Try generating a new token

### "401 Unauthorized" error
- Verify your access token is still valid
- Check that the token hasn't expired
- Regenerate the token if needed

### Token not working
- Reddit tokens can expire
- Regenerate using one of the methods above
- Make sure you're using the full token (no extra spaces)

## Security Notes

⚠️ **Important:**
- Never commit your `.env.local` file to version control
- Keep your Reddit credentials secure
- Consider using environment variables in production
- For production, implement token refresh logic

## Quick Test

Test your token works:

```bash
curl -H "Authorization: bearer YOUR_ACCESS_TOKEN" \
     -H "User-Agent: RedditFrost/2.0" \
     https://oauth.reddit.com/api/v1/me
```

If you get your Reddit username back, the token is working! ✅

