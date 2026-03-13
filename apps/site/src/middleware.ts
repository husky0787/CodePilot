import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import type { NextRequest } from 'next/server';
import { i18n } from './lib/i18n';

const i18nMiddleware = createI18nMiddleware(i18n);

export default function middleware(request: NextRequest) {
  // Root path serves the Cloud entry page — skip i18n redirect
  if (request.nextUrl.pathname === '/') {
    return;
  }
  return i18nMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
