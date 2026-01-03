import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const personaId = searchParams.get('personaId');

    if (!personaId) {
      return NextResponse.json({ error: 'Missing personaId' }, { status: 400 });
    }

    // Verify persona belongs to user
    const { data: persona } = await supabase
      .from('personas')
      .select('id')
      .eq('id', personaId)
      .eq('user_id', user.id)
      .single();

    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    // Get all processed threads
    const { data: processedThreads } = await supabase
      .from('processed_threads')
      .select('*')
      .eq('persona_id', personaId)
      .order('updated_at', { ascending: false })
      .limit(200);

    if (!processedThreads) {
      return NextResponse.json({ threads: [] });
    }

    // Convert to extension format
    const threads = processedThreads.map(pt => ({
      id: pt.post_id,
      title: pt.post_title || `Post in r/${pt.subreddit}`,
      content: pt.post_content || '',
      subreddit: pt.subreddit || 'unknown',
      url: pt.post_url || '',
      generatedResponse: pt.generated_response || undefined,
      responseGenerated: !!pt.generated_response,
      threadState: pt.state as 'done' | 'deleted' | 'skip',
      skipExpiresAt: pt.skip_expires_at,
    }));

    return NextResponse.json({ threads });
  } catch (error: any) {
    console.error('Error getting threads:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get threads' },
      { status: 500 }
    );
  }
}

