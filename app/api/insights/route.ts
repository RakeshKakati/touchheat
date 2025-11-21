import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface Insight {
  type: string;
  data: any;
  score?: number;
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

    // Build base query
    let query = supabase
      .from('touch_events')
      .select('*')
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
      return NextResponse.json({ insights: [] });
    }

    type EventData = {
      mis_tap: boolean;
      thumb_zone: 'left' | 'right' | 'center' | 'unknown';
      selector: string | null;
      url: string;
      viewport_w: number;
      viewport_h: number;
      x: number;
      y: number;
    };
    const validEvents = events as EventData[];

    const insights: Insight[] = [];

    // 1. Mis-Tap Rate
    const misTapCount = validEvents.filter((e) => e.mis_tap).length;
    const misTapRate = validEvents.length > 0 ? misTapCount / validEvents.length : 0;
    insights.push({
      type: 'mis_tap_rate',
      data: {
        rate: Math.round(misTapRate * 100),
        count: misTapCount,
        total: events.length,
      },
      score: Math.round((1 - misTapRate) * 100),
    });

    // 2. Thumb Zone Distribution
    const zoneCounts = {
      left: 0,
      right: 0,
      center: 0,
      unknown: 0,
    };
    validEvents.forEach((e) => {
      zoneCounts[e.thumb_zone as keyof typeof zoneCounts]++;
    });
    const totalZones = validEvents.length;
    insights.push({
      type: 'thumb_zone_distribution',
      data: {
        left: Math.round((zoneCounts.left / totalZones) * 100),
        right: Math.round((zoneCounts.right / totalZones) * 100),
        center: Math.round((zoneCounts.center / totalZones) * 100),
        unknown: Math.round((zoneCounts.unknown / totalZones) * 100),
      },
    });

    // 3. Unreachable CTAs
    const selectorCounts = new Map<string, number>();
    const selectorViewports = new Map<string, Set<string>>();

    validEvents.forEach((e) => {
      if (e.selector) {
        selectorCounts.set(
          e.selector,
          (selectorCounts.get(e.selector) || 0) + 1
        );
        const viewportKey = `${e.viewport_w}x${e.viewport_h}`;
        if (!selectorViewports.has(e.selector)) {
          selectorViewports.set(e.selector, new Set());
        }
        selectorViewports.get(e.selector)!.add(viewportKey);
      }
    });

    const totalTaps = validEvents.length;
    const unreachableCTAs: Array<{ selector: string; tapRate: number }> = [];

    selectorCounts.forEach((count, selector) => {
      const tapRate = count / totalTaps;
      if (tapRate < 0.01 && selectorViewports.get(selector)!.size > 0) {
        unreachableCTAs.push({
          selector,
          tapRate: Math.round(tapRate * 10000) / 100,
        });
      }
    });

    unreachableCTAs.sort((a, b) => a.tapRate - b.tapRate);
    insights.push({
      type: 'unreachable_ctas',
      data: {
        ctas: unreachableCTAs.slice(0, 10),
      },
    });

    // 4. Reachability Score per page
    const pageStats = new Map<
      string,
      { events: number; avgDistance: number; viewportW: number; viewportH: number }
    >();

    validEvents.forEach((e) => {
      if (!pageStats.has(e.url)) {
        pageStats.set(e.url, {
          events: 0,
          avgDistance: 0,
          viewportW: e.viewport_w,
          viewportH: e.viewport_h,
        });
      }
      const stats = pageStats.get(e.url)!;
      stats.events++;
      // Distance from bottom-right corner (thumb natural position)
      const distance = Math.sqrt(
        Math.pow(e.x - e.viewport_w, 2) + Math.pow(e.y - e.viewport_h, 2)
      );
      const maxDistance = Math.sqrt(
        Math.pow(e.viewport_w, 2) + Math.pow(e.viewport_h, 2)
      );
      const normalizedDistance = maxDistance > 0 ? distance / maxDistance : 0;
      stats.avgDistance += normalizedDistance;
    });

    const reachabilityScores: Array<{ url: string; score: number }> = [];
    pageStats.forEach((stats, url) => {
      const avgDist = stats.avgDistance / stats.events;
      const reachability = Math.round((1 - avgDist) * 100);
      reachabilityScores.push({ url, score: reachability });
    });

    insights.push({
      type: 'reachability_scores',
      data: {
        pages: reachabilityScores,
      },
    });

    // 5. Scroll Comfort Score
    // Simplified: based on thumb zone distribution and mis-tap rate
    const centerZoneRate = zoneCounts.center / totalZones;
    const scrollComfort = Math.round(
      (centerZoneRate * 0.7 + (1 - misTapRate) * 0.3) * 100
    );
    insights.push({
      type: 'scroll_comfort_score',
      data: {
        score: scrollComfort,
      },
      score: scrollComfort,
    });

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Insights error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

