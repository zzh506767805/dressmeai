import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslations } from 'next-intl'
import { GetStaticProps } from 'next'
import { defaultLocale, locales as supportedLocales, type Locale } from '../i18n/config'
import { getMessages } from '../i18n/messages'
import enPages from '../messages/en/pages.json'

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

type AboutMessages = typeof enPages.about

interface AboutProps {
  content: AboutMessages
}

export default function About({ content }: AboutProps) {
  const router = useRouter()
  const locale = router.locale ?? defaultLocale
  const commonT = useTranslations('common')
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://dressmeai.com').replace(/\/$/, '')
  const pathWithoutLocale = '/about'
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

      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
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

          {/* Hero Section */}
          <section className="text-center py-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">{content.hero.title}</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">{content.hero.subtitle}</p>
          </section>

          {/* Mission Section */}
          <section className="bg-white rounded-2xl shadow-sm p-8 md:p-12 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{content.mission.title}</h2>
            <p className="text-lg text-gray-700 leading-relaxed">{content.mission.content}</p>
          </section>

          {/* Story Section */}
          <section className="bg-white rounded-2xl shadow-sm p-8 md:p-12 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{content.story.title}</h2>
            <p className="text-lg text-gray-700 leading-relaxed">{content.story.content}</p>
          </section>

          {/* Technology Section */}
          <section className="bg-indigo-600 rounded-2xl shadow-sm p-8 md:p-12 mb-12 text-white">
            <h2 className="text-3xl font-bold mb-6">{content.technology.title}</h2>
            <p className="text-lg leading-relaxed mb-8 text-indigo-100">{content.technology.content}</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {content.technology.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-indigo-300" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Values Section */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{content.values.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {content.values.items.map((value, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm p-6 text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Stats Section */}
          <section className="bg-gray-900 rounded-2xl shadow-sm p-8 md:p-12 mb-12 text-white">
            <h2 className="text-3xl font-bold mb-8 text-center">{content.stats.title}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {content.stats.items.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-indigo-400 mb-2">{stat.value}</div>
                  <div className="text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center bg-indigo-600 rounded-2xl p-12 mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">{content.cta.title}</h2>
            <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">{content.cta.description}</p>
            <Link
              href="/#ai-fashion"
              className="inline-block bg-white text-indigo-600 font-semibold px-8 py-4 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              {content.cta.button}
            </Link>
          </section>

          {/* Footer Links */}
          <footer className="text-center py-8 border-t border-gray-200">
            <div className="flex justify-center gap-6 text-gray-600">
              <Link href="/privacy" className="hover:text-indigo-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-indigo-600 transition-colors">
                Terms of Service
              </Link>
              <Link href="/faq" className="hover:text-indigo-600 transition-colors">
                FAQ
              </Link>
              <Link href="/contact" className="hover:text-indigo-600 transition-colors">
                Contact
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps<AboutProps> = async ({ locale }) => {
  const currentLocale = (locale as Locale) || defaultLocale
  const messages = getMessages(currentLocale)
  const pagesMessages = messages.pages as typeof enPages

  return {
    props: {
      messages,
      content: pagesMessages.about
    }
  }
}
