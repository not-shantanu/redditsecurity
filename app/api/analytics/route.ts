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
      return NextResponse.json({ error: 'personaId required' }, { status: 400 });
    }

    // Get analytics data
    const { data: leads } = await supabase
      .from('lead_store')
      .select('chilly_score, tokens_spent, reply_upvotes, reply_comments, created_at')
      .eq('persona_id', personaId);

    if (!leads) {
      return NextResponse.json({ analytics: [] });
    }

    // Aggregate by date
    const analyticsByDate: Record<string, {
      date: string;
      leadsFound: number;
      repliesPosted: number;
      totalUpvotes: number;
      totalTokens: number;
    }> = {};

    leads.forEach((lead) => {
      const date = new Date(lead.created_at).toISOString().split('T')[0];
      if (!analyticsByDate[date]) {
        analyticsByDate[date] = {
          date,
          leadsFound: 0,
          repliesPosted: 0,
          totalUpvotes: 0,
          totalTokens: 0,
        };
      }

      analyticsByDate[date].leadsFound++;
      if (lead.reply_upvotes !== null) {
        analyticsByDate[date].repliesPosted++;
        analyticsByDate[date].totalUpvotes += lead.reply_upvotes || 0;
      }
      analyticsByDate[date].totalTokens += lead.tokens_spent || 0;
    });

    const analytics = Object.values(analyticsByDate).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({ analytics });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

