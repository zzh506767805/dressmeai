import { MetadataRoute } from 'next'
import enBlog from '../messages/en/blog.json'

// 硬编码生产域名，确保 sitemap 中使用正确的 URL
const baseUrl = 'https://dressmeai.com'

// Non-default locales are served under a path prefix (en is at the root).
// All locales are indexable and carry hreflang alternates, so they all belong
// in the sitemap.
const altLocales = ['zh-CN', 'ko', 'ja', 'ru', 'fr', 'de', 'es', 'it']

type RouteDef = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
  lastModified?: Date
}

function localized(routes: RouteDef[]): MetadataRoute.Sitemap {
  return routes.flatMap(route => {
    const entries: MetadataRoute.Sitemap = [
      {
        url: `${baseUrl}${route.path === '/' ? '' : route.path}` || baseUrl,
        lastModified: route.lastModified ?? new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority
      }
    ]
    for (const locale of altLocales) {
      entries.push({
        url: `${baseUrl}/${locale}${route.path === '/' ? '' : route.path}`,
        lastModified: route.lastModified ?? new Date(),
        changeFrequency: route.changeFrequency,
        // Localized variants slightly below the default-locale page
        priority: Math.max(route.priority - 0.2, 0.1)
      })
    }
    return entries
  })
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = localized([
    { path: '/', changeFrequency: 'daily', priority: 1 },
    { path: '/pricing', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/blog', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/try-on', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/faq', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.3 }
  ])

  const blogPostRoutes = localized(
    Object.entries(enBlog.index.posts).map(([slug, post]) => ({
      path: `/blog/${slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      lastModified: new Date(post.publishDate)
    }))
  )

  return [...staticRoutes, ...blogPostRoutes]
}
