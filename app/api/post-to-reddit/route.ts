import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redditClient } from '@/lib/reddit/client';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId, postId, reply } = await request.json();

    if (!leadId || !postId || !reply) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Authenticate Reddit client
    const redditToken = process.env.REDDIT_ACCESS_TOKEN;
    if (!redditToken) {
      return NextResponse.json({ error: 'Reddit not configured' }, { status: 500 });
    }
    redditClient.setAccessToken(redditToken);

    // Post to Reddit
    const result = await redditClient.submitComment(postId, reply);

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to post to Reddit' }, { status: 500 });
    }

    // Update lead state
    await supabase
      .from('lead_store')
      .update({
        generation_state: 'posted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    return NextResponse.json({ success: true, commentId: result.commentId });
  } catch (error: any) {
    console.error('Error posting to Reddit:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

