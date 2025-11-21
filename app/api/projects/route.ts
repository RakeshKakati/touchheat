import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    return NextResponse.json({ projects: projects || [] });
  } catch (error) {
    console.error('Projects GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createProjectSchema.parse(body);

    // Generate API key
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const apiKey = 'th_' + Buffer.from(randomBytes).toString('base64').replace(/[+/=]/g, '').slice(0, 43);

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: validated.name,
        user_id: user.id,
        api_key: apiKey,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Projects POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

