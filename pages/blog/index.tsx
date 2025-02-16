import { GetStaticProps } from 'next';
import Link from 'next/link';
import Head from 'next/head';

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
}

interface BlogPageProps {
  posts: BlogPost[];
}

// 模拟博客文章数据
const blogPosts: BlogPost[] = [
  {
    slug: 'accessory-styling',
    title: 'The Art of Accessorizing: Complete Guide to Fashion Accessories',
    excerpt: 'Learn how to elevate any outfit with the right accessories. From jewelry to bags, discover how these finishing touches can transform your look.',
    category: 'Style Guides',
    date: '2024-02-17'
  },
  {
    slug: 'color-coordination',
    title: 'Master the Art of Color Coordination in Fashion',
    excerpt: 'Discover how to use color theory to create harmonious and eye-catching outfits that complement your personal style.',
    category: 'Style Guides',
    date: '2024-02-16'
  },
  {
    slug: 'body-type-dressing',
    title: 'Dress for Your Body Type: A Comprehensive Guide',
    excerpt: 'Learn how to identify your body type and choose clothing that enhances your natural features.',
    category: 'Style Guides',
    date: '2024-02-15'
  },
  {
    slug: 'fashion-trends-2024',
    title: 'Fashion Trends 2024: What\'s Hot and How to Wear It',
    excerpt: 'Explore the most influential trends of 2024 and learn how to incorporate them into your wardrobe.',
    category: 'Trends',
    date: '2024-02-14'
  },
  {
    slug: 'capsule-wardrobe',
    title: 'Creating a Capsule Wardrobe: The Ultimate Guide',
    excerpt: 'Discover the art of building a versatile, minimal wardrobe that maximizes your style options while minimizing clutter.',
    category: 'Style Guides',
    date: '2024-02-13'
  },
  {
    slug: 'casual-style-guide',
    title: 'The Ultimate Guide to Casual Style: Effortless Fashion Tips',
    excerpt: 'Master the art of casual dressing with our comprehensive guide to creating stylish, comfortable outfits for any occasion.',
    category: 'Style Guides',
    date: '2024-02-25'
  },
  {
    slug: 'business-attire-essentials',
    title: 'Business Attire Essentials: Professional Wardrobe Must-Haves',
    excerpt: 'Discover the key pieces every professional needs in their wardrobe to create polished, office-appropriate looks.',
    category: 'Professional Style',
    date: '2024-02-24'
  },
  {
    slug: 'street-fashion-trends',
    title: 'Street Fashion Trends: Urban Style Guide for 2024',
    excerpt: 'Stay ahead of the curve with our guide to the latest street fashion trends and how to incorporate them into your wardrobe.',
    category: 'Trends',
    date: '2024-02-23'
  },
  {
    slug: 'minimalist-wardrobe',
    title: 'Building a Minimalist Wardrobe: Less is More',
    excerpt: 'Learn how to create a versatile wardrobe with fewer pieces while maximizing your style options.',
    category: 'Style Guides',
    date: '2024-02-22'
  },
  {
    slug: 'sustainable-fashion',
    title: 'Sustainable Fashion: Your Guide to Eco-Friendly Style',
    excerpt: 'Explore how to make environmentally conscious fashion choices without compromising on style.',
    category: 'Sustainability',
    date: '2024-02-21'
  },
  {
    slug: 'office-dress-code',
    title: 'Office Dress Code: A Complete Guide to Workplace Attire',
    excerpt: 'Navigating workplace dress codes can be challenging. This comprehensive guide breaks down different dress code categories and helps you dress appropriately.',
    category: 'Professional Style',
    date: '2024-02-20'
  },
  {
    slug: 'seasonal-fashion-guide',
    title: 'Seasonal Fashion Guide: Dressing for Every Season',
    excerpt: 'Learn how to adapt your wardrobe for each season while maintaining your personal style and comfort. This guide covers essential pieces and layering techniques.',
    category: 'Style Guides',
    date: '2024-02-19'
  }
];

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {
      posts: blogPosts
    }
  };
};

export default function BlogIndex({ posts }: BlogPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Fashion Blog | Style Guides & Tips | DressMeAI</title>
        <meta
          name="description"
          content="Explore fashion tips, style guides, and trend insights on the DressMeAI blog. Learn about casual wear, business attire, street fashion, and more."
        />
        <meta
          name="keywords"
          content="fashion blog, style guide, fashion tips, casual style, business attire, street fashion, sustainable fashion"
        />
        <link rel="canonical" href="https://dressmeai.com/blog" />
        <link rel="icon" href="/icons/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon.ico" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
      </Head>

      <div className="flex justify-between items-center py-4 px-4 mb-8 bg-white shadow-sm">
        <h1 className="text-4xl font-bold">AI FASHION</h1>
        <nav>
          <div className="space-x-6">
            <Link 
              href="/" 
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Home
            </Link>
            <Link 
              href="/history" 
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              History
            </Link>
          </div>
        </nav>
      </div>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-8">Fashion Blog</h2>
          
          <div className="space-y-10">
            {posts.map((post) => (
              <Link 
                key={post.slug} 
                href={`/blog/${post.slug}`}
                className="block"
              >
                <article className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="text-sm text-indigo-600 mb-2">{post.category}</div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3 hover:text-indigo-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <time dateTime={post.date} className="text-sm text-gray-500">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </time>
                    <span className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">
                      Read more →
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}