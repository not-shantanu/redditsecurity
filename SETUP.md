# RedditFrost Setup Guide

## Prerequisites

1. **Node.js 18+** installed
2. **Supabase Account** - Create a free account at [supabase.com](https://supabase.com)
3. **Google AI API Key** - Get one from [Google AI Studio](https://aistudio.google.com/app/apikey)
4. **Reddit OAuth Credentials** - Create a Reddit app at [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project
2. Go to SQL Editor
3. Copy and paste the entire contents of `lib/db/schema.sql`
4. Run the SQL to create all tables and policies

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google AI / Gemini
GOOGLE_API_KEY=AIzaSy-your-google-api-key

# Reddit OAuth
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret
REDDIT_ACCESS_TOKEN=your-reddit-access-token

# App URL (for background jobs)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Get Reddit Access Token

See `REDDIT_SETUP.md` for detailed step-by-step instructions.

Quick steps:
1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Create a new app (choose "script" type)
3. Get your Client ID and Client Secret
4. Use one of these methods to get access token:
   - **OAuth flow** (recommended for production)
   - **Username/password** (simpler, for testing)
   
See `REDDIT_SETUP.md` for complete instructions with code examples.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## First Time Usage

1. **Sign Up/Login**: Create an account or sign in
2. **Onboarding**: Complete the persona setup with your brand information
3. **Keywords**: Generate keywords and add target subreddits
4. **Command Center**: Start your first hunt
5. **Dashboard**: Review and approve leads

## Production Deployment

### Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy

### Netlify

1. Push your code to GitHub
2. Import the repository in Netlify
3. Add all environment variables in Netlify dashboard
4. Set build command: `npm run build`
5. Set publish directory: `.next`
6. Deploy

## Important Notes

- **Rate Limiting**: The system includes built-in rate limiting to prevent Reddit bans. Start with low daily caps and gradually increase.
- **Reddit API Limits**: Reddit has rate limits. The jitter algorithm helps, but be mindful of your usage.
- **OpenAI Costs**: Each keyword generation and post analysis uses tokens. Monitor your OpenAI usage.
- **Background Jobs**: For production, set up a cron job or use a service like Inngest to run the hunt cycle periodically.

## Troubleshooting

### "Reddit not configured" error
- Make sure `REDDIT_ACCESS_TOKEN` is set in your environment variables
- Or implement the OAuth flow to get tokens dynamically

### "Google API key not configured" error
- Check that `GOOGLE_API_KEY` is set correctly
- Ensure you have enabled the Generative Language API in Google Cloud Console
- Verify your API key has the necessary permissions

### Database errors
- Verify that you've run the SQL schema in Supabase
- Check that RLS policies are enabled
- Ensure your Supabase URL and keys are correct

### Authentication issues
- Make sure Supabase Auth is enabled in your project
- Email/Password authentication is enabled by default in Supabase
- To disable email confirmation for testing: Go to Supabase Dashboard → Authentication → Settings → Disable "Enable email confirmations"
- Users can sign up and sign in directly with email and password

