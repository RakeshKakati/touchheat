import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';
export const maxDuration = 10;

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify project belongs to user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', params.projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Get recent events (last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: recentEvents, error: eventsError } = await supabase
      .from('touch_events')
      .select('ts, url')
      .eq('project_id', params.projectId)
      .gte('ts', twentyFourHoursAgo.toISOString())
      .order('ts', { ascending: false })
      .limit(100);

    if (eventsError) {
      console.error('Events query error:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    // Get total event count
    const { count: totalCount, error: countError } = await supabase
      .from('touch_events')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', params.projectId);

    // Get last event timestamp
    const { data: lastEvent, error: lastEventError } = await supabase
      .from('touch_events')
      .select('ts')
      .eq('project_id', params.projectId)
      .order('ts', { ascending: false })
      .limit(1)
      .single();

    // Determine status
    const now = new Date();
    const lastEventTime = lastEvent?.ts ? new Date(lastEvent.ts) : null;
    const minutesSinceLastEvent = lastEventTime
      ? Math.floor((now.getTime() - lastEventTime.getTime()) / 1000 / 60)
      : null;

    let status: 'active' | 'inactive' | 'no_data' = 'no_data';
    if (lastEventTime) {
      if (minutesSinceLastEvent! <= 5) {
        status = 'active';
      } else if (minutesSinceLastEvent! <= 60) {
        status = 'inactive'; // Recently active but not in last 5 min
      } else {
        status = 'inactive';
      }
    }

    // Get unique URLs from recent events
    const uniqueUrls = new Set(
      (recentEvents || []).map((e) => {
        try {
          const url = new URL(e.url);
          return url.origin + url.pathname;
        } catch {
          return e.url;
        }
      })
    );

    return NextResponse.json({
      status,
      lastEventTime: lastEventTime?.toISOString() || null,
      minutesSinceLastEvent,
      totalEvents: totalCount || 0,
      recentEventsCount: recentEvents?.length || 0,
      uniqueUrls: Array.from(uniqueUrls).slice(0, 10),
      isInstalled: (totalCount || 0) > 0,
    });
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

