import Head from 'next/head'
import { useState, useCallback, useEffect } from 'react'
import Script from 'next/script'
import {
  SparklesIcon,
  CameraIcon,
  SwatchIcon,
  LightBulbIcon,
  StarIcon
} from '@heroicons/react/24/solid'
import Image from 'next/image'
import ImageUpload from '../components/ImageUpload'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useLocale, useTranslations } from 'next-intl'
import LanguageSwitcher from '../components/shared/LanguageSwitcher'
import { analytics, trackConversion, setUserProperties } from '../utils/analytics'
import { safeSetItem } from '../utils/localStorage'
import { defaultLocale, locales as supportedLocales, type Locale } from '../i18n/config'

type IconKey = 'camera' | 'sparkles' | 'lightBulb' | 'swatch'

type Feature = {
  name: string
  description: string
  icon: IconKey
}

type TimelineStep = {
  title: string
  description: string
  icon: IconKey
}

type Testimonial = {
  content: string
  author: string
  role: string
  rating: number
}

const iconMap: Record<IconKey, typeof CameraIcon> = {
  camera: CameraIcon,
  sparkles: SparklesIcon,
  lightBulb: LightBulbIcon,
  swatch: SwatchIcon
}

export default function Home() {
  const [modelImage, setModelImage] = useState<File | null>(null)
  const [clothingImage, setClothingImage] = useState<File | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const locale = useLocale()
  const landingT = useTranslations('landing')
  const commonT = useTranslations('common')

  const heroContent = landingT.raw('hero') as {
    headlineMain: string
    headlineAccent: string
    description: string
    primaryCta: string
    secondaryCta: string
  }

  const demoContent = landingT.raw('demo') as {
    eyebrow: string
    title: string
    model: { title: string; label: string }
    clothing: { title: string; label: string }
    generateButton: string
    generating: string
    resultTitle: string
  }

  const seoContent = landingT.raw('seo') as {
    title: string
    description: string
    keywordsPrimary: string
    keywordsSecondary: string
    ogDescription: string
    twitterTitle: string
    twitterDescription: string
    schemaDescription: string
  }

  const features = landingT.raw('features.items') as Feature[]
  const featuresContent = landingT.raw('features') as {
    eyebrow: string
    title: string
    description: string
  }

  const howItWorks = landingT.raw('howItWorks') as {
    eyebrow: string
    title: string
    steps: TimelineStep[]
  }

  const testimonials = landingT.raw('testimonials.items') as Testimonial[]
  const testimonialsContent = landingT.raw('testimonials') as {
    eyebrow: string
    title: string
  }

  const ctaContent = landingT.raw('cta') as {
    title: string
    description: string
    button: string
  }

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

  const ogLocale = ogLocaleMap[locale] || ogLocaleMap[defaultLocale]

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dressmeai.com'
  const asPath = router?.asPath || '/'
  const path = asPath.split('?')[0] || '/'
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

  // 页面加载时记录访问
  useEffect(() => {
    analytics.seo.organic_landing('home')
    setUserProperties({
      page_type: 'landing_page',
      user_segment: 'new_visitor'
    })
  }, [])



  const handleGenerate = useCallback(async () => {
    if (!modelImage || !clothingImage) {
      setError(commonT('errors.missingImages'));
      analytics.performance.error_occurred('missing_images', 'virtual_tryon')
      return;
    }

    // 跟踪虚拟试衣开始
    analytics.virtualTryOn.start()
    analytics.virtualTryOn.generate_start()
    
    setLoading(true);
    setError(null);

    try {
      // 创建支付会话
      const paymentResponse = await fetch('/api/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!paymentResponse.ok) {
        throw new Error('Failed to create payment session');
      }

      const { url: paymentUrl } = await paymentResponse.json();
      
      // 将图片数据存储在 localStorage 中
      const modelBase64 = await fileToBase64(modelImage);
      const clothingBase64 = await fileToBase64(clothingImage);
      
      // 使用安全的 localStorage 操作
      console.log('Saving images to storage...');
      console.log('Model image size:', modelBase64.length, 'chars');
      console.log('Clothing image size:', clothingBase64.length, 'chars');
      
      const modelSaved = safeSetItem('modelImage', modelBase64);
      const clothingSaved = safeSetItem('clothingImage', clothingBase64);
      
      console.log('Save results - Model:', modelSaved, 'Clothing:', clothingSaved);
      
      if (!modelSaved || !clothingSaved) {
        console.error('Failed to save images to localStorage');
        analytics.performance.error_occurred('localStorage_error', 'virtual_tryon')
      } else {
        console.log('Images successfully saved to storage');
      }
      
      // 保存时间戳，用于验证数据新鲜度
      const timestamp = Date.now().toString();
      safeSetItem('imageUploadTimestamp', timestamp);
      console.log('Saved timestamp:', timestamp);
      
      // 跟踪支付页面跳转
      trackConversion('payment_redirect')
      analytics.user.upgrade('virtual_tryon_service')
      
      // 重定向到支付页面
      window.location.href = paymentUrl;

    } catch (err) {
      console.error('Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment failed, please try again'
      setError(errorMessage);
      
      // 跟踪支付错误
      analytics.virtualTryOn.generate_error(errorMessage)
      analytics.user.payment_failed(errorMessage)
    } finally {
      setLoading(false);
    }
  }, [commonT, modelImage, clothingImage]);

  // 处理图片上传的分析跟踪
  const handleModelImageUpload = (file: File | null) => {
    setModelImage(file)
    if (file) {
      analytics.virtualTryOn.upload_person()
    }
    // 清除错误信息当用户重新上传时
    if (error) {
      setError(null)
    }
  }

  const handleClothingImageUpload = (file: File | null) => {
    setClothingImage(file)
    if (file) {
      analytics.virtualTryOn.upload_clothes()
    }
    // 清除错误信息当用户重新上传时
    if (error) {
      setError(null)
    }
  }

  // 将 fileToBase64 移到组件外部
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // 将结构化数据移到组件外部
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'DressMeAI',
    description: seoContent.schemaDescription,
    applicationCategory: 'Fashion & Style',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    featureList: features.map(feature => feature.name),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '3',
      reviewCount: '3'
    }
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col gap-4 py-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-4xl font-bold">{commonT('brand')}</h1>
        <nav className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Link
            href="/history"
            className="text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() => analytics.navigation.internal_link_click('/history')}
          >
            {commonT('nav.history')}
          </Link>
          <Link
            href="/blog"
            className="text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() => analytics.navigation.internal_link_click('/blog')}
          >
            {commonT('nav.blog')}
          </Link>
          <LanguageSwitcher />
        </nav>
      </div>

      <h2 className="text-3xl font-bold mb-8 text-center">{landingT('pageHeading')}</h2>
      
      <Head>
        <title>{seoContent.title}</title>
        <meta name="description" content={seoContent.description} />
        <meta name="keywords" content={seoContent.keywordsPrimary} />
        <meta name="keywords" content={seoContent.keywordsSecondary} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#4F46E5" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#4F46E5" />

        <link rel="canonical" href={canonicalUrl} />
        {alternateRefs.map(ref => (
          <link key={ref.locale} rel="alternate" hrefLang={ref.locale} href={ref.href} />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`${baseUrl}${pathWithoutLocale}`} />

        {/* Language and Region */}
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

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="DressMeAI" />
        <meta property="og:title" content={seoContent.title} />
        <meta property="og:description" content={seoContent.ogDescription} />
        <meta property="og:image" content="https://dressmeai.com/images/og-banner.jpg" />
        <meta property="og:url" content={canonicalUrl} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@dressmeai" />
        <meta name="twitter:creator" content="@dressmeai" />
        <meta name="twitter:title" content={seoContent.twitterTitle} />
        <meta name="twitter:description" content={seoContent.twitterDescription} />
        <meta name="twitter:image" content="https://dressmeai.com/images/og-banner.jpg" />

        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="DressMeAI Team" />
        <meta name="geo.region" content="US" />
        <meta name="geo.placename" content="United States" />
        <meta name="category" content="Fashion Technology" />
        <meta name="coverage" content="Worldwide" />
        <meta name="distribution" content="Global" />
        <meta name="rating" content="General" />

        {/* 加载优化 */}
        <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>

      {/* 添加结构化数据 */}
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <main>
        {/* AI Fashion Section - 虚拟试穿功能 - 放在第一个模块 */}
        <section id="ai-fashion" className="py-20 sm:py-28 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-lg font-semibold leading-8 tracking-wide text-indigo-600 uppercase">{demoContent.eyebrow}</h2>
              <h3 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {demoContent.title}
              </h3>
            </div>
            <div className="mx-auto mt-16 sm:mt-20">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="text-xl font-semibold mb-4">{demoContent.model.title}</h4>
                  <ImageUpload
                    label={demoContent.model.label}
                    onImageSelect={handleModelImageUpload}
                    maxSize={5}
                    acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                  />
                </div>
                
                <div>
                  <h4 className="text-xl font-semibold mb-4">{demoContent.clothing.title}</h4>
                  <ImageUpload
                    label={demoContent.clothing.label}
                    onImageSelect={handleClothingImageUpload}
                    maxSize={5}
                    acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                  />
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !modelImage || !clothingImage}
                  className={`px-6 py-3 rounded-lg text-white font-medium
                    ${loading || !modelImage || !clothingImage
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  {loading ? demoContent.generating : demoContent.generateButton}
                </button>

                {error && (
                  <p className="mt-4 text-red-500">{error}</p>
                )}
              </div>

              {resultImage && (
                <div className="mt-8">
                  <h4 className="text-xl font-semibold mb-4">{demoContent.resultTitle}</h4>
                  <div className="relative w-full h-96">
                    <Image
                      src={resultImage}
                      alt={demoContent.resultTitle}
                      fill
                      className="object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 mb-8">
                {heroContent.headlineMain}
                <br />
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">{heroContent.headlineAccent}</span>
              </h1>
              <p className="text-xl leading-relaxed text-gray-600 max-w-3xl mx-auto">
                {heroContent.description}
              </p>
              <div className="mt-12 flex items-center justify-center gap-x-8">
                <a
                  href="#ai-fashion"
                  className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors duration-200"
                >
                  {heroContent.primaryCta}
                </a>
                <a href="#features" className="text-base font-semibold leading-6 text-gray-900 hover:text-indigo-600 transition-colors duration-200">
                  {heroContent.secondaryCta} <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </section>



        {/* Features Section */}
        <section id="features" className="py-20 sm:py-28 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-lg font-semibold leading-8 tracking-wide text-indigo-600 uppercase">{featuresContent.eyebrow}</h2>
              <h3 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {featuresContent.title}
              </h3>
              <p className="mt-6 text-xl leading-relaxed text-gray-600">
                {featuresContent.description}
              </p>
            </div>
            <div className="mx-auto mt-16 sm:mt-20">
              <dl className="grid grid-cols-1 gap-12 lg:grid-cols-4">
                {features.map(feature => {
                  const Icon = iconMap[feature.icon]
                  return (
                    <div key={feature.name} className="relative">
                      <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7 text-gray-900">
                        <Icon className="h-7 w-7 flex-none text-indigo-600" aria-hidden="true" />
                        {feature.name}
                      </dt>
                      <dd className="mt-4 text-base leading-7 text-gray-600">
                        {feature.description}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 sm:py-28 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-lg font-semibold leading-8 tracking-wide text-indigo-600 uppercase">{howItWorks.eyebrow}</h2>
              <h3 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {howItWorks.title}
              </h3>
            </div>
            <div className="mx-auto mt-16 sm:mt-20">
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
                {howItWorks.steps.map(step => {
                  const Icon = iconMap[step.icon]
                  return (
                    <div className="text-center" key={step.title}>
                      <div className="flex justify-center">
                        <Icon className="h-16 w-16 text-indigo-600" />
                      </div>
                      <h4 className="mt-6 text-xl font-semibold text-gray-900">{step.title}</h4>
                      <p className="mt-4 text-base leading-relaxed text-gray-600">{step.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20 sm:py-28 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-lg font-semibold leading-8 tracking-wide text-indigo-600 uppercase">{testimonialsContent.eyebrow}</h2>
              <h3 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {testimonialsContent.title}
              </h3>
            </div>
            <div className="mx-auto mt-16 sm:mt-20 grid grid-cols-1 gap-8 lg:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <div key={`${testimonial.author}-${index}`} className="flex flex-col bg-gray-50 p-8 rounded-2xl shadow-sm">
                  <div className="flex gap-x-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <StarIcon key={`${testimonial.author}-${i}`} className="h-6 w-6 text-yellow-400" aria-hidden="true" />
                    ))}
                  </div>
                  <p className="flex-grow text-lg leading-relaxed text-gray-600">{testimonial.content}</p>
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <p className="font-semibold text-lg text-gray-900">{testimonial.author}</p>
                    <p className="text-base text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="get-started" className="py-20 sm:py-28 bg-indigo-600">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                {ctaContent.title}
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-indigo-100">
                {ctaContent.description}
              </p>
              <div className="mt-10">
                <button
                  onClick={() => {
                    const tryOnSection = document.getElementById('ai-fashion')
                    tryOnSection?.scrollIntoView({ behavior: 'smooth' })
                    analytics.navigation.internal_link_click('try_virtual_tryon')
                  }}
                  className="rounded-lg bg-white px-8 py-4 text-lg font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors duration-200"
                >
                  {ctaContent.button}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 友情链接区块 */}
      <footer className="mt-20 py-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <div className="mb-2 font-semibold text-gray-700">{commonT('footer.title')}</div>
        <div className="flex flex-wrap justify-center gap-6">
          <a
            href="https://chinesenamegenerate.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline transition-colors"
          >
            Chinesenamegenerate.com
          </a>
          <a
            href="https://dreamfinityx.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline transition-colors"
          >
            Dreamfinityx.com
          </a>
          <a
            href="https://charactereadcanon.pro"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline transition-colors"
          >
            Charactereadcanon.pro
          </a>
          <a
            href="https://elfname.pro"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline transition-colors"
          >
            Elfname.pro
          </a>
        </div>
      </footer>
    </div>
  )
}
