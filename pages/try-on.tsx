import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { defaultLocale, locales as supportedLocales, type Locale } from '../i18n/config'

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

export default function TryOn() {
  const router = useRouter()
  const locale = router.locale ?? defaultLocale
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://dressmeai.com').replace(/\/$/, '')
  const pathWithoutLocale = '/try-on'
  const canonicalPath = locale === defaultLocale ? pathWithoutLocale : `/${locale}${pathWithoutLocale}`
  const canonicalUrl = `${baseUrl}${canonicalPath}`
  const ogLocale = ogLocaleMap[locale] || ogLocaleMap[defaultLocale]
  const alternateRefs = supportedLocales.map(code => {
    const localizedPath = code === defaultLocale ? pathWithoutLocale : `/${code}${pathWithoutLocale}`
    return {
      locale: code,
      href: `${baseUrl}${localizedPath}`
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Virtual Try-On | DressMeAI</title>
        <meta name="description" content="Try on clothes virtually with our AI-powered technology. See exactly how outfits will look on you before you buy." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <link rel="canonical" href={canonicalUrl} />
        {alternateRefs.map(ref => (
          <link key={ref.locale} rel="alternate" hrefLang={ref.locale} href={ref.href} />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`${baseUrl}${pathWithoutLocale}`} />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="DressMeAI" />
        <meta property="og:title" content="Virtual Try-On | DressMeAI" />
        <meta
          property="og:description"
          content="Try on clothes virtually with our AI-powered technology. See exactly how outfits will look on you before you buy."
        />
        <meta property="og:image" content="https://dressmeai.com/images/og-banner.jpg" />
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
        <meta name="twitter:title" content="Virtual Try-On | DressMeAI" />
        <meta
          name="twitter:description"
          content="Try on clothes virtually with our AI-powered technology. See exactly how outfits will look on you before you buy."
        />
        <meta name="twitter:image" content="https://dressmeai.com/images/og-banner.jpg" />
        
        {/* Favicon and App Icons */}
        <link rel="icon" href="/icons/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon.ico" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
        
        {/* PWA Settings */}
        <meta name="application-name" content="DressMeAI" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DressMeAI" />
        <meta name="theme-color" content="#4F46E5" />
      </Head>

      <main>
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <div className="flex items-center">
                <Link 
                  href="/"
                  className="flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Virtual Try-On
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Experience the future of fashion with our AI-powered virtual try-on technology. Upload your photos and see how clothes look on you instantly.
              </p>
              
              <div className="mt-10">
                <Link 
                  href="/"
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors duration-200"
                >
                  Try Now
                </Link>
              </div>

              {/* Feature Preview */}
              <div className="mt-20">
                <h2 className="text-2xl font-semibold text-gray-900">
                  What to Expect
                </h2>
                <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900">Realistic Try-On</h3>
                    <p className="mt-2 text-gray-600">See exactly how clothes will look on you with our advanced AI technology.</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900">Multiple Angles</h3>
                    <p className="mt-2 text-gray-600">View outfits from different angles to make confident decisions.</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900">Mix & Match</h3>
                    <p className="mt-2 text-gray-600">Try different combinations to create your perfect outfit.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 
