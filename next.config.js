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
