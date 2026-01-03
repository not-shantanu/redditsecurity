import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateKeywords } from '@/lib/ai/client';
import { filterGenericKeywords } from '@/lib/utils/filter-generic';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { personaId, description, audience } = await request.json();

    if (!personaId || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      );
    }

    // Generate keywords using AI
    const { keywords, tokensUsed } = await generateKeywords(description, audience || '', apiKey);

    // Filter out generic keywords
    const filteredKeywords = filterGenericKeywords(keywords);
    
    console.log(`Generated ${keywords.length} keywords, filtered to ${filteredKeywords.length} relevant keywords`);

    // Save keywords to database
    const keywordsToInsert = filteredKeywords.map((kw) => ({
      persona_id: personaId,
      keyword: kw.keyword,
      intent: kw.intent,
      seed_weight: kw.seed_weight,
    }));

    const { error: insertError } = await supabase
      .from('keywords')
      .insert(keywordsToInsert);

    if (insertError) {
      console.error('Error inserting keywords:', insertError);
      return NextResponse.json(
        { error: 'Failed to save keywords' },
        { status: 500 }
      );
    }

    return NextResponse.json({ keywords: filteredKeywords });
  } catch (error: any) {
    console.error('Error generating keywords:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
