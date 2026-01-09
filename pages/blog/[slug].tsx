import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { GetStaticProps, GetStaticPaths } from 'next'
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
type DetailPostMap = BlogMessages['detail']['posts']
type IndexPostMap = BlogMessages['index']['posts']

type DetailPostKey = keyof DetailPostMap
type IndexPostKey = keyof IndexPostMap

type BlogDetailPost = DetailPostMap[DetailPostKey] & { slug: string }
type BlogPostCard = IndexPostMap[IndexPostKey] & { slug: string }

interface BlogDetailProps {
  post: BlogDetailPost
  relatedPosts: BlogPostCard[]
  ogImagePath: string
  meta: {
    breadcrumb: string
    relatedTitle: string
    cta: BlogMessages['detail']['cta']
  }
}

export default function BlogPost({ post, relatedPosts, ogImagePath, meta }: BlogDetailProps) {
  const router = useRouter()
  const locale = router.locale ?? defaultLocale
  const commonT = useTranslations('common')
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://dressmeai.com').replace(/\/$/, '')
  const asPath = router?.asPath || `/blog/${post.slug}`
  const path = asPath.split('?')[0] || `/blog/${post.slug}`
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
  const ogImageUrl = `${baseUrl}${ogImagePath}`
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

  const keywordString = post.keywords.join(', ')

  return (
    <>
      <Head>
        <title>{`${post.title} | DressMeAI Blog`}</title>
        <meta name="description" content={post.description} />
        <meta name="keywords" content={keywordString} />
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

        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="DressMeAI" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
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
        <meta property="article:published_time" content={post.publishDate} />
        <meta property="article:author" content={post.author} />
        <meta property="article:tag" content={keywordString} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@dressmeai" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        <meta name="twitter:image" content={ogImageUrl} />

        <link rel="alternate" type="application/rss+xml" title="DressMeAI Blog" href={rssUrl} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.title,
              description: post.description,
              image: {
                '@type': 'ImageObject',
                url: ogImageUrl,
                width: 1200,
                height: 630
              },
              url: canonicalUrl,
              datePublished: `${post.publishDate}T09:00:00+00:00`,
              dateModified: `${post.publishDate}T09:00:00+00:00`,
              author: {
                '@type': 'Organization',
                name: post.author,
                url: 'https://dressmeai.com'
              },
              publisher: {
                '@type': 'Organization',
                name: 'DressMeAI',
                url: baseUrl,
                logo: {
                  '@type': 'ImageObject',
                  url: `${baseUrl}/icons/icon-512.png`,
                  width: 512,
                  height: 512
                }
              },
              keywords: post.keywords,
              articleSection: 'Fashion Technology',
              inLanguage: ogLocale.replace('_', '-')
            })
          }}
        />
      </Head>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
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

        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/" className="text-gray-700 hover:text-blue-600">
                {commonT('nav.home')}
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <Link href="/blog" className="ml-1 text-gray-700 hover:text-blue-600 md:ml-2">
                  {meta.breadcrumb}
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="ml-1 text-gray-500 md:ml-2 truncate">{post.title}</span>
              </div>
            </li>
          </ol>
        </nav>

        <header className="mb-12">
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <time dateTime={post.publishDate}>{formatDate(post.publishDate)}</time>
            <span className="mx-2">•</span>
            <span>{post.readTime}</span>
            <span className="mx-2">•</span>
            <span>{post.author}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">{post.title}</h1>
          <p className="text-xl text-gray-600 leading-relaxed">{post.description}</p>
          <div className="flex flex-wrap gap-2 mt-6">
            {post.keywords.map(keyword => (
              <span key={keyword} className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full">
                {keyword}
              </span>
            ))}
          </div>
        </header>

        {/* Blog Cover Image */}
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-12 shadow-lg">
          <Image
            src={`/images/blog/${post.slug}.png`}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>

        <article className="prose prose-lg prose-indigo max-w-none">
          <div
            dangerouslySetInnerHTML={{
              __html: post.content
                .split('\n\n')
                .map(paragraph => {
                  if (paragraph.startsWith('## ')) {
                    return `<h2 class="text-3xl font-bold text-gray-900 mt-12 mb-6">${paragraph.slice(3)}</h2>`
                  } else if (paragraph.startsWith('### ')) {
                    return `<h3 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">${paragraph.slice(4)}</h3>`
                  } else if (paragraph.startsWith('**') && paragraph.includes('**:')) {
                    const [title, ...content] = paragraph.split('**:')
                    return `<p class="text-gray-700 leading-relaxed mb-4"><strong class="text-gray-900">${title.slice(2)}:</strong>${content.join('**:')}</p>`
                  } else if (paragraph.trim().startsWith('-')) {
                    const items = paragraph.split('\n').filter(line => line.trim().startsWith('-'))
                    const listItems = items.map(item => `<li class="mb-2">${item.slice(1).trim()}</li>`).join('')
                    return `<ul class="list-disc pl-6 mb-6 text-gray-700">${listItems}</ul>`
                  } else if (paragraph.trim()) {
                    return `<p class="text-gray-700 leading-relaxed mb-6">${paragraph}</p>`
                  }
                  return ''
                })
                .join('')
            }}
          />
        </article>

        <div className="mt-16 pt-12 border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">{meta.relatedTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedPosts.map(relatedPost => (
              <div key={relatedPost.slug} className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  <Link href={`/blog/${relatedPost.slug}`} className="hover:text-indigo-600">
                    {relatedPost.title}
                  </Link>
                </h3>
                <p className="text-gray-600 text-sm mb-3">{relatedPost.description}</p>
                <div className="text-sm text-gray-500">
                  {formatDate(relatedPost.publishDate)} • {relatedPost.readTime}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center bg-indigo-600 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">{meta.cta.title}</h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">{meta.cta.description}</p>
          <Link
            href="/#ai-fashion"
            className="inline-block bg-white text-indigo-600 font-semibold px-8 py-4 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            {meta.cta.button}
          </Link>
        </div>
      </div>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async ({ locales }) => {
  const pathLocales = locales ?? supportedLocales

  // Generate paths only for blog posts that have translations in each language
  const paths = pathLocales.flatMap(locale => {
    const blogMessages = getMessages(locale as Locale).blog as BlogMessages
    const detailPosts = blogMessages.detail?.posts || {}
    return Object.keys(detailPosts).map(slug => ({
      params: { slug },
      locale
    }))
  })

  return {
    paths,
    fallback: false
  }
}

export const getStaticProps: GetStaticProps<BlogDetailProps> = async ({ params, locale }) => {
  const slug = params?.slug as string
  const currentLocale = (locale as Locale) || defaultLocale
  const blogMessages = getMessages(currentLocale).blog as BlogMessages
  const detailPosts = blogMessages.detail.posts as DetailPostMap

  if (!Object.prototype.hasOwnProperty.call(detailPosts, slug)) {
    return {
      notFound: true
    }
  }

  const postData = detailPosts[slug as DetailPostKey]
  let ogImagePath = '/images/og-banner.jpg'
  try {
    const { existsSync } = await import('fs')
    const pathModule = await import('path')
    const ogImageFilePath = pathModule.join(process.cwd(), 'public', 'images', 'blog', `${slug}-og.jpg`)
    if (existsSync(ogImageFilePath)) {
      ogImagePath = `/images/blog/${slug}-og.jpg`
    }
  } catch {
    ogImagePath = '/images/og-banner.jpg'
  }

  const indexPosts = blogMessages.index.posts as IndexPostMap
  const relatedPosts = (Object.entries(indexPosts) as [IndexPostKey, IndexPostMap[IndexPostKey]][])
    .filter(([key]) => key !== slug)
    .slice(0, 2)
    .map(([key, data]) => ({ slug: key, ...data }))

  return {
    props: {
      post: {
        slug,
        ...postData
      },
      relatedPosts,
      ogImagePath,
      meta: {
        breadcrumb: blogMessages.detail.breadcrumbBlog,
        relatedTitle: blogMessages.detail.relatedTitle,
        cta: blogMessages.detail.cta
      }
    }
  }
}
