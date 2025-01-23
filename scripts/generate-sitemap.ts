import { writeFileSync } from 'fs'
import { globby } from 'globby'
import prettier from 'prettier'

type StaticPage = {
  url: string
  changefreq: 'daily' | 'weekly' | 'monthly'
  priority: number
}

async function generate() {
  const prettierConfig = await prettier.resolveConfig('./.prettierrc')
  const pages = await globby([
    'pages/**/*.tsx',
    'pages/**/*.ts',
    'pages/**/*.js',
    'pages/**/*.jsx',
    '!pages/_*.tsx',
    '!pages/api',
  ])

  const currentDate = new Date().toISOString()

  // 静态页面配置
  const staticPages: StaticPage[] = [
    {
      url: '',
      changefreq: 'daily',
      priority: 1.0,
    },
    {
      url: 'try-on',
      changefreq: 'weekly',
      priority: 0.8,
    },
    {
      url: 'demo',
      changefreq: 'weekly',
      priority: 0.8,
    },
    {
      url: 'privacy',
      changefreq: 'monthly',
      priority: 0.5,
    },
    {
      url: 'terms',
      changefreq: 'monthly',
      priority: 0.5,
    },
    {
      url: 'contact',
      changefreq: 'monthly',
      priority: 0.5,
    },
  ]

  const sitemap = `
    <?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${staticPages
        .map(
          (page) => `
            <url>
              <loc>https://dressmeai.com/${page.url}</loc>
              <lastmod>${currentDate}</lastmod>
              <changefreq>${page.changefreq}</changefreq>
              <priority>${page.priority}</priority>
            </url>
          `
        )
        .join('')}
    </urlset>
  `

  const formatted = await prettier.format(sitemap, {
    ...prettierConfig,
    parser: 'html',
  })

  writeFileSync('public/sitemap.xml', formatted)
  console.log('Sitemap generated successfully!')
}

// 执行生成函数
generate().catch((err) => {
  console.error('Error generating sitemap:', err)
  process.exit(1)
}) 