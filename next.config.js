/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'res.cloudinary.com',
      'dashscope-result-hz.oss-cn-hangzhou.aliyuncs.com',
      'images.unsplash.com'
    ],
    unoptimized: true
  }
}

module.exports = nextConfig