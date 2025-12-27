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

type ContactMessages = typeof enPages.contact

interface ContactProps {
  content: ContactMessages
}

export default function Contact({ content }: ContactProps) {
  const router = useRouter()
  const locale = router.locale ?? defaultLocale
  const commonT = useTranslations('common')
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://dressmeai.com').replace(/\/$/, '')
  const pathWithoutLocale = '/contact'
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

  const channels = [
    { key: 'general', icon: '📧' },
    { key: 'support', icon: '🛠️' },
    { key: 'business', icon: '💼' },
    { key: 'press', icon: '📰' }
  ] as const

  return (
    <>
      <Head>
        <title>{content.meta.title}</title>
        <meta name="description" content={content.meta.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

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

          {/* Hero Section */}
          <section className="text-center py-12 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{content.hero.title}</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">{content.hero.subtitle}</p>
          </section>

          {/* Intro */}
          <section className="bg-white rounded-2xl shadow-sm p-8 mb-8 text-center">
            <p className="text-lg text-gray-700">{content.intro.content}</p>
          </section>

          {/* Contact Channels */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {channels.map(({ key, icon }) => {
              const channel = content.channels[key]
              return (
                <div key={key} className="bg-white rounded-2xl shadow-sm p-8 hover:shadow-md transition-shadow">
                  <div className="text-4xl mb-4">{icon}</div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{channel.title}</h2>
                  <p className="text-gray-600 mb-4">{channel.description}</p>
                  <a
                    href={`mailto:${channel.email}`}
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {channel.email}
                    <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                </div>
              )
            })}
          </section>

          {/* Social & Response Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Social */}
            <section className="bg-indigo-600 rounded-2xl shadow-sm p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">{content.social.title}</h2>
              <p className="text-indigo-100 mb-6">{content.social.description}</p>
              <div className="space-y-3">
                {content.social.platforms.map((platform, index) => (
                  <div key={index} className="flex items-center">
                    <span className="font-medium">{platform.name}:</span>
                    <span className="ml-2 text-indigo-200">{platform.handle}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Response Time */}
            <section className="bg-white rounded-2xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{content.response.title}</h2>
              <p className="text-gray-700 leading-relaxed">{content.response.content}</p>
            </section>
          </div>

          {/* Footer Links */}
          <footer className="text-center py-8 border-t border-gray-200">
            <div className="flex justify-center gap-6 text-gray-600">
              <Link href="/about" className="hover:text-indigo-600 transition-colors">
                About Us
              </Link>
              <Link href="/faq" className="hover:text-indigo-600 transition-colors">
                FAQ
              </Link>
              <Link href="/privacy" className="hover:text-indigo-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-indigo-600 transition-colors">
                Terms of Service
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps<ContactProps> = async ({ locale }) => {
  const currentLocale = (locale as Locale) || defaultLocale
  const messages = getMessages(currentLocale)
  const pagesMessages = messages.pages as typeof enPages

  return {
    props: {
      messages,
      content: pagesMessages.contact
    }
  }
}
