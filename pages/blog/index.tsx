import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { GetStaticProps } from 'next'
import { useRouter } from 'next/router'
import { useTranslations } from 'next-intl'
import { defaultLocale, locales as supportedLocales, type Locale } from '../../i18n/config'
import { getMessages } from '../../i18n/messages'
import enBlog from '../../messages/en/blog.json'

const ogLocaleMap: Record<string, string> = {
  en: 'en_US',
  'zh-CN': 'zh_CN',
  ko: 'ko_KR',
  ja: 'ja_JP',
  ru: 'ru_RU',
  fr: 'fr_FR',
  de: 'de_DE',
  es: 'es_ES',
  it: 'it_IT'
}

type BlogMessages = typeof enBlog
type PostMap = BlogMessages['index']['posts']

type BlogPostCard = PostMap[keyof PostMap] & { slug: string }

interface BlogIndexProps {
  posts: BlogPostCard[]
  meta: BlogMessages['index']['meta']
  hero: BlogMessages['index']['hero']
  labels: BlogMessages['index']['labels']
  cta: BlogMessages['index']['cta']
}

export default function BlogIndex({ posts, meta, hero, labels, cta }: BlogIndexProps) {
  const router = useRouter()
  const locale = router.locale ?? defaultLocale
  const commonT = useTranslations('common')

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://dressmeai.com').replace(/\/$/, '')
  const asPath = router?.asPath || '/blog'
  const path = asPath.split('?')[0] || '/blog'
  const segments = path.split('/')
  const firstSegment = segments[1]
  const hasLocalePrefix = supportedLocales.includes(firstSegment as Locale)
  const normalizedPath = hasLocalePrefix ? `/${segments.slice(2).join('/')}` : path
  const pathWithoutLocale = !normalizedPath || normalizedPath === '' ? '/' : normalizedPath
  const canonicalPath =
    locale === defaultLocale
      ? pathWithoutLocale
      : `/${locale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`
  const canonicalUrl = `${baseUrl}${canonicalPath}`
  const alternateRefs = supportedLocales.map(code => {
    const localizedPath =
      code === defaultLocale
        ? pathWithoutLocale
        : `/${code}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`
    return {
      locale: code,
      href: `${baseUrl}${localizedPath}`
    }
  })
  const ogLocale = ogLocaleMap[locale] || ogLocaleMap[defaultLocale]
  const ogImageUrl = `${baseUrl}/images/og-banner.jpg`
  const rssPath = locale === defaultLocale ? '/feed.xml' : `/${locale}/feed.xml`
  const rssUrl = `${baseUrl}${rssPath}`

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date(dateString))
    } catch {
      return dateString
    }
  }

  return (
    <>
      <Head>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta name="keywords" content={meta.keywords} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Favicon */}
        <link rel="icon" href="/icons/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />

        {/* noindex for non-English locales to avoid duplicate content issues */}
        {locale !== defaultLocale && (
          <meta name="robots" content="noindex, follow" />
        )}

        <link rel="canonical" href={canonicalUrl} />
        {alternateRefs.map(ref => (
          <link key={ref.locale} rel="alternate" hrefLang={ref.locale} href={ref.href} />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`${baseUrl}${pathWithoutLocale}`} />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="DressMeAI" />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:locale" content={ogLocale} />
        {supportedLocales
          .filter(code => code !== locale)
          .map(code => (
            <meta
              key={`og-alt-${code}`}
              property="og:locale:alternate"
              content={(ogLocaleMap[code] || ogLocaleMap[defaultLocale]).replace('-', '_')}
            />
          ))}

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@dressmeai" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={ogImageUrl} />

        <link rel="alternate" type="application/rss+xml" title="DressMeAI Blog" href={rssUrl} />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center py-4 mb-8">
          <Link href="/" className="text-4xl font-bold text-indigo-600">
            {commonT('brand')}
          </Link>
          <nav>
            <div className="space-x-6">
              <Link href="/" className="text-blue-600 hover:text-blue-800 transition-colors">
                {commonT('nav.home')}
              </Link>
              <Link href="/about" className="text-blue-600 hover:text-blue-800 transition-colors">
                {commonT('nav.about')}
              </Link>
              <Link href="/faq" className="text-blue-600 hover:text-blue-800 transition-colors">
                {commonT('nav.faq')}
              </Link>
              <Link href="/contact" className="text-blue-600 hover:text-blue-800 transition-colors">
                {commonT('nav.contact')}
              </Link>
              <Link href="/blog" className="text-blue-600 hover:text-blue-800 transition-colors">
                {commonT('nav.blog')}
              </Link>
            </div>
          </nav>
        </div>

        <header className="text-center mb-12">
          <p className="text-indigo-600 font-semibold uppercase tracking-wide">{hero.eyebrow}</p>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4 mb-4">
            {hero.title}
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">{hero.description}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {posts.map(post => (
            <article key={post.slug} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              {/* Blog Cover Image */}
              <Link href={`/blog/${post.slug}`} className="relative aspect-[16/9] overflow-hidden">
                <Image
                  src={`/images/blog/${post.slug}.png`}
                  alt={post.title}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                />
              </Link>

              <div className="p-8 flex flex-col flex-grow">
                <div className="text-sm text-gray-500 mb-4">
                  <time dateTime={post.publishDate}>{formatDate(post.publishDate)}</time>
                  <span className="mx-2">•</span>
                  <span>{post.readTime}</span>
                </div>

                <div className="flex-grow">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    <Link href={`/blog/${post.slug}`} className="hover:text-indigo-600">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="text-gray-600 leading-relaxed mb-6">{post.excerpt}</p>
                </div>

                <div className="flex justify-between items-center">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
                  >
                    {labels.readMore}
                    <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    {post.keywords.slice(0, 2).map(keyword => (
                      <span key={keyword} className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 text-center bg-indigo-600 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">{cta.title}</h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">{cta.description}</p>
          <Link
            href="/#ai-fashion"
            className="inline-block bg-white text-indigo-600 font-semibold px-8 py-4 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            {cta.button}
          </Link>
        </div>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps<BlogIndexProps> = async ({ locale }) => {
  const currentLocale = (locale as Locale) || defaultLocale
  const blogMessages = getMessages(currentLocale).blog as BlogMessages
  const postsMap = blogMessages.index.posts as PostMap

  // Only show posts that have detail page translations
  const detailPostSlugs = new Set(Object.keys(blogMessages.detail?.posts || {}))
  const posts = (Object.entries(postsMap) as [keyof PostMap, PostMap[keyof PostMap]][])
    .filter(([slug]) => detailPostSlugs.has(slug as string))
    .map(([slug, data]) => ({
      slug,
      ...data
    }))

  return {
    props: {
      posts,
      meta: blogMessages.index.meta,
      hero: blogMessages.index.hero,
      labels: blogMessages.index.labels,
      cta: blogMessages.index.cta
    }
  }
}
