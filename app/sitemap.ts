import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // 主要页面
    {
      url: 'https://dressmeai.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://dressmeai.com/try-on',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://dressmeai.com/history',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    
    // Blog相关页面
    {
      url: 'https://dressmeai.com/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
          {
        url: 'https://dressmeai.com/blog/ai-virtual-try-on-technology-revolutionizing-fashion',
        lastModified: new Date('2025-06-15'),
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      {
        url: 'https://dressmeai.com/blog/best-ai-clothing-try-on-apps-software-2025',
        lastModified: new Date('2025-06-12'),
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      {
        url: 'https://dressmeai.com/blog/virtual-try-on-technology-reduces-return-rates',
        lastModified: new Date('2025-06-10'),
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      {
        url: 'https://dressmeai.com/blog/ai-fashion-technology-future-online-shopping',
        lastModified: new Date('2025-06-08'),
        changeFrequency: 'monthly',
        priority: 0.7,
      },
  ]
}