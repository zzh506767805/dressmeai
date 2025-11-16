import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/.swa') ||
    pathname.startsWith('/.auth')
  ) {
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
  matcher: '/:path*'
}
