import type { GetServerSideProps } from 'next'
import { defaultLocale, type Locale } from '../i18n/config'
import { getMessages } from '../i18n/messages'

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export const getServerSideProps: GetServerSideProps = async ({ res, locale }) => {
  const currentLocale = (locale as Locale) || defaultLocale
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://dressmeai.com').replace(/\/$/, '')
  const messages = getMessages(currentLocale)
  const blog = messages.blog as any

  const postsObj = (blog?.index?.posts ?? {}) as Record<
    string,
    { title: string; description: string; publishDate: string }
  >

  const items = Object.entries(postsObj)
    .map(([slug, post]) => ({ slug, ...post }))
    .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
    .slice(0, 50)

  const localePrefix = currentLocale === defaultLocale ? '' : `/${currentLocale}`
  const channelTitle = blog?.index?.meta?.title ?? 'DressMeAI Blog'
  const channelDescription =
    blog?.index?.meta?.description ?? 'Expert insights on AI virtual try-on technology and fashion innovation.'
  const channelLink = `${baseUrl}${localePrefix}/blog`
  const selfLink = `${baseUrl}${localePrefix}/feed.xml`

  const rssXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
    `<channel>\n` +
    `<title>${escapeXml(channelTitle)}</title>\n` +
    `<link>${escapeXml(channelLink)}</link>\n` +
    `<description>${escapeXml(channelDescription)}</description>\n` +
    `<language>${escapeXml(currentLocale)}</language>\n` +
    `<atom:link href="${escapeXml(selfLink)}" rel="self" type="application/rss+xml" />\n` +
    items
      .map(item => {
        const postUrl = `${baseUrl}${localePrefix}/blog/${item.slug}`
        const pubDate = new Date(item.publishDate).toUTCString()
        return (
          `<item>\n` +
          `<title>${escapeXml(item.title)}</title>\n` +
          `<link>${escapeXml(postUrl)}</link>\n` +
          `<guid isPermaLink="true">${escapeXml(postUrl)}</guid>\n` +
          `<pubDate>${escapeXml(pubDate)}</pubDate>\n` +
          `<description>${escapeXml(item.description)}</description>\n` +
          `</item>\n`
        )
      })
      .join('') +
    `</channel>\n` +
    `</rss>\n`

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(rssXml)
  res.end()

  return { props: {} }
}

export default function FeedXml() {
  return null
}

