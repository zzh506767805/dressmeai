import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect, useMemo } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import GoogleAnalytics from '../components/Analytics/GoogleAnalytics'
import { pageview } from '../utils/analytics'
import { defaultLocale, isSupportedLocale } from '../i18n/config'
import { getMessages } from '../i18n/messages'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const locale = isSupportedLocale(router.locale) ? router.locale : defaultLocale
  const messages = useMemo(() => getMessages(locale), [locale])
  const defaultTimeZone = 'UTC'
  const nowValue = useMemo(() => Date.now(), [])

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      pageview(url)
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  // 添加全局错误处理和localStorage清理
  useEffect(() => {
    // 清理可能损坏的localStorage数据
    const cleanupLocalStorage = () => {
      try {
        const keys = ['tryonHistory', 'generationResult', 'modelImage', 'clothingImage']
        keys.forEach(key => {
          const value = localStorage.getItem(key)
          if (value === 'undefined' || value === 'null' || value === '') {
            localStorage.removeItem(key)
          } else if (value) {
            try {
              JSON.parse(value)
            } catch (error) {
              console.warn(`Removing corrupted localStorage key: ${key}`)
              localStorage.removeItem(key)
            }
          }
        })
      } catch (error) {
        console.error('Error cleaning localStorage:', error)
      }
    }

    // 页面加载时清理
    cleanupLocalStorage()

    // 全局错误处理
    const handleError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('not valid JSON')) {
        console.warn('JSON parse error detected, cleaning localStorage')
        cleanupLocalStorage()
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && event.reason.message.includes('not valid JSON')) {
        console.warn('JSON parse promise rejection detected, cleaning localStorage')
        cleanupLocalStorage()
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={defaultTimeZone} now={new Date(nowValue)}>
      <GoogleAnalytics />
      <Component {...pageProps} />
    </NextIntlClientProvider>
  )
}
