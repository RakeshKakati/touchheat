import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const ingestSchema = z.object({
  project_id: z.string().uuid(),
  events: z.array(
    z.object({
      x: z.number().int().min(0),
      y: z.number().int().min(0),
      viewport_w: z.number().int().positive(),
      viewport_h: z.number().int().positive(),
      thumb_zone: z.enum(['left', 'right', 'center', 'unknown']),
      mis_tap: z.boolean(),
      pressure: z.number().nullable(),
      selector: z.string().nullable(),
      url: z.string(),
    })
  ),
});

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ingestSchema.parse(body);

    const supabase = createAdminClient();

    // Verify project exists and get allowed domains
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, allowed_domains')
      .eq('id', validated.project_id)
      .single();

    type ProjectData = { id: string; allowed_domains: string[] | null };
    const projectData = project as ProjectData | null;

    if (projectError || !projectData) {
      return NextResponse.json(
        { error: 'Invalid project_id' },
        { status: 401 }
      );
    }

    // Verify domain if allowed_domains is configured
    if (projectData.allowed_domains && projectData.allowed_domains.length > 0) {
      // Extract domain from Origin header or from event URLs
      const origin = request.headers.get('origin');
      let requestDomain: string | null = null;

      if (origin) {
        try {
          const originUrl = new URL(origin);
          requestDomain = originUrl.hostname;
        } catch {
          // Invalid origin header
        }
      }

      // If no origin, try to extract from first event URL
      if (!requestDomain && validated.events.length > 0) {
        try {
          const eventUrl = new URL(validated.events[0].url);
          requestDomain = eventUrl.hostname;
        } catch {
          // Invalid URL in event
        }
      }

      if (!requestDomain) {
        return NextResponse.json(
          { error: 'Unable to verify domain' },
          { status: 403 }
        );
      }

      // Check if domain is allowed (exact match or subdomain)
      const isAllowed = projectData.allowed_domains.some((allowedDomain) => {
        // Exact match
        if (requestDomain === allowedDomain) return true;
        // Subdomain match (e.g., www.example.com matches example.com)
        if (requestDomain.endsWith('.' + allowedDomain)) return true;
        return false;
      });

      if (!isAllowed) {
        return NextResponse.json(
          { error: 'Domain not allowed for this project' },
          { status: 403 }
        );
      }
    }

    // Insert events
    const events = validated.events.map((event) => ({
      project_id: validated.project_id,
      x: event.x,
      y: event.y,
      viewport_w: event.viewport_w,
      viewport_h: event.viewport_h,
      thumb_zone: event.thumb_zone,
      mis_tap: event.mis_tap,
      pressure: event.pressure,
      selector: event.selector,
      url: event.url,
    }));

    const { error: insertError } = await supabase
      .from('touch_events')
      .insert(events as any);

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to insert events' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Ingest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

