import { MetadataRoute } from 'next'
import { defaultLocale, locales, type Locale } from '../i18n/config'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://dressmeai.com'

  const coreRoutes: Array<{
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
      path: '/try-on',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9
    },
    {
      path: '/history',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7
    },
    {
      path: '/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      path: '/blog/ai-virtual-try-on-technology-revolutionizing-fashion',
      lastModified: new Date('2025-06-15'),
      changeFrequency: 'monthly',
      priority: 0.7
    },
    {
      path: '/blog/best-ai-clothing-try-on-apps-software-2025',
      lastModified: new Date('2025-06-12'),
      changeFrequency: 'monthly',
      priority: 0.7
    },
    {
      path: '/blog/virtual-try-on-technology-reduces-return-rates',
      lastModified: new Date('2025-06-10'),
      changeFrequency: 'monthly',
      priority: 0.7
    },
    {
      path: '/blog/ai-fashion-technology-future-online-shopping',
      lastModified: new Date('2025-06-08'),
      changeFrequency: 'monthly',
      priority: 0.7
    }
  ]

  const buildLocalizedPath = (path: string, locale: Locale) => {
    if (locale === defaultLocale) {
      return path
    }
    if (path === '/') {
      return `/${locale}`
    }
    return `/${locale}${path}`
  }

  return coreRoutes.flatMap(route =>
    locales.map((localeCode: Locale) => ({
      url: `${baseUrl}${buildLocalizedPath(route.path, localeCode)}`,
      lastModified: route.lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority
    }))
  )
}
