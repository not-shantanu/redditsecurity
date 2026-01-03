import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId, personaId, huntMode } = await request.json();

    if (!campaignId || !personaId || !huntMode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Start the background hunt process
    // In production, you would use a queue system like BullMQ, Inngest, or Vercel Cron
    // For now, we'll trigger an immediate hunt cycle
    
    // Trigger the hunt process (this would be a background job in production)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hunt-cycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, personaId, huntMode }),
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error starting hunt:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

