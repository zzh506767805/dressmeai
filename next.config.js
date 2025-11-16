const i18nSettings = require('./i18n/settings.json')

const locales = i18nSettings.locales.map(locale => locale.code)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
    defaultLocale: i18nSettings.defaultLocale,
    localeDetection: false
  },
  async redirects() {
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
