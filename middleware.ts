import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host')
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
