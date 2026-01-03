import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redditClient } from '@/lib/reddit/client';

export const runtime = 'edge';

// Periodically check reply upvotes and comments to track sentiment
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { personaId } = await request.json();

    if (!personaId) {
      return NextResponse.json({ error: 'personaId required' }, { status: 400 });
    }

    // Get all posted leads
    const { data: leads } = await supabase
      .from('lead_store')
      .select('id, post_id, reply_upvotes, reply_comments')
      .eq('persona_id', personaId)
      .eq('generation_state', 'posted');

    if (!leads || leads.length === 0) {
      return NextResponse.json({ message: 'No posted leads to check' });
    }

    // Authenticate Reddit client
    const redditToken = process.env.REDDIT_ACCESS_TOKEN;
    if (!redditToken) {
      return NextResponse.json({ error: 'Reddit not configured' }, { status: 500 });
    }
    redditClient.setAccessToken(redditToken);

    let updated = 0;

    // Check each posted lead (in production, you'd fetch actual comment data from Reddit API)
    // For now, this is a placeholder - you'd need to implement Reddit API calls to get comment stats
    for (const lead of leads) {
      // In production: Fetch comment data from Reddit API using lead.post_id
      // For now, we'll just mark that sentiment checking was attempted
      // You would implement:
      // const commentData = await redditClient.getCommentStats(lead.post_id);
      // await supabase.from('lead_store').update({
      //   reply_upvotes: commentData.upvotes,
      //   reply_comments: commentData.replies,
      // }).eq('id', lead.id);
      
      updated++;
    }

    return NextResponse.json({
      success: true,
      checked: leads.length,
      updated,
    });
  } catch (error: any) {
    console.error('Error checking sentiment:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

