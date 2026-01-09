const i18nSettings = require('./i18n/settings.json')

const locales = i18nSettings.locales.map(locale => locale.code)
const defaultLocale = i18nSettings.defaultLocale

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: [
      'dressmeaiupload.blob.core.windows.net',
      'dashscope-result-hz.oss-cn-hangzhou.aliyuncs.com',
      'dashscope-result-sh.oss-cn-shanghai.aliyuncs.com',
      'images.unsplash.com'
    ],
    unoptimized: true
  },
  i18n: {
    locales,
    defaultLocale,
    localeDetection: false
  },
  async redirects() {
    if (process.env.NODE_ENV !== 'production') {
      return []
    }

    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.dressmeai.com'
          }
        ],
        destination: 'https://dressmeai.com/:path*',
        permanent: true
      }
    ]
  }
}

module.exports = nextConfig
