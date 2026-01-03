import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, personaId, state } = body;

    if (!postId || !personaId || !state) {
      return NextResponse.json(
        { error: 'Missing required fields: postId, personaId, state' },
        { status: 400 }
      );
    }

    if (!['done', 'deleted', 'skip'].includes(state)) {
      return NextResponse.json(
        { error: 'Invalid state. Must be: done, deleted, or skip' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Get existing thread data if it exists
    const { data: existing } = await supabase
      .from('processed_threads')
      .select('subreddit, post_url, generated_response')
      .eq('persona_id', personaId)
      .eq('post_id', postId)
      .single();

    // Calculate skip expiration (14 days from now)
    const skipExpiresAt = state === 'skip' 
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Upsert the thread state
    const updateData: any = {
      persona_id: personaId,
      post_id: postId,
      state: state,
      skip_expires_at: skipExpiresAt,
      updated_at: new Date().toISOString(),
    };

    // If existing thread, preserve subreddit and post_url
    if (existing) {
      updateData.subreddit = existing.subreddit;
      updateData.post_url = existing.post_url;
      // Preserve generated_response if it exists and we're not deleting
      if (existing.generated_response && state !== 'deleted') {
        updateData.generated_response = existing.generated_response;
      }
    } else {
      // If new, we need subreddit and post_url from request
      const { subreddit, postUrl, postTitle, postContent } = body;
      if (!subreddit || !postUrl) {
        return NextResponse.json(
          { error: 'Missing subreddit or postUrl for new thread' },
          { status: 400 }
        );
      }
      updateData.subreddit = subreddit;
      updateData.post_url = postUrl;
      // Optionally save title and content if provided
      if (postTitle) updateData.post_title = postTitle;
      if (postContent) updateData.post_content = postContent;
    }

    const { data, error } = await supabase
      .from('processed_threads')
      .upsert(updateData, {
        onConflict: 'persona_id,post_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating thread state:', error);
      return NextResponse.json(
        { error: 'Failed to update thread state' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      thread: data,
    });
  } catch (error: any) {
    console.error('Error updating thread state:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update thread state' },
      { status: 500 }
    );
  }
}

