import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/signin'; // Redirect to sign-in page if token is missing
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/','/users/:path*','/admin/:path*', '/customer-dashboard/:path*', '/agent-dashboard/:path*', '/supplier-dashboard/:path*'],
};
