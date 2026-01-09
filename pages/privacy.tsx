import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslations } from 'next-intl'
import { GetStaticProps } from 'next'
import { defaultLocale, locales as supportedLocales, type Locale } from '../i18n/config'
import { getMessages } from '../i18n/messages'
import enLegal from '../messages/en/legal.json'

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

type PrivacyMessages = typeof enLegal.privacy
type SectionKey = keyof PrivacyMessages['sections']

interface PrivacyProps {
  content: PrivacyMessages
}

export default function Privacy({ content }: PrivacyProps) {
  const router = useRouter()
  const locale = router.locale ?? defaultLocale
  const commonT = useTranslations('common')
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://dressmeai.com').replace(/\/$/, '')
  const pathWithoutLocale = '/privacy'
  const canonicalPath = locale === defaultLocale ? pathWithoutLocale : `/${locale}${pathWithoutLocale}`
  const canonicalUrl = `${baseUrl}${canonicalPath}`
  const ogLocale = ogLocaleMap[locale] || ogLocaleMap[defaultLocale]
  const ogImageUrl = `${baseUrl}/images/og-banner.jpg`

  const alternateRefs = supportedLocales.map(code => {
    const localizedPath = code === defaultLocale ? pathWithoutLocale : `/${code}${pathWithoutLocale}`
    return {
      locale: code,
      href: `${baseUrl}${localizedPath}`
    }
  })

  const sectionOrder: SectionKey[] = [
    'introduction',
    'dataCollection',
    'dataUsage',
    'imageProcessing',
    'dataSharing',
    'cookies',
    'security',
    'rights',
    'children',
    'changes',
    'contact'
  ]

  return (
    <>
      <Head>
        <title>{content.meta.title}</title>
        <meta name="description" content={content.meta.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Favicon */}
        <link rel="icon" href="/icons/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />

        <link rel="canonical" href={canonicalUrl} />
        {alternateRefs.map(ref => (
          <link key={ref.locale} rel="alternate" hrefLang={ref.locale} href={ref.href} />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`${baseUrl}${pathWithoutLocale}`} />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="DressMeAI" />
        <meta property="og:title" content={content.meta.title} />
        <meta property="og:description" content={content.meta.description} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:locale" content={ogLocale} />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@dressmeai" />
        <meta name="twitter:title" content={content.meta.title} />
        <meta name="twitter:description" content={content.meta.description} />
        <meta name="twitter:image" content={ogImageUrl} />
      </Head>

      <div className="min-h-screen bg-gray-50">
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
                <Link href="/blog" className="text-blue-600 hover:text-blue-800 transition-colors">
                  {commonT('nav.blog')}
                </Link>
              </div>
            </nav>
          </div>

          <article className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
            <header className="mb-12 border-b border-gray-200 pb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{content.title}</h1>
              <p className="text-gray-500">{content.lastUpdated}</p>
            </header>

            <div className="prose prose-lg max-w-none">
              {sectionOrder.map(sectionKey => {
                const section = content.sections[sectionKey]
                return (
                  <section key={sectionKey} className="mb-10">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">{section.title}</h2>
                    <p className="text-gray-700 leading-relaxed mb-4">{section.content}</p>
                    {'items' in section && section.items && (
                      <ul className="list-disc pl-6 text-gray-700 space-y-2">
                        {section.items.map((item: string, index: number) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    )}
                    {'email' in section && section.email && (
                      <p className="mt-4">
                        <a
                          href={`mailto:${section.email}`}
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          {section.email}
                        </a>
                      </p>
                    )}
                  </section>
                )
              })}
            </div>

            <footer className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/terms"
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Terms of Service
                </Link>
                <span className="text-gray-300">|</span>
                <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
                  {commonT('nav.home')}
                </Link>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps<PrivacyProps> = async ({ locale }) => {
  const currentLocale = (locale as Locale) || defaultLocale
  const messages = getMessages(currentLocale)
  const legalMessages = messages.legal as typeof enLegal

  return {
    props: {
      messages,
      content: legalMessages.privacy
    }
  }
}
