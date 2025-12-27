import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next()
  }

  const rawHost = req.headers.get('host') || ''
  const host = rawHost.replace(/:\d+$/, '').toLowerCase()

  if (host === 'www.dressmeai.com') {
    const redirectUrl = new URL(req.url)
    redirectUrl.host = 'dressmeai.com'
    redirectUrl.protocol = 'https:'
    return NextResponse.redirect(redirectUrl, 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|feed.xml).*)']
}
