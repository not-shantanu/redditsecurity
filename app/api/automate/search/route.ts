import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    subreddit: string;
    author: string;
    score: number;
    url: string;
    permalink: string;
    created_utc: number;
    num_comments: number;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
    after: string | null;
  };
}

async function analyzePostRelevance(
  post: any,
  persona: any,
  apiKey: string
): Promise<{ relevanceScore: number; reasoning: string }> {
  try {
    const prompt = `Analyze this Reddit post to determine if it's relevant for our brand.

Reddit Post:
Title: ${post.title}
Content: ${post.content || 'No content'}
Subreddit: ${post.subreddit}

Brand Context:
Product: ${persona.product_name || 'N/A'}
Mission: ${persona.brand_mission || 'N/A'}
Target Audience: ${persona.target_audience || 'N/A'}
Key Features: ${persona.key_features?.join(', ') || 'N/A'}
Pain Points Addressed: ${persona.pain_points?.join(', ') || 'N/A'}

Evaluate the content for:
1. Relevance to our products/services
2. User's intent and needs
3. Potential for meaningful engagement
4. Authenticity of the request

Provide a relevance score from 0.0 to 1.0 where:
- 0.0-0.3: Not relevant (off-topic, spam, or no clear need)
- 0.4-0.6: Somewhat relevant (related topic but unclear fit)
- 0.7-1.0: Highly relevant (clear need/problem we can address)

Return ONLY a JSON object with this exact format:
{
  "relevanceScore": 0.85,
  "reasoning": "Brief explanation of why this score was given"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Google API error:', response.status, errorData);
      throw new Error(`AI analysis failed: ${errorData.error?.message || errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Try to parse as JSON (should work with responseMimeType: 'application/json')
    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch (e) {
      // Fallback: try to extract JSON from text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    return {
      relevanceScore: analysis.relevanceScore || 0.0,
      reasoning: analysis.reasoning || '',
    };
  } catch (error) {
    console.error('Error analyzing post relevance:', error);
    return { relevanceScore: 0.0, reasoning: 'Analysis failed' };
  }
}

async function fetchSubredditPosts(
  subredditName: string,
  mode: string,
  after: string | null = null
): Promise<{ posts: any[]; after: string | null }> {
  const sortMode = mode === 'hot' ? 'hot' : mode === 'rising' ? 'rising' : 'new';
  let url = `https://www.reddit.com/r/${subredditName}/${sortMode}.json?limit=100`;
  if (after) {
    url += `&after=${after}`;
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RedditFrost/1.0 (Reddit Marketing Automation Tool)',
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data: RedditResponse = await response.json();
    
    const posts = data.data.children.map((post) => ({
      id: post.data.id,
      title: post.data.title,
      content: post.data.selftext || '',
      subreddit: post.data.subreddit,
      author: post.data.author,
      score: post.data.score,
      url: `https://www.reddit.com${post.data.permalink}`,
      permalink: post.data.permalink,
      numComments: post.data.num_comments,
      createdUtc: post.data.created_utc,
    }));

    return { posts, after: data.data.after };
  } catch (error) {
    console.error(`Error fetching posts from r/${subredditName}:`, error);
    return { posts: [], after: null };
  }
}

async function fetchGlobalPosts(after: string | null = null): Promise<{ posts: any[]; after: string | null }> {
  let url = `https://www.reddit.com/r/all/new.json?limit=100`;
  if (after) {
    url += `&after=${after}`;
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RedditFrost/1.0 (Reddit Marketing Automation Tool)',
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data: RedditResponse = await response.json();
    
    const posts = data.data.children.map((post) => ({
      id: post.data.id,
      title: post.data.title,
      content: post.data.selftext || '',
      subreddit: post.data.subreddit,
      author: post.data.author,
      score: post.data.score,
      url: `https://www.reddit.com${post.data.permalink}`,
      permalink: post.data.permalink,
      numComments: post.data.num_comments,
      createdUtc: post.data.created_utc,
    }));

    return { posts, after: data.data.after };
  } catch (error) {
    console.error('Error fetching global posts:', error);
    return { posts: [], after: null };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, numPosts, subreddits, personaId, minRelevanceScore = 0.0 } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load persona for AI analysis
    const { data: persona } = await supabase
      .from('personas')
      .select('*')
      .eq('id', personaId)
      .single();

    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 });
    }

    const relevantPosts: any[] = [];
    let after: string | null = null;
    const maxIterations = 10; // Prevent infinite loops
    let iterations = 0;

    if (mode === 'subreddit' && subreddits && subreddits.length > 0) {
      // Fetch subreddit names and crawl modes from database
      const { data: subredditData } = await supabase
        .from('subreddits')
        .select('subreddit_name, crawl_mode')
        .in('id', subreddits)
        .eq('is_active', true);

      if (!subredditData || subredditData.length === 0) {
        return NextResponse.json({ error: 'No active subreddits found' }, { status: 400 });
      }

      // Search through subreddits until we have enough relevant posts
      let subredditIndex = 0;
      const subredditAfter: Record<string, string | null> = {};

      while (relevantPosts.length < numPosts && iterations < maxIterations) {
        iterations++;
        const sub = subredditData[subredditIndex % subredditData.length];
        const subKey = sub.subreddit_name;

        // Fetch next batch of posts from this subreddit
        const { posts, after: nextAfter } = await fetchSubredditPosts(
          sub.subreddit_name,
          sub.crawl_mode || 'new',
          subredditAfter[subKey] || null
        );

        if (posts.length === 0) {
          // No more posts from this subreddit, move to next
          subredditIndex++;
          if (subredditIndex >= subredditData.length) {
            break; // No more subreddits to check
          }
          continue;
        }

        subredditAfter[subKey] = nextAfter;

        // Check for already processed threads before analyzing
        const postIds = posts.map(p => p.id);
        const { data: processedThreads } = await supabase
          .from('processed_threads')
          .select('post_id, state, skip_expires_at')
          .eq('persona_id', personaId)
          .in('post_id', postIds);

        const processedMap = new Map<string, { state: string; skip_expires_at: string | null }>();
        processedThreads?.forEach(pt => {
          processedMap.set(pt.post_id, { state: pt.state, skip_expires_at: pt.skip_expires_at });
        });

        // Analyze each post with AI to get relevance score
        for (const post of posts) {
          if (relevantPosts.length >= numPosts) break;

          // Check if post is already processed
          const processed = processedMap.get(post.id);
          if (processed) {
            // Skip if done or deleted
            if (processed.state === 'done' || processed.state === 'deleted') {
              continue;
            }
            // Skip if skip hasn't expired yet
            if (processed.state === 'skip' && processed.skip_expires_at) {
              const expiresAt = new Date(processed.skip_expires_at);
              if (expiresAt > new Date()) {
                continue; // Skip hasn't expired yet
              }
            }
          }

          const analysis = await analyzePostRelevance(post, persona, apiKey);
          
          if (analysis.relevanceScore >= minRelevanceScore) {
            relevantPosts.push({
              ...post,
              relevanceScore: analysis.relevanceScore,
              reasoning: analysis.reasoning,
            });
          }
        }

        // Move to next subreddit for next iteration
        subredditIndex++;
        if (subredditIndex >= subredditData.length) {
          subredditIndex = 0; // Cycle back to first subreddit
        }
      }
    } else if (mode === 'global') {
      // Search globally until we have enough relevant posts
      while (relevantPosts.length < numPosts && iterations < maxIterations) {
        iterations++;

        const { posts, after: nextAfter } = await fetchGlobalPosts(after);

        if (posts.length === 0) {
          break; // No more posts available
        }

        after = nextAfter;

        // Check for already processed threads before analyzing
        const postIds = posts.map(p => p.id);
        const { data: processedThreads } = await supabase
          .from('processed_threads')
          .select('post_id, state, skip_expires_at')
          .eq('persona_id', personaId)
          .in('post_id', postIds);

        const processedMap = new Map<string, { state: string; skip_expires_at: string | null }>();
        processedThreads?.forEach(pt => {
          processedMap.set(pt.post_id, { state: pt.state, skip_expires_at: pt.skip_expires_at });
        });

        // Analyze each post with AI to get relevance score
        for (const post of posts) {
          if (relevantPosts.length >= numPosts) break;

          // Check if post is already processed
          const processed = processedMap.get(post.id);
          if (processed) {
            // Skip if done or deleted
            if (processed.state === 'done' || processed.state === 'deleted') {
              continue;
            }
            // Skip if skip hasn't expired yet
            if (processed.state === 'skip' && processed.skip_expires_at) {
              const expiresAt = new Date(processed.skip_expires_at);
              if (expiresAt > new Date()) {
                continue; // Skip hasn't expired yet
              }
            }
          }

          const analysis = await analyzePostRelevance(post, persona, apiKey);
          
          if (analysis.relevanceScore >= minRelevanceScore) {
            relevantPosts.push({
              ...post,
              relevanceScore: analysis.relevanceScore,
              reasoning: analysis.reasoning,
            });
          }
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid search mode or no subreddits selected' }, { status: 400 });
    }

    // Sort by relevance score (highest first)
    relevantPosts.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Limit to requested number
    const finalPosts = relevantPosts.slice(0, numPosts);

    if (finalPosts.length === 0) {
      return NextResponse.json({ 
        error: `No relevant posts found above score ${minRelevanceScore}. Try lowering the minimum relevance score or searching more posts.`,
        posts: []
      }, { status: 200 });
    }

    return NextResponse.json({ 
      posts: finalPosts,
      searched: iterations,
      found: finalPosts.length
    });
  } catch (error: any) {
    console.error('Error searching posts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search posts' },
      { status: 500 }
    );
  }
}

