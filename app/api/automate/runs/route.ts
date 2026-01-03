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
    const runId = searchParams.get('runId');
    const latest = searchParams.get('latest') === 'true';

    if (!personaId) {
      return NextResponse.json({ error: 'personaId is required' }, { status: 400 });
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

    // Fetch specific run
    if (runId) {
      const { data: run, error } = await supabase
        .from('automation_runs')
        .select('*')
        .eq('id', runId)
        .eq('persona_id', personaId)
        .single();

      if (error) {
        console.error('Error fetching run:', error);
        return NextResponse.json(
          { error: 'Failed to fetch run' },
          { status: 500 }
        );
      }

      return NextResponse.json({ run });
    }

    // Fetch latest run or all runs
    let query = supabase
      .from('automation_runs')
      .select('*')
      .eq('persona_id', personaId)
      .order('created_at', { ascending: false });

    if (latest) {
      query = query.limit(1);
    }

    const { data: runs, error } = await query;

    if (error) {
      console.error('Error fetching runs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch runs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      runs: latest ? (runs && runs.length > 0 ? runs[0] : null) : runs || [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/automate/runs:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { personaId, searchMode, numPosts, scoreThreshold, selectedSubreddits, results } = body;

    if (!personaId || !searchMode || numPosts === undefined || scoreThreshold === undefined || !results) {
      return NextResponse.json(
        { error: 'Missing required fields: personaId, searchMode, numPosts, scoreThreshold, results' },
        { status: 400 }
      );
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

    // Save automation run
    const { data, error } = await supabase
      .from('automation_runs')
      .insert({
        persona_id: personaId,
        search_mode: searchMode,
        num_posts: numPosts,
        score_threshold: scoreThreshold,
        selected_subreddits: selectedSubreddits || [],
        results: results,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving automation run:', error);
      return NextResponse.json(
        { error: 'Failed to save automation run' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      run: data,
    });
  } catch (error: any) {
    console.error('Error in POST /api/automate/runs:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

