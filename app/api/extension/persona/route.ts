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

    // Get user's persona
    const { data: persona } = await supabase
      .from('personas')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!persona) {
      return NextResponse.json({ error: 'No persona found' }, { status: 404 });
    }

    return NextResponse.json({ personaId: persona.id });
  } catch (error: any) {
    console.error('Error getting persona:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get persona' },
      { status: 500 }
    );
  }
}

