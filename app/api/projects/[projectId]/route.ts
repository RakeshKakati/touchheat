import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  allowed_domains: z.array(z.string()).optional(),
});

export async function PATCH(
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

    const body = await request.json();
    const validated = updateProjectSchema.parse(body);

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

    // Update project
    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.allowed_domains !== undefined) {
      // Normalize domains (remove protocol, trailing slashes, etc.)
      updateData.allowed_domains = validated.allowed_domains
        .map((domain) => {
          try {
            // If it's a full URL, extract hostname
            if (domain.includes('://')) {
              return new URL(domain).hostname;
            }
            // Remove trailing slashes and whitespace
            return domain.trim().replace(/\/+$/, '');
          } catch {
            // If URL parsing fails, return as-is (will be validated)
            return domain.trim();
          }
        })
        .filter((domain) => domain.length > 0);
    }

    const { data: updatedProject, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', params.projectId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      );
    }

    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Project PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

