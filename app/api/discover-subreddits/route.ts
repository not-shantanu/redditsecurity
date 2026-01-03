import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { filterGenericSubreddits, isGenericSubreddit } from '@/lib/utils/filter-generic';

export const runtime = 'edge';

interface SubredditResult {
  name: string;
  relevance_score: number;
  description?: string;
  member_count?: number;
}

async function discoverSubredditsWithAI(
  keywords: string[],
  brandDescription: string,
  targetAudience: string,
  apiKey: string
): Promise<SubredditResult[]> {
  const prompt = `You are a Reddit market research expert. Based on the provided brand information and keywords, find the most EXTREMELY RELEVANT and SPECIFIC subreddits.

Brand Description: ${brandDescription}
Target Audience: ${targetAudience}
Keywords: ${keywords.join(', ')}

CRITICAL REQUIREMENTS - AVOID GENERIC SUBREDDITS:
- DO NOT include generic subreddits like r/chatgpt, r/openai, r/artificial, r/ai, r/machinelearning, r/automation, r/technology, r/tech, r/software, r/programming, r/webdev
- DO NOT include overly broad subreddits that aren't specifically relevant to the brand
- ONLY include subreddits that are DIRECTLY and SPECIFICALLY relevant to the brand's unique value proposition, target audience, or use cases
- Focus on niche, industry-specific, or problem-specific subreddits
- Subreddits should have clear relevance to the brand's specific features, problems solved, or target users

For each relevant subreddit, provide:
- Subreddit name (without r/ prefix)
- Relevance score (0.0 to 1.0) - how relevant is this subreddit to the brand/keywords (be strict, only high relevance)
- Brief description of why it's relevant

Return a JSON array of objects with this structure:
[
  {
    "name": "subreddit_name",
    "relevance_score": 0.85,
    "description": "Brief reason why this subreddit is relevant"
  }
]

Find 15-20 EXTREMELY RELEVANT subreddits. Order them by relevance score (highest first). Only include subreddits with relevance_score >= 0.6.
Return ONLY valid JSON array, no markdown formatting.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('AI discovery failed');
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Try to extract JSON from the response
    const jsonMatch = aiText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((item: any) => ({
          name: item.name || '',
          relevance_score: item.relevance_score || 0.5,
          description: item.description || '',
        }));
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
    }
    
    return [];
  } catch (error) {
    console.error('AI discovery error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { personaId, keywords, brandDescription, targetAudience } = await request.json();

    if (!personaId) {
      return NextResponse.json({ error: 'personaId required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      );
    }

    // If keywords not provided, load from database
    let keywordsToUse = keywords;
    if (!keywordsToUse || keywordsToUse.length === 0) {
      const { data: keywordsData } = await supabase
        .from('keywords')
        .select('keyword')
        .eq('persona_id', personaId)
        .limit(20);
      
      keywordsToUse = keywordsData?.map(k => k.keyword) || [];
    }

    if (keywordsToUse.length === 0) {
      return NextResponse.json(
        { error: 'No keywords provided' },
        { status: 400 }
      );
    }

    // Load persona for brand info if not provided
    let brandDesc = brandDescription;
    let targetAud = targetAudience;
    
    if (!brandDesc || !targetAud) {
      const { data: persona } = await supabase
        .from('personas')
        .select('brand_mission, problem_description')
        .eq('id', personaId)
        .single();
      
      if (persona) {
        brandDesc = brandDesc || persona.brand_mission || '';
        targetAud = targetAud || persona.problem_description || '';
      }
    }

    // Discover subreddits using AI
    const discoveredSubreddits = await discoverSubredditsWithAI(
      keywordsToUse,
      brandDesc || '',
      targetAud || '',
      apiKey
    );

    // Filter out generic subreddits
    const filteredSubreddits = filterGenericSubreddits(discoveredSubreddits);
    
    // Also filter by relevance score (only keep >= 0.6)
    const relevantSubreddits = filteredSubreddits.filter(sub => sub.relevance_score >= 0.6);
    
    console.log(`Discovered ${discoveredSubreddits.length} subreddits, filtered to ${relevantSubreddits.length} extremely relevant subreddits`);

    // Save discovered subreddits to database
    const subredditsToInsert = relevantSubreddits.map((sub) => ({
      persona_id: personaId,
      subreddit_name: sub.name.toLowerCase().replace(/^r\//, ''),
      crawl_mode: 'new',
      is_active: sub.relevance_score >= 0.7, // Auto-activate high relevance subreddits
      relevance_score: sub.relevance_score,
    }));

    // Check for existing subreddits to avoid duplicates
    const { data: existingSubreddits } = await supabase
      .from('subreddits')
      .select('subreddit_name')
      .eq('persona_id', personaId);

    const existingNames = new Set(
      existingSubreddits?.map(s => s.subreddit_name.toLowerCase()) || []
    );

    const newSubreddits = subredditsToInsert.filter(
      s => !existingNames.has(s.subreddit_name.toLowerCase())
    );

    if (newSubreddits.length > 0) {
      const { error: insertError } = await supabase
        .from('subreddits')
        .insert(newSubreddits);

      if (insertError) {
        console.error('Error inserting subreddits:', insertError);
        // Continue anyway, return the discovered subreddits
      }
    }

    return NextResponse.json({
      subreddits: relevantSubreddits,
      saved: newSubreddits.length,
    });
  } catch (error: any) {
    console.error('Error discovering subreddits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to discover subreddits' },
      { status: 500 }
    );
  }
}

