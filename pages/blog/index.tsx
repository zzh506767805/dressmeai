import Head from 'next/head'
import Link from 'next/link'
import { GetStaticProps } from 'next'

interface BlogPost {
  slug: string
  title: string
  description: string
  keywords: string
  publishDate: string
  readTime: string
  excerpt: string
}

interface BlogIndexProps {
  posts: BlogPost[]
}

const blogPosts: BlogPost[] = [
  {
    slug: 'ai-virtual-try-on-technology-revolutionizing-fashion',
    title: 'AI Virtual Try-On Technology: Revolutionizing Online Fashion Shopping',
    description: 'Discover how AI virtual try-on technology is transforming online fashion shopping. Try clothes virtually before buying with cutting-edge AI software.',
    keywords: 'AI virtual try-on, virtual try-on technology, online fashion shopping',
    publishDate: '2025-06-15',
    readTime: '8 min read',
    excerpt: 'The fashion industry is experiencing a digital revolution, and AI virtual try-on technology is at the forefront of this transformation. Learn how this cutting-edge technology is changing the way we shop for clothes online.'
  },
  {
    slug: 'best-ai-clothing-try-on-apps-software-2025',
    title: 'Best AI Clothing Try-On Apps and Software in 2025',
    description: 'Compare the top AI clothing try-on apps and software in 2025. Find the perfect virtual fitting room solution for your fashion business.',
    keywords: 'AI clothing try-on app, virtual fitting room software, best try-on apps',
    publishDate: '2025-06-12',
    readTime: '10 min read',
    excerpt: 'The virtual fitting room market has exploded with innovative AI-powered solutions. Discover the leading platforms and apps that are making online clothes shopping more accurate and enjoyable.'
  },
  {
    slug: 'virtual-try-on-technology-reduces-return-rates',
    title: 'How Virtual Try-On Technology Reduces Return Rates in Fashion E-commerce',
    description: 'Learn how virtual try-on technology significantly reduces return rates in fashion e-commerce, saving costs and improving customer satisfaction.',
    keywords: 'reduce return rates, virtual try-on ROI, fashion e-commerce solutions',
    publishDate: '2025-06-10',
    readTime: '7 min read',
    excerpt: 'Fashion e-commerce faces a persistent challenge: high return rates. Discover how virtual try-on technology offers a powerful solution that addresses these challenges while delivering measurable business benefits.'
  },
  {
    slug: 'ai-fashion-technology-future-online-shopping',
    title: 'AI Fashion Technology: The Future of Online Clothing Shopping',
    description: 'Explore how AI fashion technology is shaping the future of online clothing shopping with virtual try-ons, personalized recommendations, and smart retail solutions.',
    keywords: 'AI fashion technology, future of online shopping, smart fashion retail',
    publishDate: '2025-06-08',
    readTime: '12 min read',
    excerpt: 'The intersection of artificial intelligence and fashion retail is creating unprecedented opportunities. Explore how AI is redefining the entire fashion industry and what the future holds.'
  }
]

export default function BlogIndex({ posts }: BlogIndexProps) {
  return (
    <>
      <Head>
        <title>AI Virtual Try-On Blog | Fashion Technology Insights | DressMeAI</title>
        <meta name="description" content="Explore the latest insights on AI virtual try-on technology, fashion e-commerce trends, and digital shopping innovations. Expert articles on virtual fitting rooms and fashion tech." />
        <meta name="keywords" content="AI virtual try-on blog, fashion technology articles, virtual fitting room insights, fashion e-commerce trends, AI clothing technology, virtual try-on news" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        <link rel="canonical" href="https://dressmeai.com/blog" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="DressMeAI" />
        <meta property="og:title" content="AI Virtual Try-On Blog | Fashion Technology Insights | DressMeAI" />
        <meta property="og:description" content="Explore the latest insights on AI virtual try-on technology, fashion e-commerce trends, and digital shopping innovations." />
        <meta property="og:image" content="https://dressmeai.com/images/blog-og-banner.jpg" />
        <meta property="og:url" content="https://dressmeai.com/blog" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@dressmeai" />
        <meta name="twitter:title" content="AI Virtual Try-On Blog | Fashion Technology Insights | DressMeAI" />
        <meta name="twitter:description" content="Explore the latest insights on AI virtual try-on technology, fashion e-commerce trends, and digital shopping innovations." />
        <meta name="twitter:image" content="https://dressmeai.com/images/blog-og-banner.jpg" />
        
        <meta name="robots" content="index, follow" />
        <meta name="author" content="DressMeAI Team" />
        
        {/* Blog Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "DressMeAI Blog",
            "description": "Expert insights on AI virtual try-on technology and fashion e-commerce innovations",
            "url": "https://dressmeai.com/blog",
            "inLanguage": "en-US",
            "publisher": {
              "@type": "Organization",
              "name": "DressMeAI",
              "url": "https://dressmeai.com",
              "logo": {
                "@type": "ImageObject",
                "url": "https://dressmeai.com/logo.png",
                "width": 600,
                "height": 60
              }
            },
            "blogPost": posts.map(post => ({
              "@type": "BlogPosting",
              "headline": post.title,
              "description": post.excerpt,
              "url": `https://dressmeai.com/blog/${post.slug}`,
              "datePublished": `${post.publishDate}T09:00:00+00:00`,
              "dateModified": `${post.publishDate}T09:00:00+00:00`,
              "author": {
                "@type": "Organization",
                "name": "DressMeAI Team",
                "url": "https://dressmeai.com"
              },
              "publisher": {
                "@type": "Organization",
                "name": "DressMeAI",
                "url": "https://dressmeai.com",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://dressmeai.com/logo.png",
                  "width": 600,
                  "height": 60
                }
              },
              "image": {
                "@type": "ImageObject",
                "url": `https://dressmeai.com/images/blog/${post.slug}-og.jpg`,
                "width": 1200,
                "height": 630
              },
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://dressmeai.com/blog/${post.slug}`
              }
            }))
          })}
        </script>
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="flex justify-between items-center py-4 mb-8">
          <Link href="/" className="text-4xl font-bold text-indigo-600">
            AI FASHION
          </Link>
          <nav>
            <div className="space-x-6">
              <Link href="/" className="text-blue-600 hover:text-blue-800 transition-colors">
                Home
              </Link>
              <Link href="/history" className="text-blue-600 hover:text-blue-800 transition-colors">
                History
              </Link>
              <Link href="/blog" className="text-blue-600 hover:text-blue-800 transition-colors font-semibold">
                Blog
              </Link>
            </div>
          </nav>
        </div>

        {/* Blog Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AI Virtual Try-On Blog
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover the latest insights on AI virtual try-on technology, fashion e-commerce trends, 
            and digital shopping innovations that are transforming the fashion industry.
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {posts.map((post) => (
            <article key={post.slug} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="p-8">
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <time dateTime={post.publishDate}>
                    {new Date(post.publishDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </time>
                  <span className="mx-2">•</span>
                  <span>{post.readTime}</span>
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-4 hover:text-indigo-600 transition-colors">
                  <Link href={`/blog/${post.slug}`}>
                    {post.title}
                  </Link>
                </h2>
                
                <p className="text-gray-600 leading-relaxed mb-6">
                  {post.excerpt}
                </p>
                
                <div className="flex justify-between items-center">
                  <Link 
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
                  >
                    Read More
                    <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                  
                  <div className="flex flex-wrap gap-2">
                    {post.keywords.split(', ').slice(0, 2).map((keyword) => (
                      <span key={keyword} className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center bg-indigo-600 rounded-2xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Experience AI Virtual Try-On?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            See how our cutting-edge AI technology can transform your online shopping experience.
          </p>
          <Link 
            href="/#ai-fashion"
            className="inline-block bg-white text-indigo-600 font-semibold px-8 py-4 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Try Virtual Try-On Now
          </Link>
        </div>
      </div>
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {
      posts: blogPosts
    }
  }
} 