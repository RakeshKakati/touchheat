import { NextResponse, type NextRequest } from 'next/server';

// Minimal middleware that simply passes through requests. We intentionally
// avoid importing any Node-specific modules so this can run safely on the Edge.
export function middleware(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|touchheat.min.js).*)',
  ],
};

