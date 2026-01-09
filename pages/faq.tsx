import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
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

type FAQMessages = typeof enPages.faq
type CategoryKey = keyof FAQMessages['categories']

interface FAQProps {
  content: FAQMessages
}

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
}

function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div className="border-b border-gray-200">
      <button
        className="w-full py-5 text-left flex justify-between items-center hover:text-indigo-600 transition-colors"
        onClick={onClick}
      >
        <span className="text-lg font-medium text-gray-900 pr-8">{question}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-5 text-gray-600 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}

export default function FAQ({ content }: FAQProps) {
  const router = useRouter()
  const locale = router.locale ?? defaultLocale
  const commonT = useTranslations('common')
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://dressmeai.com').replace(/\/$/, '')
  const pathWithoutLocale = '/faq'
  const canonicalPath = locale === defaultLocale ? pathWithoutLocale : `/${locale}${pathWithoutLocale}`
  const canonicalUrl = `${baseUrl}${canonicalPath}`
  const ogLocale = ogLocaleMap[locale] || ogLocaleMap[defaultLocale]
  const ogImageUrl = `${baseUrl}/images/og-banner.jpg`

  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const alternateRefs = supportedLocales.map(code => {
    const localizedPath = code === defaultLocale ? pathWithoutLocale : `/${code}${pathWithoutLocale}`
    return {
      locale: code,
      href: `${baseUrl}${localizedPath}`
    }
  })

  const categoryOrder: CategoryKey[] = ['general', 'howItWorks', 'privacy', 'technical', 'business']

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

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: categoryOrder.flatMap(catKey =>
                content.categories[catKey].items.map(item => ({
                  '@type': 'Question',
                  name: item.question,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.answer
                  }
                }))
              )
            })
          }}
        />
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

          {/* FAQ Categories */}
          <div className="space-y-8">
            {categoryOrder.map(categoryKey => {
              const category = content.categories[categoryKey]
              return (
                <section key={categoryKey} className="bg-white rounded-2xl shadow-sm p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">{category.title}</h2>
                  <div>
                    {category.items.map((item, index) => {
                      const itemKey = `${categoryKey}-${index}`
                      return (
                        <FAQItem
                          key={itemKey}
                          question={item.question}
                          answer={item.answer}
                          isOpen={openItems[itemKey] || false}
                          onClick={() => toggleItem(itemKey)}
                        />
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>

          {/* CTA Section */}
          <section className="text-center bg-indigo-600 rounded-2xl p-12 mt-12">
            <h2 className="text-3xl font-bold text-white mb-4">{content.cta.title}</h2>
            <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">{content.cta.description}</p>
            <Link
              href="/contact"
              className="inline-block bg-white text-indigo-600 font-semibold px-8 py-4 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              {content.cta.button}
            </Link>
          </section>

          {/* Footer Links */}
          <footer className="text-center py-8 mt-8 border-t border-gray-200">
            <div className="flex justify-center gap-6 text-gray-600">
              <Link href="/about" className="hover:text-indigo-600 transition-colors">
                About Us
              </Link>
              <Link href="/privacy" className="hover:text-indigo-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-indigo-600 transition-colors">
                Terms of Service
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

export const getStaticProps: GetStaticProps<FAQProps> = async ({ locale }) => {
  const currentLocale = (locale as Locale) || defaultLocale
  const messages = getMessages(currentLocale)
  const pagesMessages = messages.pages as typeof enPages

  return {
    props: {
      messages,
      content: pagesMessages.faq
    }
  }
}
