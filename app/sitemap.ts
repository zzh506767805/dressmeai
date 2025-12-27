import { MetadataRoute } from 'next'
import { defaultLocale, locales, type Locale } from '../i18n/config'
import enBlog from '../messages/en/blog.json'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://dressmeai.com').replace(/\/$/, '')

  const staticRoutes: Array<{
    path: string
    lastModified: Date
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
    priority: number
  }> = [
    {
      path: '/',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1
    },
    {
      path: '/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      path: '/try-on',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9
    },
    {
      path: '/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6
    },
    {
      path: '/faq',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5
    },
    {
      path: '/contact',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5
    },
    {
      path: '/privacy',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3
    },
    {
      path: '/terms',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3
    }
  ]

  const blogPostRoutes: Array<{
    path: string
    lastModified: Date
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
    priority: number
  }> = Object.entries(enBlog.index.posts).map(([slug, post]) => ({
    path: `/blog/${slug}`,
    lastModified: new Date(post.publishDate),
    changeFrequency: 'monthly',
    priority: 0.7
  }))

  const buildLocalizedPath = (path: string, locale: Locale) => {
    if (locale === defaultLocale) {
      return path
    }
    if (path === '/') {
      return `/${locale}`
    }
    return `/${locale}${path}`
  }

  return [...staticRoutes, ...blogPostRoutes].flatMap(route =>
    locales.map((localeCode: Locale) => ({
      url: `${baseUrl}${buildLocalizedPath(route.path, localeCode)}`,
      lastModified: route.lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority
    }))
  )
}
