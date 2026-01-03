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

    // Fetch prompts
    const { data: prompts, error } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('persona_id', personaId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching prompts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch prompts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      prompts: prompts || null,
    });
  } catch (error: any) {
    console.error('Error in GET /api/ai-prompts:', error);
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
    const { personaId, analysisPrompt, replyPrompt } = body;

    if (!personaId || !analysisPrompt || !replyPrompt) {
      return NextResponse.json(
        { error: 'personaId, analysisPrompt, and replyPrompt are required' },
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

    // Upsert prompts
    const { data, error } = await supabase
      .from('ai_prompts')
      .upsert({
        persona_id: personaId,
        analysis_prompt: analysisPrompt,
        reply_prompt: replyPrompt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'persona_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving prompts:', error);
      // Check if table doesn't exist
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'ai_prompts table does not exist. Please run the database migration script.',
            code: 'TABLE_NOT_FOUND'
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Failed to save prompts: ${error.message || error.code}` },
        { status: 500 }
      );
    }

    console.log('Prompts saved successfully for persona:', personaId);

    return NextResponse.json({
      success: true,
      prompts: data,
    });
  } catch (error: any) {
    console.error('Error in POST /api/ai-prompts:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

