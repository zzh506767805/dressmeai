import Head from 'next/head'
import { useRouter } from 'next/router'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  image?: string
  article?: boolean
  publishedTime?: string
  modifiedTime?: string
  author?: string
  section?: string
  tags?: string[]
}

export default function EnhancedSEO({
  title,
  description,
  keywords,
  image = '/images/og-banner.jpg',
  article = false,
  publishedTime,
  modifiedTime,
  author,
  section,
  tags = []
}: SEOProps) {
  const router = useRouter()
  const canonicalUrl = `https://dressmeai.com${router.asPath}`
  
  // 默认SEO配置
  const defaultTitle = "AI Virtual Try-On & Fashion Assistant | DressMeAI - Try Clothes Online Free"
  const defaultDescription = "Experience the future of online shopping with DressMeAI's AI virtual try-on technology. See how clothes look on you instantly, get personalized style recommendations, and shop with confidence. Free to try!"
  const defaultKeywords = "AI virtual try-on, virtual clothes fitting, online fashion assistant, digital wardrobe, virtual dressing room, AI outfit generator, fashion technology, virtual fitting room, clothes try on app"

  const seoTitle = title || defaultTitle
  const seoDescription = description || defaultDescription
  const seoKeywords = keywords || defaultKeywords
  const imageUrl = image.startsWith('http') ? image : `https://dressmeai.com${image}`

  // 生成面包屑数据
  const generateBreadcrumbs = () => {
    const pathArray = router.asPath.split('/').filter(path => path)
    const breadcrumbs = [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://dressmeai.com"
      }
    ]

    let currentPath = ''
    pathArray.forEach((path, index) => {
      currentPath += `/${path}`
      breadcrumbs.push({
        "@type": "ListItem",
        "position": index + 2,
        "name": path.charAt(0).toUpperCase() + path.slice(1).replace('-', ' '),
        "item": `https://dressmeai.com${currentPath}`
      })
    })

    return breadcrumbs
  }

  // 结构化数据
  const structuredData: any = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonicalUrl}#webpage`,
        "url": canonicalUrl,
        "name": seoTitle,
        "isPartOf": {
          "@id": "https://dressmeai.com/#website"
        },
        "about": {
          "@id": "https://dressmeai.com/#organization"
        },
        "description": seoDescription,
        "breadcrumb": {
          "@id": `${canonicalUrl}#breadcrumb`
        },
        "inLanguage": "en-US",
        "potentialAction": [
          {
            "@type": "ReadAction",
            "target": [canonicalUrl]
          }
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://dressmeai.com/#website",
        "url": "https://dressmeai.com/",
        "name": "DressMeAI",
        "description": "AI Virtual Try-On and Fashion Assistant Platform",
        "publisher": {
          "@id": "https://dressmeai.com/#organization"
        },
        "potentialAction": [
          {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://dressmeai.com/search?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        ],
        "inLanguage": "en-US"
      },
      {
        "@type": "Organization",
        "@id": "https://dressmeai.com/#organization",
        "name": "DressMeAI",
        "url": "https://dressmeai.com/",
        "logo": {
          "@type": "ImageObject",
          "inLanguage": "en-US",
          "@id": "https://dressmeai.com/#/schema/logo",
          "url": "https://dressmeai.com/logo.png",
          "contentUrl": "https://dressmeai.com/logo.png",
          "width": 512,
          "height": 512,
          "caption": "DressMeAI"
        },
        "image": {
          "@id": "https://dressmeai.com/#/schema/logo"
        },
        "sameAs": [
          "https://twitter.com/dressmeai",
          "https://linkedin.com/company/dressmeai",
          "https://facebook.com/dressmeai"
        ]
      },
      {
        "@type": "WebApplication",
        "@id": "https://dressmeai.com/#webapplication",
        "name": "DressMeAI Virtual Try-On",
        "description": seoDescription,
        "url": "https://dressmeai.com/",
        "applicationCategory": "Fashion & Style",
        "operatingSystem": "Any",
        "browserRequirements": "Modern web browser with JavaScript enabled",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        "featureList": [
          "AI Virtual Try-On",
          "Fashion Style Recommendations",
          "Digital Wardrobe Management",
          "Outfit Generation",
          "Style Analysis"
        ]
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        "itemListElement": generateBreadcrumbs()
      }
    ]
  }

  // 如果是文章页面，添加文章结构化数据
  if (article && publishedTime) {
    structuredData["@graph"].push({
      "@type": "Article",
      "@id": `${canonicalUrl}#article`,
      "isPartOf": {
        "@id": `${canonicalUrl}#webpage`
      },
      "author": {
        "@type": "Person",
        "name": author || "DressMeAI Team",
        "@id": "https://dressmeai.com/#/schema/person/1"
      },
      "headline": seoTitle,
      "datePublished": publishedTime,
      "dateModified": modifiedTime || publishedTime,
      "mainEntityOfPage": {
        "@id": `${canonicalUrl}#webpage`
      },
      "wordCount": description?.length || 0,
      "publisher": {
        "@id": "https://dressmeai.com/#organization"
      },
      "image": {
        "@type": "ImageObject",
        "inLanguage": "en-US",
        "@id": `${canonicalUrl}#primaryimage`,
        "url": imageUrl,
        "contentUrl": imageUrl,
        "width": 1200,
        "height": 630
      },
      "thumbnailUrl": imageUrl,
      "keywords": tags.join(', '),
      "articleSection": section || "Fashion"
    })
  }

  return (
    <Head>
      {/* 基础Meta标签 */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords} />
      <meta name="author" content={author || "DressMeAI Team"} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      
      {/* 高级SEO标签 */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1" />
      <meta name="bingbot" content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1" />
      <meta name="revisit-after" content="7 days" />
      <meta name="language" content="EN" />
      <meta name="distribution" content="global" />
      <meta name="rating" content="general" />
      <meta name="referrer" content="origin-when-cross-origin" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Favicon和图标 */}
      <link rel="icon" href="/icons/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
      <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
      
      {/* PWA Meta标签 */}
      <meta name="application-name" content="DressMeAI" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="DressMeAI" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="msapplication-TileColor" content="#4F46E5" />
      <meta name="msapplication-config" content="/icons/browserconfig.xml" />
      <meta name="theme-color" content="#4F46E5" />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={article ? "article" : "website"} />
      <meta property="og:site_name" content="DressMeAI" />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={seoTitle} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:locale:alternate" content="zh_CN" />
      
      {/* 文章特定的OG标签 */}
      {article && publishedTime && (
        <>
          <meta property="article:published_time" content={publishedTime} />
          <meta property="article:modified_time" content={modifiedTime || publishedTime} />
          <meta property="article:author" content={author || "DressMeAI Team"} />
          <meta property="article:section" content={section || "Fashion"} />
          {tags.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@dressmeai" />
      <meta name="twitter:creator" content="@dressmeai" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={seoTitle} />
      
      {/* 额外的Social Media标签 */}
      <meta name="pinterest-rich-pin" content="true" />
      
      {/* DNS预解析 */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
      <link rel="dns-prefetch" href="//www.google-analytics.com" />
      
      {/* 预连接重要域名 */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
      
      {/* 其他重要标签 */}
      <meta httpEquiv="x-ua-compatible" content="ie=edge" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="skype_toolbar" content="skype_toolbar_parser_compatible" />
      
      {/* 安全相关 */}
      <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
    </Head>
  )
} 