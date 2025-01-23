import { writeFileSync } from 'fs';
import prettier from 'prettier';

interface StaticPage {
  url: string;
  changefreq: string;
  priority: number;
}

async function generate() {
  const staticPages: StaticPage[] = [
    {
      url: '/',
      changefreq: 'daily',
      priority: 1.0,
    },
    {
      url: '/try-on',
      changefreq: 'weekly',
      priority: 0.8,
    },
    {
      url: '/demo',
      changefreq: 'weekly',
      priority: 0.7,
    },
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${staticPages
        .map(
          (page) => `
            <url>
              <loc>https://dressmeai.com${page.url}</loc>
              <changefreq>${page.changefreq}</changefreq>
              <priority>${page.priority}</priority>
              <lastmod>${new Date().toISOString()}</lastmod>
            </url>
          `
        )
        .join('')}
    </urlset>`;

  const formatted = await prettier.format(sitemap, {
    parser: 'html',
  });

  writeFileSync('public/sitemap.xml', formatted);
  console.log('Sitemap generated successfully!');
}

// 执行生成函数
generate().catch((err) => {
  console.error('Error generating sitemap:', err);
  process.exit(1);
}); 