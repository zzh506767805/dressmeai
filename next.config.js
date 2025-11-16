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
  }
}

module.exports = nextConfig
