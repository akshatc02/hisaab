import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const cookie = request.cookies.get('hisaab_session');
  const { pathname } = request.nextUrl;

  if (pathname === '/login') {
    if (cookie) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }

  if (!cookie) return NextResponse.redirect(new URL('/login', request.url));

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
