import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { posts, personaId } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load persona to get brand context
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

    // Analyze each post with AI
    const analyzedPosts = await Promise.all(
      posts.map(async (post: any) => {
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
                responseMimeType: 'application/json',
              }),
            }
          );

          if (!response.ok) {
            throw new Error('AI analysis failed');
          }

          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const analysis = JSON.parse(text);

          return {
            ...post,
            relevanceScore: analysis.relevanceScore || 0.5,
            reasoning: analysis.reasoning || '',
          };
        } catch (error) {
          console.error('Error analyzing post:', error);
          return {
            ...post,
            relevanceScore: 0.5,
            reasoning: 'Analysis failed',
          };
        }
      })
    );

    return NextResponse.json({ posts: analyzedPosts });
  } catch (error: any) {
    console.error('Error analyzing posts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze posts' },
      { status: 500 }
    );
  }
}

