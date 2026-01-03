// Reddit API Client
// Note: Reddit API requires authentication. You'll need to set up OAuth or use a service account.

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  url: string;
  permalink: string;
  created_utc: number;
  num_comments: number;
  score: number;
  is_self: boolean;
}

export interface RedditSearchParams {
  query: string;
  subreddit?: string;
  sort?: 'relevance' | 'hot' | 'top' | 'new';
  limit?: number;
  after?: string;
}

class RedditClient {
  private accessToken: string | null = null;
  private userAgent: string;

  constructor(userAgent: string = 'RedditFrost/2.0') {
    this.userAgent = userAgent;
  }

  async authenticate(clientId: string, clientSecret: string, username: string, password: string): Promise<void> {
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error('Reddit authentication failed');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  private async makeRequest(endpoint: string, params?: Record<string, string>): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Call authenticate() or setAccessToken() first.');
    }

    const url = new URL(`https://oauth.reddit.com${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': this.userAgent,
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async searchPosts(params: RedditSearchParams): Promise<{ posts: RedditPost[]; after?: string }> {
    const endpoint = params.subreddit
      ? `/r/${params.subreddit}/search`
      : '/search';
    
    const searchParams: Record<string, string> = {
      q: params.query,
      sort: params.sort || 'relevance',
      limit: String(params.limit || 25),
      restrict_sr: params.subreddit ? 'true' : 'false',
      type: 'link',
    };

    if (params.after) {
      searchParams.after = params.after;
    }

    const data = await this.makeRequest(endpoint, searchParams);
    
    if (!data?.data?.children) {
      return { posts: [], after: undefined };
    }

    const posts: RedditPost[] = data.data.children.map((child: any) => ({
      id: child.data.id,
      title: child.data.title,
      selftext: child.data.selftext || '',
      author: child.data.author,
      subreddit: child.data.subreddit,
      url: child.data.url,
      permalink: `https://reddit.com${child.data.permalink}`,
      created_utc: child.data.created_utc,
      num_comments: child.data.num_comments,
      score: child.data.score,
      is_self: child.data.is_self,
    }));

    return {
      posts,
      after: data.data.after,
    };
  }

  async getSubredditPosts(
    subreddit: string,
    sort: 'new' | 'rising' | 'hot' = 'new',
    limit: number = 25,
    after?: string
  ): Promise<{ posts: RedditPost[]; after?: string }> {
    const searchParams: Record<string, string> = {
      limit: String(limit),
    };

    if (after) {
      searchParams.after = after;
    }

    const data = await this.makeRequest(`/r/${subreddit}/${sort}`, searchParams);
    
    if (!data?.data?.children) {
      return { posts: [], after: undefined };
    }

    const posts: RedditPost[] = data.data.children.map((child: any) => ({
      id: child.data.id,
      title: child.data.title,
      selftext: child.data.selftext || '',
      author: child.data.author,
      subreddit: child.data.subreddit,
      url: child.data.url,
      permalink: `https://reddit.com${child.data.permalink}`,
      created_utc: child.data.created_utc,
      num_comments: child.data.num_comments,
      score: child.data.score,
      is_self: child.data.is_self,
    }));

    return {
      posts,
      after: data.data.after,
    };
  }

  async submitComment(postId: string, text: string): Promise<{ success: boolean; commentId?: string }> {
    const response = await fetch('https://oauth.reddit.com/api/comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: new URLSearchParams({
        thing_id: `t3_${postId}`,
        text,
        api_type: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit comment');
    }

    const data = await response.json();
    
    if (data.json?.errors?.length > 0) {
      throw new Error(data.json.errors[0][1]);
    }

    return {
      success: true,
      commentId: data.json?.data?.things?.[0]?.data?.id,
    };
  }
}

export const redditClient = new RedditClient();

