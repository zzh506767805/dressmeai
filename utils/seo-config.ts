// SEO配置文件 - 统一管理所有页面的SEO信息
export interface SEOConfig {
  title: string
  description: string
  keywords: string
  image?: string
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  section?: string
  tags?: string[]
}

// 页面SEO配置
export const seoConfigs: Record<string, SEOConfig> = {
  // 首页
  home: {
    title: "AI Virtual Try-On & Fashion Assistant | DressMeAI - Try Clothes Online Free",
    description: "Experience the future of online shopping with DressMeAI's AI virtual try-on technology. See how clothes look on you instantly, get personalized style recommendations, and shop with confidence. Free to try!",
    keywords: "AI virtual try-on, virtual clothes fitting, online fashion assistant, digital wardrobe, virtual dressing room, AI outfit generator, fashion technology, virtual fitting room, clothes try on app, virtual fashion, AI styling",
    image: "/images/og-banner-home.jpg"
  },
  
  // 虚拟试衣页面
  tryOn: {
    title: "AI Virtual Try-On | See How Clothes Look On You | DressMeAI",
    description: "Try on clothes virtually with advanced AI technology. Upload your photo and see exactly how different outfits will look on you before buying. Free virtual fitting room experience.",
    keywords: "virtual try-on, AI clothes fitting, virtual dressing room, online fitting, virtual fashion trial, AI try on app, digital fitting room, virtual clothes fitting, fashion technology",
    image: "/images/og-banner-tryon.jpg"
  },
  

  
  // 历史记录页面
  history: {
    title: "Your Virtual Try-On History | DressMeAI",
    description: "View and manage your virtual try-on history. See all your previous outfit trials, save your favorites, and track your fashion journey with DressMeAI's AI technology.",
    keywords: "virtual try-on history, fashion history, outfit history, saved outfits, fashion journal, virtual wardrobe, AI fashion tracking",
    image: "/images/og-banner-history.jpg"
  },
  
  // 功能介绍页面
  features: {
    title: "AI Fashion Features | Virtual Try-On & Style Recommendations | DressMeAI",
    description: "Explore DressMeAI's powerful AI fashion features including virtual try-on, personalized style recommendations, outfit generation, and smart wardrobe management tools.",
    keywords: "AI fashion features, virtual try-on features, AI style recommendations, outfit generator, fashion AI tools, smart wardrobe, digital styling, fashion technology features",
    image: "/images/og-banner-features.jpg"
  }
}



// 常用关键词库
export const keywordLibrary = {
  primary: [
    "AI virtual try-on",
    "virtual clothes fitting", 
    "online fashion assistant",
    "digital wardrobe",
    "virtual dressing room",
    "AI outfit generator"
  ],
  secondary: [
    "fashion technology",
    "virtual fitting room",
    "AI styling",
    "virtual fashion",
    "digital fashion",
    "smart wardrobe",
    "outfit recommendations",
    "style suggestions"
  ],
  longTail: [
    "how to try on clothes online virtually",
    "AI fashion recommendations app",
    "virtual dressing room technology",
    "online virtual fitting room free",
    "AI personal stylist online",
    "virtual clothes fitting app",
    "digital wardrobe management",
    "AI outfit generator free"
  ],
  local: [
    "virtual try-on app USA",
    "AI fashion assistant online",
    "virtual fitting room America",
    "online fashion stylist US"
  ],
  seasonal: [
    "virtual try-on summer clothes",
    "AI winter fashion recommendations", 
    "virtual fall outfit ideas",
    "spring fashion virtual fitting"
  ]
}

// 获取页面SEO配置
export const getPageSEO = (page: string, customData?: Partial<SEOConfig>): SEOConfig => {
  const defaultConfig = seoConfigs[page] || seoConfigs.home
  return {
    ...defaultConfig,
    ...customData
  }
}

// 生成结构化数据
export const generateStructuredData = (page: string, seoConfig: SEOConfig) => {
  const baseUrl = "https://dressmeai.com"
  
  const baseStructuredData: any = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        "url": baseUrl,
        "name": "DressMeAI",
        "description": "AI Virtual Try-On and Fashion Assistant Platform",
        "publisher": {
          "@id": `${baseUrl}/#organization`
        },
        "potentialAction": [
          {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": `${baseUrl}/search?q={search_term_string}`
            },
            "query-input": "required name=search_term_string"
          }
        ],
        "inLanguage": "en-US"
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        "name": "DressMeAI",
        "url": baseUrl,
        "logo": {
          "@type": "ImageObject",
          "@id": `${baseUrl}/#/schema/logo`,
          "inLanguage": "en-US",
          "url": `${baseUrl}/logo.png`,
          "contentUrl": `${baseUrl}/logo.png`,
          "width": 512,
          "height": 512,
          "caption": "DressMeAI"
        },
        "image": {
          "@id": `${baseUrl}/#/schema/logo`
        },
        "sameAs": [
          "https://twitter.com/dressmeai",
          "https://linkedin.com/company/dressmeai",
          "https://facebook.com/dressmeai",
          "https://instagram.com/dressmeai"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "customer service",
          "availableLanguage": ["en", "zh-CN"]
        }
      }
    ]
  }

  // 根据页面类型添加特定的结构化数据
  switch (page) {
    case 'home':
      baseStructuredData["@graph"].push({
        "@type": "WebApplication",
        "@id": `${baseUrl}/#webapplication`,
        "name": "DressMeAI Virtual Try-On",
        "description": seoConfig.description,
        "url": baseUrl,
        "applicationCategory": "LifestyleApplication",
        "operatingSystem": "All",
        "browserRequirements": "Requires JavaScript. Requires HTML5.",
        "softwareVersion": "1.0",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "150",
          "bestRating": "5",
          "worstRating": "1"
        },
        "featureList": [
          "AI Virtual Try-On",
          "Fashion Style Recommendations", 
          "Digital Wardrobe Management",
          "Outfit Generation",
          "Style Analysis",
          "Fashion Trend Insights"
        ]
      })
      break
  }
  
  // 如果是文章页面
  if (seoConfig.type === 'article' && seoConfig.publishedTime) {
    baseStructuredData["@graph"].push({
      "@type": "Article",
      "headline": seoConfig.title,
      "description": seoConfig.description,
      "image": seoConfig.image ? `${baseUrl}${seoConfig.image}` : `${baseUrl}/images/og-banner.jpg`,
      "datePublished": seoConfig.publishedTime,
      "dateModified": seoConfig.modifiedTime || seoConfig.publishedTime,
      "author": {
        "@type": "Person",
        "name": seoConfig.author || "DressMeAI Team"
      },
      "publisher": {
        "@id": `${baseUrl}/#organization`
      },
      "articleSection": seoConfig.section || "Fashion",
      "keywords": seoConfig.keywords,
      "wordCount": seoConfig.description.length,
      "inLanguage": "en-US"
    })
  }

  return baseStructuredData
}

// 面包屑生成器
export const generateBreadcrumbs = (path: string) => {
  const pathArray = path.split('/').filter(p => p)
  const breadcrumbs = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://dressmeai.com"
    }
  ]

  let currentPath = ""
  pathArray.forEach((segment, index) => {
    currentPath += `/${segment}`
    breadcrumbs.push({
      "@type": "ListItem",
      "position": index + 2,
      "name": segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' '),
      "item": `https://dressmeai.com${currentPath}`
    })
  })

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs
  }
}

// FAQ结构化数据生成器
export const generateFAQStructuredData = (faqs: Array<{question: string, answer: string}>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
})

// 产品结构化数据生成器
export const generateProductStructuredData = (product: {
  name: string
  description: string
  image: string
  price?: string
  availability?: string
  brand?: string
  category?: string
}) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "name": product.name,
  "description": product.description,
  "image": product.image,
  "brand": {
    "@type": "Brand",
    "name": product.brand || "DressMeAI"
  },
  "category": product.category || "Fashion Technology",
  "offers": {
    "@type": "Offer",
    "price": product.price || "0.00",
    "priceCurrency": "USD",
    "availability": product.availability || "https://schema.org/InStock"
  }
}) 