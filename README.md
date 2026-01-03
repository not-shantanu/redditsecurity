# Reddit Copilot - AI-Powered Reddit Marketing Automation Platform

An intelligent Reddit marketing automation tool that helps you discover relevant posts, generate authentic AI-powered replies, and automate your Reddit engagement strategy.

## 🚀 Features

### Core Functionality
- **Brand Analysis**: Automatically scrape and analyze brand websites to extract key information
- **Market Discovery**: AI-powered keyword and subreddit discovery with relevance scoring
- **Post Analysis**: Intelligent post analysis with "Chilly Score" to identify engagement opportunities
- **Reply Generation**: Natural, human-like AI-generated replies that don't sound robotic
- **Automation**: Automated post discovery, analysis, and reply generation
- **Chrome Extension**: Browser extension for seamless Reddit interaction and comment posting

### Key Pages
- **Brand Setup**: Configure your brand with automatic website scraping
- **Define Market**: Discover and manage keywords and subreddits
- **Subreddit Intelligence**: Monitor and analyze subreddit performance
- **AI Prompts**: Customize AI prompts for analysis and reply generation
- **Automate**: Automated post discovery and reply generation
- **User Profile**: Manage your account settings

## 🛠️ Tech Stack

### Frontend
- **Next.js 14.2** (App Router)
- **TypeScript 5.4.5**
- **Tailwind CSS 3.4**
- **Microsoft Fluent Design System** principles
- **Zustand** for state management
- **Sonner** for toast notifications

### Backend
- **Next.js API Routes**
- **Supabase** (PostgreSQL with Row Level Security)
- **Supabase Auth** for authentication

### AI Integration
- **Google Gemini 2.0 Flash Lite** for:
  - Keyword generation
  - Subreddit discovery
  - Post analysis (Chilly Score)
  - Reply generation
  - Brand information extraction

### Chrome Extension
- **Manifest V3**
- Content scripts for Reddit page interaction
- Background service worker
- Popup UI for thread management

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Google AI API key (Gemini)
- Chrome browser (for extension)

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd "Reddit copilot"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GOOGLE_AI_API_KEY=your_google_ai_api_key
   ```

4. **Set up Supabase:**
   - Run the migration script: `supabase_migration.sql`
   - Configure Row Level Security policies
   - Set up authentication

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Build Chrome Extension:**
   ```bash
   cd chrome-extension
   powershell -ExecutionPolicy Bypass -File build.ps1
   ```

## 🚀 Usage

### Web Application

1. **Sign Up/Login:**
   - Navigate to the app
   - Create an account or sign in

2. **Brand Setup:**
   - Enter your brand website URL
   - System will automatically scrape and analyze
   - Review and edit the extracted information

3. **Define Market:**
   - Add keywords manually or let AI generate them
   - Discover relevant subreddits with AI
   - Review relevance scores

4. **Automate:**
   - Configure automation settings
   - Select subreddits or use global search
   - Set relevance score threshold
   - Start automation

### Chrome Extension

1. **Install Extension:**
   - See `chrome-extension/INSTALL.md` for detailed instructions
   - Load unpacked from `chrome-extension/build/` folder

2. **Configure:**
   - Open extension popup
   - Enter API URL and API Key
   - Click "Connect"

3. **Use:**
   - Navigate to Reddit post pages
   - Open extension popup
   - Select thread and click "Post Reply"
   - Extension will automatically post the comment

## 📁 Project Structure

```
Reddit copilot/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── (auth)/            # Authentication pages
├── components/            # React components
│   └── ui/                # Design system components
├── lib/                   # Utility functions
├── chrome-extension/      # Chrome extension
│   ├── build/            # Built extension (gitignored)
│   ├── dist/             # Distribution ZIPs (gitignored)
│   ├── content.js        # Reddit page interaction
│   ├── popup.js          # Extension popup logic
│   └── manifest.json     # Extension manifest
├── supabase_migration.sql # Database schema
└── README.md             # This file
```

## 🔧 Development

### Running Locally
```bash
npm run dev
```

### Building
```bash
npm run build
npm start
```

### Chrome Extension Development
```bash
cd chrome-extension
# Make changes to source files
# Reload extension in Chrome (chrome://extensions/)
```

## 📊 Database Schema

Key tables:
- `personas` - Brand/persona information
- `keywords` - Discovered keywords
- `subreddits` - Subreddit data with relevance scores
- `processed_threads` - Reddit threads with states (done, deleted, skip, posted)
- `ai_prompts` - Customizable AI prompts
- `automation_runs` - Automation execution history

See `supabase_migration.sql` for complete schema.

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- User authentication via Supabase Auth
- API key authentication for extension
- Secure environment variable handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

[Your License Here]

## 🙏 Acknowledgments

- Google Gemini for AI capabilities
- Supabase for backend infrastructure
- Next.js team for the amazing framework
- Reddit community for the platform

## 📧 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Note**: This tool is designed to help with Reddit marketing automation. Please use responsibly and in accordance with Reddit's Terms of Service and API guidelines.
