import { MetadataRoute } from 'next'

// 导入博客文章数据
const blogPosts = [
  {
    slug: 'accessory-styling',
    date: '2024-02-17'
  },
  {
    slug: 'color-coordination',
    date: '2024-02-16'
  },
  {
    slug: 'body-type-dressing',
    date: '2024-02-15'
  },
  {
    slug: 'fashion-trends-2024',
    date: '2024-02-14'
  },
  {
    slug: 'capsule-wardrobe',
    date: '2024-02-13'
  },
  {
    slug: 'casual-style-guide',
    date: '2024-02-25'
  },
  {
    slug: 'business-attire-essentials',
    date: '2024-02-24'
  },
  {
    slug: 'street-fashion-trends',
    date: '2024-02-23'
  },
  {
    slug: 'minimalist-wardrobe',
    date: '2024-02-22'
  },
  {
    slug: 'sustainable-fashion',
    date: '2024-02-21'
  },
  {
    slug: 'office-dress-code',
    date: '2024-02-20'
  },
  {
    slug: 'seasonal-fashion-guide',
    date: '2024-02-19'
  }
]

export default function sitemap(): MetadataRoute.Sitemap {
  // 创建博客文章的sitemap条目
  const blogPostsUrls = blogPosts.map(post => ({
    url: `https://dressmeai.com/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6
  }))

  return [
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
      priority: 0.8,
    },
    {
      url: 'https://dressmeai.com/demo',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: 'https://dressmeai.com/privacy',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://dressmeai.com/terms',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://dressmeai.com/contact',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    // 博客首页
    {
      url: 'https://dressmeai.com/blog',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    // 添加所有博客文章URL
    ...blogPostsUrls
  ]
}