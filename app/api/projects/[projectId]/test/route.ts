import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const testEventSchema = z.object({
  url: z.string().url().optional(),
});

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const validated = testEventSchema.parse(body);

    const adminSupabase = createAdminClient();

    // Create a test event
    const testUrl = validated.url || 'https://test.touchheat.app/test-page';
    const testEvent = {
      project_id: params.projectId,
      x: 200,
      y: 400,
      viewport_w: 375,
      viewport_h: 667,
      thumb_zone: 'center' as const,
      mis_tap: false,
      pressure: null,
      selector: '#test-button',
      url: testUrl,
    };

    const { data: insertedEvent, error: insertError } = await adminSupabase
      .from('touch_events')
      .insert(testEvent)
      .select()
      .single();

    if (insertError) {
      console.error('Test event insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create test event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test event created successfully',
      event: insertedEvent,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Test event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

