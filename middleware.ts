import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Check if environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // Missing env vars - just continue without auth refresh
      return response;
    }

    // Dynamically import Supabase to avoid Edge Runtime issues
    try {
      const { createServerClient } = await import('@supabase/ssr');
      
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      // Refresh session if needed (non-blocking)
      try {
        await supabase.auth.getUser();
      } catch (error) {
        // Silently fail - user might not be authenticated
      }
    } catch (importError) {
      // If Supabase import fails, continue without auth refresh
      // This prevents blocking the request
    }

    return response;
  } catch (error) {
    // If middleware fails, return a basic response to prevent blocking
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|touchheat.min.js).*)',
  ],
};

