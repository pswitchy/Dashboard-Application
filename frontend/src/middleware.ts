import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; // Using jose for JWT verification on edge

const JWT_SECRET = process.env.JWT_SECRET; // Ensure JWT_SECRET is in your .env/.env.local

// Function to verify JWT using jose
async function verifyToken(token: string): Promise<boolean> {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not set in environment variables.');
    return false;
  }
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    await jwtVerify(token, secret);
    // console.log("Middleware: Token verified successfully");
    return true;
  } catch (error) {
    // console.error('Middleware: Token verification failed:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tokenCookie = request.cookies.get('authToken'); // Check cookie first (if you decide to use them)
  let token = tokenCookie?.value;

  // If not in cookie, try Authorization header (less common for middleware, but possible)
  // Note: Headers might not be easily accessible or reliable in middleware depending on context
  // const authHeader = request.headers.get('authorization');
  // if (!token && authHeader?.startsWith('Bearer ')) {
  //   token = authHeader.split(' ')[1];
  // }

  // HACKY WORKAROUND (Not Recommended for Production): Check localStorage via a client-side redirect/check.
  // Middleware runs server-side/edge, cannot access localStorage.
  // The AuthContext handles client-side checks, but middleware protects the route *before* client loads.
  // A common pattern is using HttpOnly cookies for tokens to make them accessible server-side.
  // Since this example uses localStorage, true protection relies on client-side redirects + API protection.
  // This middleware provides a basic layer, assuming the token *might* be in a cookie.

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isProtectedRoute = pathname.startsWith('/dashboard'); // Define protected routes

  console.log(`Middleware: Path=${pathname}, Token found=${!!token}`);

  // If trying to access a protected route without a valid token
  if (isProtectedRoute) {
    if (!token || !(await verifyToken(token))) {
        console.log("Middleware: No valid token for protected route, redirecting to login.");
      // Prevent infinite redirect loop if already on login
      if (pathname !== '/login') {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirectedFrom', pathname); // Optional: add redirect info
        return NextResponse.redirect(url);
      }
    }
  }

  // If logged in (valid token exists) and trying to access login/signup
  if (isAuthPage && token && (await verifyToken(token))) {
    console.log("Middleware: User already logged in, redirecting to dashboard.");
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Allow the request to proceed
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    // Explicitly include root if needed, otherwise the above covers it if not excluded
    // '/',
  ],
};