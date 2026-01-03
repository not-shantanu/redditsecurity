# RedditFrost - Application Mindmap

## 🎯 Application Overview
```
RedditFrost - AI-Powered Reddit Marketing Automation Platform
```

---

## 📐 Architecture Layers

### 1. Frontend Layer (Next.js 14.2 + React 18.3)
```
└── Next.js App Router
    ├── Authentication Pages
    │   ├── /auth/login
    │   └── /auth/logout
    ├── Dashboard Pages
    │   ├── /dashboard (Main Dashboard)
    │   ├── /dashboard/brand-setup
    │   ├── /dashboard/discovery (Define Market)
    │   ├── /dashboard/subreddit-intelligence
    │   ├── /dashboard/ai-prompts
    │   ├── /dashboard/automate
    │   ├── /dashboard/command-center
    │   └── /dashboard/profile
    └── Design System
        ├── Microsoft Fluent Design System
        ├── Tailwind CSS 3.4
        └── Custom Components (Button, Input, Card, etc.)
```

### 2. Backend Layer (Next.js API Routes)
```
└── API Routes (/api)
    ├── Brand Analysis
    │   └── /api/scrape-brand (Web scraping + AI analysis)
    ├── Market Discovery
    │   ├── /api/generate-keywords (AI keyword generation)
    │   └── /api/discover-subreddits (AI subreddit discovery)
    ├── Automation
    │   ├── /api/automate/search (Reddit post search + AI relevance)
    │   ├── /api/automate/analyze (Post analysis)
    │   ├── /api/automate/generate-response (AI reply generation)
    │   ├── /api/automate/update-thread-state (Thread state management)
    │   └── /api/automate/runs (Automation run persistence)
    ├── AI Prompts
    │   └── /api/ai-prompts (Save/load custom prompts)
    ├── Reddit Operations
    │   ├── /api/post-to-reddit (Post replies to Reddit)
    │   └── /api/start-hunt (Launch Reddit hunt)
    └── Analytics
        └── /api/analytics (Performance metrics)
```

### 3. Database Layer (Supabase PostgreSQL)
```
└── Tables
    ├── personas (Brand/persona configuration)
    ├── keywords (Generated keywords for targeting)
    ├── subreddits (Target subreddits with relevance scores)
    ├── lead_store (Discovered Reddit posts/leads)
    ├── processed_threads (Track done/skip/deleted threads)
    ├── automation_runs (Save automation search results)
    ├── ai_prompts (Custom AI prompts per persona)
    ├── campaigns (Active marketing campaigns)
    ├── deduplication_registry (Prevent duplicate processing)
    ├── blacklist (Blocked posts/subreddits)
    └── analytics (Performance metrics)
```

### 4. External Services
```
└── Integrations
    ├── Google Gemini AI (gemini-2.0-flash-lite)
    │   ├── Keyword Generation
    │   ├── Subreddit Discovery
    │   ├── Post Relevance Analysis
    │   ├── Brand Information Extraction
    │   └── Reply Generation
    ├── Reddit API
    │   ├── Post Search (.json endpoints)
    │   ├── Comment Submission
    │   └── Rate Limiting
    └── Supabase
        ├── Authentication (Email/Password)
        ├── PostgreSQL Database
        └── Row Level Security (RLS)
```

---

## 🔄 User Flow

### Initial Setup Flow
```
1. User Registration/Login
   └── Supabase Auth
       └── Redirect to Dashboard

2. Brand Setup (/dashboard/brand-setup)
   ├── Enter Website URL
   ├── Custom Scraper (Recursive website crawling)
   │   ├── Discovers all internal links
   │   ├── Extracts content from all pages
   │   └── Saves raw scraped content to DB
   ├── AI Analysis (Gemini)
   │   ├── Extracts: Description, Target Audience
   │   ├── Extracts: Key Features, Pain Points
   │   └── Extracts: Additional Insights
   └── Save to personas table

3. Define Market (/dashboard/discovery)
   ├── Generate Keywords
   │   └── AI generates 50+ specific keywords
   │       └── Filters out generic terms
   ├── Discover Subreddits
   │   └── AI finds 15-20 relevant subreddits
   │       └── Filters by relevance_score >= 0.6
   └── Save to keywords & subreddits tables

4. Configure AI Prompts (/dashboard/ai-prompts)
   ├── Analysis Prompt (for post relevance)
   └── Reply Generation Prompt (for human-like replies)
```

### Automation Flow
```
1. Automate Page (/dashboard/automate)
   ├── Configure Settings
   │   ├── Search Mode (Subreddit-specific or Global)
   │   ├── Number of Posts to Find
   │   ├── Relevance Score Threshold
   │   └── Select Subreddits (if subreddit mode)
   │
   ├── Start Automation
   │   └── /api/automate/search
   │       ├── Fetch Reddit posts (.json API)
   │       ├── AI Analysis (relevance scoring)
   │       ├── Filter by score threshold
   │       ├── Check processed_threads (avoid duplicates)
   │       └── Return relevant posts
   │
   ├── Generate Responses
   │   └── /api/automate/generate-response
   │       ├── Use custom AI prompts
   │       ├── Generate human-like reply
   │       ├── Include subtle product mention
   │       └── Save to processed_threads (state: 'done')
   │
   └── Thread Management
       ├── Mark as Done (removes from view)
       ├── Skip (shows again in 14 days)
       └── Delete (permanently hidden)
```

---

## 🗄️ Database Schema Relationships

```
auth.users (Supabase Auth)
    │
    └── personas (1:many)
        │
        ├── keywords (1:many)
        │   └── Used for: Keyword generation, targeting
        │
        ├── subreddits (1:many)
        │   └── Used for: Subreddit discovery, monitoring
        │
        ├── lead_store (1:many)
        │   └── Used for: Storing discovered Reddit posts
        │
        ├── processed_threads (1:many)
        │   └── Used for: Tracking done/skip/deleted threads
        │
        ├── automation_runs (1:many)
        │   └── Used for: Persisting automation search results
        │
        ├── ai_prompts (1:1)
        │   └── Used for: Custom analysis & reply prompts
        │
        ├── campaigns (1:many)
        │   └── Used for: Active marketing campaigns
        │
        ├── deduplication_registry (1:many)
        │   └── Used for: Preventing duplicate processing
        │
        ├── blacklist (1:many)
        │   └── Used for: Blocked posts/subreddits
        │
        └── analytics (1:many)
            └── Used for: Performance metrics
```

---

## 🤖 AI Integration Flow

### 1. Keyword Generation
```
Input: Brand Description + Target Audience
    ↓
Gemini AI (gemini-2.0-flash-lite)
    ↓
Output: 50+ specific keywords
    ↓
Filter: Remove generic terms (ai, apps, tools, etc.)
    ↓
Save: keywords table
```

### 2. Subreddit Discovery
```
Input: Keywords + Brand Description + Target Audience
    ↓
Gemini AI (gemini-2.0-flash-lite)
    ↓
Output: 15-20 relevant subreddits with relevance scores
    ↓
Filter: relevance_score >= 0.6, remove generic subreddits
    ↓
Save: subreddits table (auto-activate if score >= 0.7)
```

### 3. Brand Analysis
```
Input: Website URL
    ↓
Custom Recursive Scraper
    ├── Discovers all internal links
    ├── Extracts content from all pages
    └── Saves raw content to DB
    ↓
Gemini AI (gemini-2.0-flash-lite)
    ├── Analyzes all scraped content
    ├── Extracts: Description (min 500 words)
    ├── Extracts: Target Audience
    ├── Extracts: Key Features (min 10)
    ├── Extracts: Pain Points Addressed
    └── Extracts: Additional Insights
    ↓
Save: personas table (website_url, target_audience, key_features, scraped_content)
```

### 4. Post Relevance Analysis
```
Input: Reddit Post (title + content) + Brand Context
    ↓
Gemini AI (using custom analysis_prompt)
    ↓
Output: Relevance Score (0.0 - 1.0)
    ├── 0.0-0.3: Not relevant
    ├── 0.4-0.6: Somewhat relevant
    └── 0.7-1.0: Highly relevant
    ↓
Filter: Only posts above user-defined threshold
```

### 5. Reply Generation
```
Input: Reddit Post + Brand Context + Custom reply_prompt
    ↓
Gemini AI (temperature: 0.9, human-like generation)
    ├── Casual, natural language
    ├── Occasional typos/spelling mistakes
    ├── Stream-of-consciousness style
    ├── Subtle product mention
    └── Short (3-4 paragraphs max)
    ↓
Output: Human-like Reddit comment
    ↓
Save: processed_threads (state: 'done')
```

---

## 🔍 Key Features Breakdown

### 1. Brand Setup
- **Purpose**: Extract comprehensive brand information from website
- **Process**:
  - Custom recursive scraper crawls entire website
  - AI analyzes all content to extract structured data
  - Persists to database for use across app
- **Output**: Description, Target Audience, Key Features, Pain Points, Insights

### 2. Define Market (Discovery)
- **Purpose**: Identify relevant keywords and subreddits
- **Process**:
  - AI generates specific, non-generic keywords
  - AI discovers highly relevant subreddits
  - Filters out generic terms (r/chatgpt, r/ai, etc.)
- **Output**: Keywords table, Subreddits table with relevance scores

### 3. Subreddit Intelligence
- **Purpose**: Monitor and analyze subreddit health
- **Features**:
  - Loads subreddits from Define Market
  - Shows subreddit metrics (members, age, activity)
  - Health scores (overall, activity, engagement, commercial, moderation)

### 4. AI Prompts
- **Purpose**: Customize AI behavior for analysis and replies
- **Features**:
  - Analysis Prompt: Customize how posts are scored
  - Reply Prompt: Customize reply generation style
  - Persists to database per persona

### 5. Automate
- **Purpose**: Automatically find and respond to relevant Reddit posts
- **Process**:
  1. Search Reddit posts (subreddit-specific or global)
  2. AI analyzes each post for relevance
  3. Filter by score threshold
  4. Generate human-like replies
  5. Track thread states (done/skip/deleted)
- **Features**:
  - Prevents duplicate processing
  - Persists results across sessions
  - Thread state management
  - Clickable links to original posts

### 6. Command Center
- **Purpose**: Launch and manage Reddit marketing campaigns
- **Features**:
  - Hunt mode selection (global/subreddit)
  - Campaign management
  - Performance tracking

### 7. Dashboard
- **Purpose**: Overview of leads and performance
- **Features**:
  - Lead statistics
  - Filtering and search
  - Lead management

### 8. Profile
- **Purpose**: User account management
- **Features**:
  - View account information
  - Edit full name
  - Account statistics

---

## 🔐 Security & Data Flow

### Authentication
```
User Login
    ↓
Supabase Auth
    ↓
Session Cookie
    ↓
Middleware (session refresh)
    ↓
Protected Routes (dashboard/*)
```

### Row Level Security (RLS)
```
All Tables
    ├── Users can only access their own data
    ├── Filtered by user_id (via personas)
    └── Policies enforce data isolation
```

### Data Persistence
```
Frontend State (Zustand)
    ↓
API Routes
    ↓
Supabase Database
    ↓
RLS Policies (enforce access control)
```

---

## 🎨 Design System

### Microsoft Fluent Design System
```
Components
├── Button (primary, secondary, success, danger, ghost)
├── Input (with Fluent styling)
├── Textarea
├── Select
├── Card (elevated, outlined variants)
├── Badge (default, success, warning, danger, info)
├── Grid (Fluent spacing tokens)
├── Tabs (Microsoft-style tabs)
├── PageContainer
├── PageHeader
└── Separator

Colors
├── ms-primary (Blue)
├── ms-neutral (Text colors)
├── ms-background (Backgrounds)
├── ms-border (Borders)
└── Fluent color tokens throughout

Typography
└── Segoe UI font family

Spacing
└── 4px base unit (Microsoft standard)
```

---

## 📊 Data Flow Examples

### Example 1: Brand Analysis
```
User enters: "https://charmup.website"
    ↓
/api/scrape-brand
    ├── Custom scraper crawls all pages
    ├── Extracts content from each page
    └── Saves raw content to DB
    ↓
Gemini AI analyzes all content
    ↓
Extracts structured data
    ↓
Saves to personas table
    ↓
Frontend displays results
    ↓
User can edit and save changes
```

### Example 2: Automation Run
```
User configures automation
    ├── Search mode: Subreddit
    ├── Number of posts: 10
    ├── Score threshold: 0.7
    └── Selected subreddits: [r/anxiety, r/mentalhealth]
    ↓
/api/automate/search
    ├── Fetches posts from Reddit (.json)
    ├── For each post:
    │   ├── AI analyzes relevance
    │   ├── Checks processed_threads (avoid duplicates)
    │   └── Filters by threshold
    └── Returns relevant posts
    ↓
Frontend displays posts
    ↓
/api/automate/generate-response
    ├── Uses custom reply_prompt
    ├── Generates human-like reply
    └── Saves to processed_threads (state: 'done')
    ↓
User marks thread as "done"
    ├── Removes from view
    └── Prevents future discovery
```

---

## 🔄 State Management

### Frontend State (Zustand)
```
usePersonaStore
└── persona (current brand/persona)
    ├── Loaded from database
    └── Used across dashboard pages
```

### Database State
```
All data persisted in Supabase
├── Brand data (personas)
├── Keywords & Subreddits
├── Automation runs
├── AI prompts
└── Thread states
```

---

## 🚀 Key Technologies

```
Frontend
├── Next.js 14.2 (App Router)
├── React 18.3
├── TypeScript 5.4.5
├── Tailwind CSS 3.4
├── Zustand 4.5 (State management)
├── Sonner 1.5 (Toast notifications)
├── Framer Motion 11.0 (Animations)
└── Lucide React 0.400 (Icons)

Backend
├── Next.js API Routes
├── Node.js Runtime
└── Edge Runtime (some routes)

Database
├── Supabase (PostgreSQL)
├── Row Level Security (RLS)
└── Real-time capabilities

AI
└── Google Gemini (gemini-2.0-flash-lite)

External APIs
├── Reddit JSON API
└── Google Generative AI API
```

---

## 📝 Notes

1. **Generic Content Filtering**: System filters out generic keywords/subreddits (r/chatgpt, r/ai, etc.) to focus on highly relevant content.

2. **Duplicate Prevention**: `processed_threads` table tracks thread states to prevent finding the same posts multiple times.

3. **Persistence**: All automation runs, prompts, and brand data persist across sessions.

4. **Human-like Replies**: AI generates casual, natural-sounding replies with occasional typos and subtle product mentions.

5. **Custom Scraping**: Recursive scraper discovers all internal links and extracts comprehensive content from entire websites.

6. **Microsoft Fluent Design**: Entire UI follows Microsoft Fluent Design System guidelines for consistency.

---

## 🎯 Core Workflow Summary

```
1. User Setup
   Brand Setup → Define Market → Configure AI Prompts

2. Automation
   Configure Settings → Search Posts → Analyze Relevance → Generate Replies → Manage Threads

3. Monitoring
   Dashboard → Subreddit Intelligence → Analytics
```

---

*Last Updated: 2024*
*Version: 2.0.0*

