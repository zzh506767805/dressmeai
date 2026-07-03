import Head from 'next/head'
import { useState, useCallback, useEffect, useRef } from 'react'
import Script from 'next/script'
import {
  SparklesIcon,
  CameraIcon,
  SwatchIcon,
  LightBulbIcon,
  StarIcon,
  ShoppingBagIcon,
  PencilSquareIcon,
  BuildingStorefrontIcon,
  UserGroupIcon
} from '@heroicons/react/24/solid'
import Image from 'next/image'
import ImageUpload from '../components/ImageUpload'
import EzoicAd from '../components/EzoicAd'
import EzoicAdsInit from '../components/EzoicAdsInit'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useLocale, useTranslations } from 'next-intl'
import LanguageSwitcher from '../components/shared/LanguageSwitcher'
import UserMenu from '../components/UserMenu'
import { useSession, signIn } from 'next-auth/react'
import { analytics, trackConversion, trackEvent, setUserProperties } from '../utils/analytics'
import { safeSetItem, safeGetItem, safeRemoveItem } from '../utils/localStorage'
import { defaultLocale, locales as supportedLocales, type Locale } from '../i18n/config'
import { GARMENTS, garmentAbsoluteUrl, type Garment } from '../lib/garments'

// Generation input: a freshly uploaded image (base64) or an already-hosted one (URL)
type ImageInput = { b64?: string; url?: string }

const toImageInput = (value: string): ImageInput =>
  value.startsWith('http') ? { url: value } : { b64: value }

type IconKey = 'camera' | 'sparkles' | 'lightBulb' | 'swatch'
type UseCaseIconKey = 'shoppingBag' | 'pencilSquare' | 'storefront' | 'userGroup'

type Feature = {
  name: string
  description: string
  icon: IconKey
}

type UseCase = {
  title: string
  description: string
  image: string
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

const useCaseIconMap: Record<UseCaseIconKey, typeof CameraIcon> = {
  shoppingBag: ShoppingBagIcon,
  pencilSquare: PencilSquareIcon,
  storefront: BuildingStorefrontIcon,
  userGroup: UserGroupIcon
}

export default function Home() {
  const [modelImage, setModelImage] = useState<File | null>(null)
  const [clothingImage, setClothingImage] = useState<File | null>(null)
  const [selectedModelUrl, setSelectedModelUrl] = useState<string | null>(null)
  const [savedModels, setSavedModels] = useState<{ id: string; imageUrl: string }[]>([])
  const [clothingTab, setClothingTab] = useState<'upload' | 'gallery'>('upload')
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [resultJobId, setResultJobId] = useState<string | null>(null)
  const [resultWatermarked, setResultWatermarked] = useState(false)
  const [showUpsell, setShowUpsell] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generationStep, setGenerationStep] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()
  const abortRef = useRef(false)
  const router = useRouter()
  const locale = useLocale()
  const landingT = useTranslations('landing')
  const commonT = useTranslations('common')
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://dressmeai.com').replace(/\/$/, '')

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

  const tryOnT = landingT.raw('tryOnExtras') as {
    savedModelsTitle: string
    uploadTab: string
    galleryTab: string
    galleryHint: string
    freeBadge: string
    signInToGenerate: string
    creditsRemaining: string
    getMoreCredits: string
    tryAnother: string
    downloadResult: string
    watermarkNote: string
    refundNote: string
    upsell: {
      title: string
      description: string
      featureHd: string
      featureNoWatermark: string
      featureHistory: string
      payCta: string
      plansCta: string
      laterCta: string
    }
    garments: Record<string, string>
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

  const keywordMeta = [seoContent.keywordsPrimary, seoContent.keywordsSecondary].filter(Boolean).join(', ')

  const features = landingT.raw('features.items') as Feature[]
  const featuresContent = landingT.raw('features') as {
    eyebrow: string
    title: string
    description: string
  }

  const seoGuide = landingT.raw('seoGuide') as {
    title: string
    sections: Array<{
      heading: string
      paragraphs: string[]
    }>
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

  type StatItem = {
    value: string
    label: string
  }

  type FaqItem = {
    question: string
    answer: string
  }

  const statsContent = landingT.raw('stats') as {
    eyebrow: string
    title: string
    items: StatItem[]
  }

  const faqContent = landingT.raw('faq') as {
    eyebrow: string
    title: string
    items: FaqItem[]
  }

  const latestBlogContent = landingT.raw('latestBlog') as {
    eyebrow: string
    title: string
    description: string
    readMore: string
    viewAll: string
  }

  type ShowcaseItem = {
    title: string
    description: string
  }

  type FeatureWithImage = {
    name: string
    description: string
    icon: IconKey
    image: string
  }

  const showcaseContent = landingT.raw('showcase') as {
    eyebrow: string
    title: string
    description: string
    note: string
    primaryCta: string
    secondaryCta: string
    beforeAfter: {
      title: string
      description: string
      beforeLabel: string
      afterLabel: string
      items: ShowcaseItem[]
    }
    gallery: {
      title: string
      description: string
      items: ShowcaseItem[]
    }
  }

  const useCasesContent = landingT.raw('useCases') as {
    eyebrow: string
    title: string
    description: string
    items: UseCase[]
  }

  const featuresWithImages = landingT.raw('features.items') as FeatureWithImage[]

  // Get blog posts for latest blog section
  const blogT = useTranslations('blog')
  type BlogPostMeta = {
    title: string
    description: string
    publishDate: string
    readTime: string
    excerpt: string
  }
  const blogPosts = blogT.raw('index.posts') as Record<string, BlogPostMeta>
  const latestPosts = Object.entries(blogPosts)
    .sort(([, a], [, b]) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
    .slice(0, 3)
    .map(([slug, post]) => ({ slug, ...post }))

  const [openFaqItems, setOpenFaqItems] = useState<Record<number, boolean>>({})

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

  // Load the user's saved model photos for one-click reuse
  const loadSavedModels = useCallback(async () => {
    if (!session?.user) {
      setSavedModels([])
      return
    }
    try {
      const res = await fetch('/api/user/model-images')
      if (res.ok) {
        const data = await res.json()
        setSavedModels(data.images || [])
      }
    } catch {}
  }, [session?.user])

  useEffect(() => {
    loadSavedModels()
  }, [loadSavedModels])

  // Core generation flow: resolve image URLs (uploading if needed), call AI, poll result
  const runGeneration = useCallback(async (model: ImageInput, clothing: ImageInput) => {
    abortRef.current = false;
    let jobId: string | null = null;

    const updateJob = (data: Record<string, string>) =>
      jobId
        ? fetch('/api/update-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId, ...data }),
          }).catch(() => {})
        : Promise.resolve();

    const resolveImageUrl = async (input: ImageInput, saveAsModel = false): Promise<string> => {
      if (input.url) return input.url;
      const upRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: input.b64, ...(saveAsModel ? { saveAsModel: true } : {}) }),
      });
      if (!upRes.ok) throw new Error('Failed to upload image');
      const { url } = await upRes.json();
      return url;
    };

    setGenerationStep('Checking credits...');
    const creditRes = await fetch('/api/use-credit', { method: 'POST' });
    if (!creditRes.ok) {
      const data = await creditRes.json();
      throw new Error(data.message || 'Failed to use credit');
    }
    const creditData = await creditRes.json();
    jobId = creditData.jobId;

    setGenerationStep('Uploading model image...');
    const modelUrl = await resolveImageUrl(model, true);

    if (abortRef.current) return;

    setGenerationStep('Uploading clothing image...');
    const clothingUrl = await resolveImageUrl(clothing);

    if (abortRef.current) return;

    setGenerationStep('Initializing virtual try-on...');
    // tryon verifies the job (credit deducted, owned by us) and records the
    // taskId + image URLs server-side
    const tryonRes = await fetch('/api/tryon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, modelImageUrl: modelUrl, clothingImageUrl: clothingUrl }),
    });
    if (!tryonRes.ok) throw new Error('Failed to start try-on process');

    let retryCount = 0;
    const maxRetries = 20;
    while (retryCount < maxRetries && !abortRef.current) {
      setGenerationStep('Generating try-on result...');
      await new Promise(r => setTimeout(r, 5000));
      const statusRes = await fetch(`/api/status?jobId=${jobId}`);
      const statusData = await statusRes.json();

      if (statusData.status === 'SUCCEEDED' && statusData.imageUrl) {
        setResultImage(statusData.imageUrl);
        setResultJobId(jobId);
        setResultWatermarked(!!statusData.watermarked);
        if (statusData.watermarked) setShowUpsell(true);
        analytics.virtualTryOn.generate_success();
        loadSavedModels();
        return;
      } else if (statusData.status === 'FAILED') {
        throw new Error('Try-on generation failed');
      }
      retryCount++;
    }
    if (!abortRef.current) {
      updateJob({ status: 'FAILED', errorMessage: 'Generation timed out' });
      throw new Error('Generation timed out');
    }
  }, [loadSavedModels]);

  // Auto-generate after single payment redirect
  useEffect(() => {
    const pending = typeof window !== 'undefined' && localStorage.getItem('pendingGeneration');
    if (!pending) return;
    localStorage.removeItem('pendingGeneration');

    const mStored = safeGetItem('modelImage');
    const cStored = safeGetItem('clothingImage');
    if (!mStored || !cStored) return;

    setLoading(true);
    setError(null);
    setResultImage(null);
    setResultJobId(null);
    setResultWatermarked(false);
    runGeneration(toImageInput(mStored), toImageInput(cStored))
      .then(() => {
        safeRemoveItem('modelImage');
        safeRemoveItem('clothingImage');
        safeRemoveItem('imageUploadTimestamp');
      })
      .catch((err: Error) => {
        setError(err.message || 'Generation failed');
      })
      .finally(() => {
        setLoading(false);
        setGenerationStep('');
      });
  }, [runGeneration]);

  // Current inputs as storable strings (base64 for uploads, URL for presets/saved)
  const getInputStrings = useCallback(async (): Promise<{ model: string; clothing: string } | null> => {
    const model = modelImage
      ? await fileToBase64(modelImage)
      : selectedModelUrl;
    const clothing = clothingImage
      ? await fileToBase64(clothingImage)
      : selectedGarment
      ? garmentAbsoluteUrl(selectedGarment)
      : null;
    if (!model || !clothing) return null;
    return { model, clothing };
  }, [modelImage, clothingImage, selectedModelUrl, selectedGarment]);

  const handleGenerate = useCallback(async () => {
    const inputs = await getInputStrings();
    if (!inputs) {
      setError(commonT('errors.missingImages'));
      analytics.performance.error_occurred('missing_images', 'virtual_tryon')
      return;
    }

    // Must be logged in
    if (!session?.user) {
      // Save images before redirect so they persist after login
      safeSetItem('modelImage', inputs.model);
      safeSetItem('clothingImage', inputs.clothing);
      safeSetItem('imageUploadTimestamp', Date.now().toString());
      signIn('google');
      return;
    }

    analytics.virtualTryOn.start()
    analytics.virtualTryOn.generate_start()
    setLoading(true);
    setError(null);
    setResultImage(null);
    setResultJobId(null);
    setResultWatermarked(false);

    try {
      // Check credits
      const creditCheck = await fetch('/api/check-credits');
      const creditData = await creditCheck.json();

      if (creditData.hasCredits) {
        // Has credits: generate directly (no localStorage needed)
        await runGeneration(toImageInput(inputs.model), toImageInput(inputs.clothing));
        // Clean up any stale localStorage images
        safeRemoveItem('modelImage');
        safeRemoveItem('clothingImage');
        safeRemoveItem('imageUploadTimestamp');
      } else {
        // No credits: save images to localStorage for after payment, then go to pricing
        safeSetItem('modelImage', inputs.model);
        safeSetItem('clothingImage', inputs.clothing);
        safeSetItem('imageUploadTimestamp', Date.now().toString());
        router.push('/pricing');
      }
    } catch (err) {
      console.error('Generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Generation failed, please try again';
      setError(errorMessage);
      analytics.virtualTryOn.generate_error(errorMessage)
    } finally {
      setLoading(false);
      setGenerationStep('');
    }
  }, [commonT, getInputStrings, session, router, runGeneration]);

  // Unlock HD: persist current inputs, then send the user through the $1 checkout.
  // After payment, /success re-runs the generation without watermark (user is no longer free).
  const handleUpsellPay = useCallback(async () => {
    analytics.user.upgrade('single_unlock');
    try {
      const inputs = await getInputStrings();
      if (inputs) {
        safeSetItem('modelImage', inputs.model);
        safeSetItem('clothingImage', inputs.clothing);
        safeSetItem('imageUploadTimestamp', Date.now().toString());
      }
      const res = await fetch('/api/create-payment', { method: 'POST' });
      const data = await res.json();
      if (!data.url) throw new Error('No checkout URL');
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to start checkout, please try again');
      setShowUpsell(false);
    }
  }, [getInputStrings]);

  const handleSelectSavedModel = (url: string) => {
    setSelectedModelUrl(url);
    setModelImage(null);
    trackEvent('saved_model_select', 'virtual_tryon');
    if (error) setError(null);
  };

  const handleSelectGarment = (garment: Garment) => {
    setSelectedGarment(garment);
    setClothingImage(null);
    trackEvent('garment_gallery_select', 'virtual_tryon', garment.id);
    if (error) setError(null);
  };

  // 处理图片上传的分析跟踪
  const handleModelImageUpload = (file: File | null) => {
    setModelImage(file)
    if (file) {
      setSelectedModelUrl(null)
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
      setSelectedGarment(null)
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
    featureList: features.map(feature => feature.name)
  }

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqContent.items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  }

	  return (
	    <div className="container mx-auto px-4">
	      <div className="flex flex-col gap-4 py-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
	        <Link
	          href="/"
	          className="text-4xl font-bold text-indigo-600"
	          onClick={() => analytics.navigation.internal_link_click('/')}
	        >
	          {commonT('brand')}
	        </Link>
	        <nav className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <a
            href="#ai-fashion"
            className="text-blue-600 hover:text-blue-800 transition-colors font-medium"
            onClick={() => analytics.navigation.internal_link_click('#ai-fashion')}
          >
            {heroContent.primaryCta}
          </a>
          <Link
            href="/blog"
            className="text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() => analytics.navigation.internal_link_click('/blog')}
          >
            {commonT('nav.blog')}
          </Link>
          <Link
            href="/account"
            className="text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() => analytics.navigation.internal_link_click('/account')}
          >
            {commonT('nav.history')}
          </Link>
          <LanguageSwitcher />
          <UserMenu />
        </nav>
	      </div>

	      <Head>
	        <title>{seoContent.title}</title>
	        <meta name="description" content={seoContent.description} />
	        {keywordMeta ? <meta name="keywords" content={keywordMeta} /> : null}
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
      <Script
        id="faq-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      {/* Initialize Ezoic Ad Placements */}
      <EzoicAdsInit placementIds={[101, 102, 103]} />

      <main>
        {/* Hero Section with Try-On Feature */}
        <section id="ai-fashion" className="relative px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
          <div className="mx-auto max-w-7xl">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
                {heroContent.headlineMain}
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text ml-2">
                  {heroContent.headlineAccent}
                </span>
              </h1>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                {heroContent.description}
              </p>
              {!session && (
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600/10 to-purple-600/10 ring-1 ring-indigo-200 px-4 py-1.5 text-sm font-semibold text-indigo-700">
                  <SparklesIcon className="w-4 h-4" />
                  {tryOnT.freeBadge}
                </div>
              )}
            </div>

            {/* Try-On Interface */}
            <div className="grid lg:grid-cols-3 gap-6 items-start">
              {/* Upload Model */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h4 className="text-lg font-semibold mb-4 flex items-center justify-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">1</span>
                  {demoContent.model.title}
                </h4>
                {selectedModelUrl ? (
                  <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-50 border-2 border-green-300">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedModelUrl}
                      alt={demoContent.model.title}
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => setSelectedModelUrl(null)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                      aria-label="Clear"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <ImageUpload
                    label={demoContent.model.label}
                    onImageSelect={handleModelImageUpload}
                    maxSize={5}
                    acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                  />
                )}
                {savedModels.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">{tryOnT.savedModelsTitle}</p>
                    <div className="flex gap-2">
                      {savedModels.map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleSelectSavedModel(m.imageUrl)}
                          className={`relative w-16 h-20 rounded-lg overflow-hidden transition-all ${
                            selectedModelUrl === m.imageUrl
                              ? 'ring-2 ring-indigo-600 ring-offset-2'
                              : 'ring-1 ring-gray-200 hover:ring-indigo-400'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.imageUrl} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Clothing */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h4 className="text-lg font-semibold mb-4 flex items-center justify-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">2</span>
                  {demoContent.clothing.title}
                </h4>
                <div className="flex rounded-lg bg-gray-100 p-1 mb-4">
                  <button
                    onClick={() => setClothingTab('upload')}
                    className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                      clothingTab === 'upload' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tryOnT.uploadTab}
                  </button>
                  <button
                    onClick={() => setClothingTab('gallery')}
                    className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                      clothingTab === 'gallery' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tryOnT.galleryTab}
                  </button>
                </div>
                {clothingTab === 'upload' ? (
                  <div>
                    {selectedGarment && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                        <span className="font-medium">{tryOnT.garments[selectedGarment.nameKey]}</span>
                        <button
                          onClick={() => setSelectedGarment(null)}
                          className="ml-auto text-indigo-400 hover:text-indigo-600"
                          aria-label="Clear"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <ImageUpload
                      key={selectedGarment ? `garment-${selectedGarment.id}` : 'upload'}
                      label={demoContent.clothing.label}
                      onImageSelect={handleClothingImageUpload}
                      maxSize={5}
                      acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">{tryOnT.galleryHint}</p>
                    <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                      {GARMENTS.map(garment => (
                        <button
                          key={garment.id}
                          onClick={() => handleSelectGarment(garment)}
                          className={`group relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-50 transition-all ${
                            selectedGarment?.id === garment.id
                              ? 'ring-2 ring-indigo-600 ring-offset-1'
                              : 'ring-1 ring-gray-200 hover:ring-indigo-400'
                          }`}
                          title={tryOnT.garments[garment.nameKey]}
                        >
                          <Image
                            src={garment.image}
                            alt={tryOnT.garments[garment.nameKey]}
                            fill
                            sizes="120px"
                            className="object-cover"
                          />
                          {selectedGarment?.id === garment.id && (
                            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Result / Showcase */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h4 className="text-lg font-semibold mb-4 flex items-center justify-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">3</span>
                  {demoContent.resultTitle}
                </h4>
                {resultImage ? (
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
                    <Image
                      src={resultImage}
                      alt={demoContent.resultTitle}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
                    <Image
                      src="/images/landing/hero-showcase.jpg"
                      alt="AI Virtual Try-On Showcase"
                      fill
                      className="object-cover opacity-60"
                      priority
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <p className="text-white text-center px-4 font-medium">{heroContent.description}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Generate Button */}
            <div className="mt-8 text-center">
              <button
                onClick={handleGenerate}
                disabled={loading || (!modelImage && !selectedModelUrl) || (!clothingImage && !selectedGarment)}
                className={`px-10 py-4 rounded-xl text-lg font-semibold text-white shadow-lg transition-all duration-200
                  ${loading || (!modelImage && !selectedModelUrl) || (!clothingImage && !selectedGarment)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-xl hover:-translate-y-0.5'
                  }`}
              >
                {loading ? demoContent.generating : demoContent.generateButton}
              </button>
              {!loading && (modelImage || selectedModelUrl) && (clothingImage || selectedGarment) && (
                <p className="mt-2 text-sm text-gray-500">
                  {!session
                    ? tryOnT.signInToGenerate
                    : session.user.credits > 0
                    ? tryOnT.creditsRemaining.replace('{count}', String(session.user.credits))
                    : <Link href="/pricing" className="text-indigo-600 hover:underline">{tryOnT.getMoreCredits}</Link>
                  }
                </p>
              )}
              {loading && generationStep && (
                <div className="mt-4">
                  <div className="flex justify-center items-center space-x-2 mb-2">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
                  </div>
                  <p className="text-sm text-gray-600">{generationStep}</p>
                </div>
              )}
              {error && (
                <div className="mt-4">
                  <p className="text-red-500">{error}</p>
                  {session && (error.includes('failed') || error.includes('timed out')) && (
                    <p className="mt-1 text-sm text-gray-500">{tryOnT.refundNote}</p>
                  )}
                </div>
              )}
            </div>

            {/* Result Display (for logged-in users generating inline) */}
            {resultImage && (
              <div className="mt-8 text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{demoContent.resultTitle}</h3>
                <div className="relative w-full max-w-md mx-auto aspect-[3/4] rounded-xl overflow-hidden shadow-lg">
                  <Image
                    src={resultImage}
                    alt="Try-on Result"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                {resultWatermarked && (
                  <p className="mt-3 text-sm text-gray-500">
                    {tryOnT.watermarkNote}{' '}
                    <button onClick={() => setShowUpsell(true)} className="text-indigo-600 font-medium hover:underline">
                      {tryOnT.upsell.payCta}
                    </button>
                  </p>
                )}
                <div className="mt-4 flex items-center justify-center gap-3">
                  {resultJobId && (
                    <a
                      href={`/api/download-result?jobId=${resultJobId}`}
                      onClick={() => analytics.virtualTryOn.save_result()}
                      className="px-6 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      {tryOnT.downloadResult}
                    </a>
                  )}
                  <button
                    onClick={() => { setResultImage(null); setResultJobId(null); setResultWatermarked(false); setClothingImage(null); setSelectedGarment(null); setClothingTab('gallery'); }}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {tryOnT.tryAnother}
                  </button>
                </div>
              </div>
            )}

            {/* Upsell modal after a watermarked (free) generation */}
            {showUpsell && resultImage && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={() => setShowUpsell(false)}
              >
                <div
                  className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600">
                      <SparklesIcon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-gray-900">{tryOnT.upsell.title}</h3>
                    <p className="mt-2 text-sm text-gray-600">{tryOnT.upsell.description}</p>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-gray-700">
                    {[tryOnT.upsell.featureHd, tryOnT.upsell.featureNoWatermark, tryOnT.upsell.featureHistory].map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 space-y-2">
                    <button
                      onClick={handleUpsellPay}
                      className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all"
                    >
                      {tryOnT.upsell.payCta}
                    </button>
                    <Link
                      href="/pricing"
                      onClick={() => analytics.user.upgrade('upsell_plans')}
                      className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      {tryOnT.upsell.plansCta}
                    </Link>
                    <button
                      onClick={() => setShowUpsell(false)}
                      className="w-full py-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {tryOnT.upsell.laterCta}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Ezoic Ad Placement 101 */}
        <div className="py-4 flex justify-center">
          <EzoicAd placementId={101} />
        </div>

        {/* Stats Section */}
        <section id="stats" className="py-20 sm:py-28 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-lg font-semibold leading-8 tracking-wide text-indigo-600 uppercase">{statsContent.eyebrow}</h2>
              <h3 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {statsContent.title}
              </h3>
            </div>
            <div className="mx-auto mt-16 sm:mt-20">
              <dl className="grid grid-cols-2 gap-8 lg:grid-cols-4">
                {statsContent.items.map((stat, index) => (
                  <div key={index} className="flex flex-col items-center bg-white p-8 rounded-2xl shadow-sm">
                    <dt className="text-5xl font-bold text-indigo-600">{stat.value}</dt>
                    <dd className="mt-4 text-lg font-medium text-gray-600">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Showcase Section */}
        <section id="showcase" className="py-20 sm:py-28 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-lg font-semibold leading-8 tracking-wide text-indigo-600 uppercase">{showcaseContent.eyebrow}</h2>
              <h3 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {showcaseContent.title}
              </h3>
              <p className="mt-6 text-xl leading-relaxed text-gray-600">
                {showcaseContent.description}
              </p>
            </div>

            <div className="mx-auto mt-16 sm:mt-20 space-y-16">
              <div>
                <div className="max-w-3xl">
                  <h4 className="text-2xl font-bold text-gray-900">{showcaseContent.beforeAfter.title}</h4>
                  <p className="mt-3 text-lg text-gray-600">{showcaseContent.beforeAfter.description}</p>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
                  {[
                    { image: '/images/landing/before-after-casual.jpg', key: 'casual' },
                    { image: '/images/landing/before-after-business.jpg', key: 'business' },
                    { image: '/images/landing/before-after-evening.jpg', key: 'evening' }
                  ].map((showcase, index) => {
                    const item = showcaseContent.beforeAfter.items[index]
                    return (
                      <div
                        key={showcase.key}
                        className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-300"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <Image
                            src={showcase.image}
                            alt={item?.title || showcase.key}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-6">
                            <span className="inline-block px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-semibold text-gray-900">
                              {item?.title || showcase.key}
                            </span>
                          </div>
                        </div>
                        {item && (
                          <div className="p-6">
                            <p className="text-gray-600 leading-relaxed">{item.description}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-3xl">
                    <h4 className="text-2xl font-bold text-gray-900">{showcaseContent.gallery.title}</h4>
                    <p className="mt-3 text-lg text-gray-600">{showcaseContent.gallery.description}</p>
                  </div>
                  <a
                    href="#ai-fashion"
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-indigo-500 hover:shadow-xl transition-all duration-200"
                  >
                    {showcaseContent.primaryCta}
                    <span className="ml-2" aria-hidden="true">→</span>
                  </a>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
                  {[
                    { image: '/images/landing/feature-tryon.jpg', key: 'tryon' },
                    { image: '/images/landing/feature-style-ai.jpg', key: 'style-ai' },
                    { image: '/images/landing/feature-mixmatch.jpg', key: 'mixmatch' }
                  ].map((gallery, index) => {
                    const item = showcaseContent.gallery.items[index]
                    return (
                      <div
                        key={gallery.key}
                        className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-300"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <Image
                            src={gallery.image}
                            alt={item?.title || gallery.key}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        {item && (
                          <div className="p-6">
                            <h5 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h5>
                            <p className="text-gray-600 leading-relaxed">{item.description}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <p className="mt-10 text-sm text-gray-500 text-center">{showcaseContent.note}</p>

                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <a
                    href="#ai-fashion"
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors duration-200"
                  >
                    {showcaseContent.primaryCta}
                  </a>
                  <Link
                    href="/blog"
                    className="inline-flex items-center justify-center rounded-lg border border-indigo-600 px-6 py-3 text-base font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors duration-200"
                    onClick={() => analytics.navigation.internal_link_click('/blog')}
                  >
                    {showcaseContent.secondaryCta}
                    <span className="ml-2" aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section id="use-cases" className="py-20 sm:py-28 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-lg font-semibold leading-8 tracking-wide text-indigo-600 uppercase">{useCasesContent.eyebrow}</h2>
              <h3 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {useCasesContent.title}
              </h3>
            </div>

            <div className="mx-auto mt-16 sm:mt-20 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {useCasesContent.items.map((item, index) => (
                <div
                  key={index}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <h4 className="text-lg font-bold text-gray-900">{item.title}</h4>
                    <p className="mt-2 text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
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
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {featuresWithImages.map((feature, index) => (
                  <div
                    key={index}
                    className="group relative bg-gray-50 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={feature.image}
                        alt={feature.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h4 className="text-lg font-bold text-white">{feature.name}</h4>
                      <p className="mt-1 text-sm text-white/80">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Ezoic Ad Placement 102 */}
        <div className="py-4 flex justify-center bg-gray-50">
          <EzoicAd placementId={102} />
        </div>

        {/* SEO Guide Section — Virtual Try-On Rich Content */}
        <section id="virtual-try-on-guide" className="py-20 sm:py-28 bg-gray-50">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl text-center mb-16">
              {seoGuide.title}
            </h2>
            <div className="space-y-12">
              {seoGuide.sections.map((section, index) => (
                <div key={index}>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">{section.heading}</h3>
                  {section.paragraphs.map((paragraph, pIndex) => (
                    <p key={pIndex} className="text-base leading-relaxed text-gray-600 mb-4">{paragraph}</p>
                  ))}
                </div>
              ))}
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

        {/* FAQ Section */}
        <section id="faq" className="py-20 sm:py-28 bg-white">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-lg font-semibold leading-8 tracking-wide text-indigo-600 uppercase">{faqContent.eyebrow}</h2>
              <h3 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {faqContent.title}
              </h3>
            </div>
            <div className="mx-auto mt-16 sm:mt-20">
              <dl className="space-y-4">
                {faqContent.items.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl overflow-hidden">
                    <dt>
                      <button
                        onClick={() => setOpenFaqItems(prev => ({ ...prev, [index]: !prev[index] }))}
                        className="flex w-full items-center justify-between px-6 py-5 text-left"
                      >
                        <span className="text-lg font-semibold text-gray-900">{item.question}</span>
                        <span className="ml-6 flex-shrink-0">
                          <svg
                            className={`h-6 w-6 text-indigo-600 transition-transform duration-200 ${openFaqItems[index] ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </button>
                    </dt>
                    {openFaqItems[index] && (
                      <dd className="px-6 pb-5">
                        <p className="text-base leading-relaxed text-gray-600">{item.answer}</p>
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Latest Blog Posts Section */}
        <section id="latest-blog" className="py-20 sm:py-28 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-lg font-semibold leading-8 tracking-wide text-indigo-600 uppercase">{latestBlogContent.eyebrow}</h2>
              <h3 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {latestBlogContent.title}
              </h3>
              <p className="mt-6 text-xl leading-relaxed text-gray-600">
                {latestBlogContent.description}
              </p>
            </div>
            <div className="mx-auto mt-16 sm:mt-20 grid grid-cols-1 gap-8 lg:grid-cols-3">
              {latestPosts.map((post) => (
                <article key={post.slug} className="flex flex-col bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="text-sm text-gray-500 mb-3">
                    <time dateTime={post.publishDate}>
                      {new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(post.publishDate))}
                    </time>
                    <span className="mx-2">•</span>
                    <span>{post.readTime}</span>
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                    {post.title}
                  </h4>
                  <p className="flex-grow text-base text-gray-600 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-indigo-600 font-semibold hover:text-indigo-500 transition-colors inline-flex items-center"
                    onClick={() => analytics.navigation.internal_link_click(`/blog/${post.slug}`)}
                  >
                    {latestBlogContent.readMore}
                    <span className="ml-1" aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link
                href="/blog"
                className="inline-flex items-center px-6 py-3 border border-indigo-600 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
                onClick={() => analytics.navigation.internal_link_click('/blog')}
              >
                {latestBlogContent.viewAll}
                <span className="ml-2" aria-hidden="true">→</span>
              </Link>
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
        {/* Ezoic Ad Placement 103 */}
        <div className="py-4 flex justify-center">
          <EzoicAd placementId={103} />
        </div>
      </main>

      {/* 友情链接区块 */}
      <footer className="mt-20 py-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <div className="mb-2 font-semibold text-gray-700">{commonT('footer.title')}</div>
        <div className="flex flex-wrap justify-center gap-6">
          <Link href="/privacy" className="text-blue-600 hover:text-blue-800 underline transition-colors">
            {commonT('footer.links.privacy')}
          </Link>
          <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline transition-colors">
            {commonT('footer.links.terms')}
          </Link>
          <Link href="/about" className="text-blue-600 hover:text-blue-800 underline transition-colors">
            {commonT('footer.links.about')}
          </Link>
          <Link href="/faq" className="text-blue-600 hover:text-blue-800 underline transition-colors">
            {commonT('footer.links.faq')}
          </Link>
          <Link href="/contact" className="text-blue-600 hover:text-blue-800 underline transition-colors">
            {commonT('footer.links.contact')}
          </Link>
        </div>
        <div className="mt-4 mb-2 font-semibold text-gray-700">Friend Links</div>
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
