// /frontend/src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Removed jose/jwtVerify and JWT_SECRET dependency as we won't verify token here

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We can log the path for debugging, but we won't try to access cookies or tokens here
  // as it's unreliable for cross-domain navigation requests in this setup.
  console.log(`Simplified Middleware: Path=${pathname}. Allowing request.`);
  console.log(`Simplified Middleware: Client-side AuthContext will handle authentication state and redirects after page load.`);

  // --- REMOVED Authentication Logic ---

  // Removed the block checking for protected routes and verifying tokens:
  /*
  const isProtectedRoute = pathname.startsWith('/dashboard');
  if (isProtectedRoute) {
    if (!token || !(await verifyToken(token))) {
        console.log("Middleware: No valid token for protected route, redirecting to login.");
        if (pathname !== '/login') {
          const url = request.nextUrl.clone();
          url.pathname = '/login';
          url.searchParams.set('redirectedFrom', pathname);
          return NextResponse.redirect(url);
        }
    }
  }
  */

  // Removed the block checking for auth pages and redirecting if logged in:
  /*
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
   if (isAuthPage && token && (await verifyToken(token))) {
    console.log("Middleware: User already logged in, redirecting to dashboard.");
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  */

  // --- /REMOVED Authentication Logic ---


  // Allow all requests matched by the 'matcher' config to proceed to the page.
  // The actual authentication check and conditional rendering/redirecting
  // will happen client-side within the AuthProvider and components using useAuth.
  return NextResponse.next();
}

// Matcher config remains the same - it defines which requests run through this middleware.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - These should NOT run through this middleware)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};