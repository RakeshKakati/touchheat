import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';
export const maxDuration = 10;

const BUCKET_SIZE = 20;

interface HeatmapPoint {
  x: number;
  y: number;
  count: number;
  intensity: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const url = searchParams.get('url');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing project_id parameter' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Build query
    let query = supabase
      .from('touch_events')
      .select('x, y, viewport_w, viewport_h')
      .eq('project_id', projectId);

    if (url) {
      query = query.eq('url', url);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ heatmap: [], maxCount: 0 });
    }

    // Cluster events into 20px buckets
    const buckets = new Map<string, number>();

    type EventData = { x: number; y: number; viewport_w: number; viewport_h: number };
    const validEvents = events as EventData[];

    for (const event of validEvents) {
      const bucketX = Math.floor(event.x / BUCKET_SIZE) * BUCKET_SIZE;
      const bucketY = Math.floor(event.y / BUCKET_SIZE) * BUCKET_SIZE;
      const key = `${bucketX},${bucketY}`;
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }

    // Convert to array and normalize
    const maxCount = Math.max(...Array.from(buckets.values()));
    const heatmap: HeatmapPoint[] = Array.from(buckets.entries()).map(
      ([key, count]) => {
        const [x, y] = key.split(',').map(Number);
        return {
          x,
          y,
          count,
          intensity: maxCount > 0 ? count / maxCount : 0,
        };
      }
    );

    return NextResponse.json({ heatmap, maxCount });
  } catch (error) {
    console.error('Heatmap error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

