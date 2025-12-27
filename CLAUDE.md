# DressMeAI Project Documentation

## Project Overview

DressMeAI is an AI-powered virtual try-on platform that allows users to visualize how clothes look on their body before purchasing. The platform uses advanced AI technology to create realistic virtual fitting experiences.

**Live URL**: https://dressmeai.com

## Tech Stack

- **Framework**: Next.js 14.1.0 (Pages Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Internationalization**: next-intl (9 languages)
- **Deployment**: Azure Static Web Apps
- **Payment**: Stripe
- **Analytics**: Custom analytics implementation
- **AI Backend**: Alibaba Cloud DashScope (virtual try-on API)

## Supported Languages

| Code | Language |
|------|----------|
| en | English (default) |
| zh-CN | Chinese (Simplified) |
| ko | Korean |
| ja | Japanese |
| ru | Russian |
| fr | French |
| de | German |
| es | Spanish |
| it | Italian |

## Project Structure

```
dressmeai/
├── app/                    # App router (sitemap only)
│   └── sitemap.ts
├── pages/                  # Pages router
│   ├── index.tsx          # Homepage with virtual try-on
│   ├── try-on.tsx         # Dedicated try-on page
│   ├── history.tsx        # User try-on history
│   ├── blog/              # Blog pages
│   │   ├── index.tsx      # Blog list
│   │   └── [slug].tsx     # Blog detail
│   ├── about.tsx          # About page
│   ├── faq.tsx            # FAQ page
│   ├── contact.tsx        # Contact page
│   ├── privacy.tsx        # Privacy policy
│   ├── terms.tsx          # Terms of service
│   ├── feed.xml.tsx       # RSS feed
│   ├── success.tsx        # Payment success
│   └── cancel.tsx         # Payment cancel
├── components/            # React components
├── messages/              # i18n translations
│   ├── en/               # English translations
│   │   ├── common.json   # Common UI strings
│   │   ├── landing.json  # Landing page content
│   │   ├── blog.json     # Blog content (20 articles)
│   │   ├── pages.json    # Static pages content
│   │   └── legal.json    # Legal pages content
│   └── [locale]/         # Other language translations
├── public/
│   ├── images/
│   │   ├── blog/         # Blog cover images (20)
│   │   └── landing/      # Landing page images (12)
│   ├── icons/            # App icons
│   └── robots.txt
├── i18n/                 # i18n configuration
├── utils/                # Utility functions
└── styles/               # Global styles
```

## Key Features

### 1. Virtual Try-On
- Upload model photo + clothing photo
- AI generates realistic try-on result
- Integrated on homepage first screen

### 2. Multi-language Support
- 9 languages with full translations
- Locale-based routing
- SEO-optimized for each language

### 3. Blog System
- 20 SEO-optimized articles
- Topics: AI fashion, virtual try-on technology
- Multilingual content

### 4. SEO Optimization
- SSG (Static Site Generation) - 305+ pages
- Proper TDK structure (Title/Description/Keywords)
- Canonical URLs with hreflang
- Open Graph and Twitter meta tags
- Structured data (JSON-LD)
- XML sitemap
- robots.txt

## Content Strategy

### Blog Articles (20 total)
1. AI Virtual Try-On Technology: Revolutionizing Online Fashion Shopping
2. Best AI Clothing Try-On Apps and Software in 2025
3. How Virtual Try-On Technology Reduces Return Rates
4. AI Fashion Technology: The Future of Online Clothing Shopping
5. How to Take the Perfect Photo for Virtual Try-On
6. The Psychology of Virtual Try-On: Why Seeing is Believing
7. Virtual Try-On for All Body Types: Inclusive Fashion Technology
8. Mobile vs Desktop Virtual Try-On Experience
9. Integrating Virtual Try-On with Social Media Shopping
10. How Virtual Try-On Promotes Sustainable Fashion
11. The Role of AR in Fashion E-commerce
12. AI Size Recommendations: Beyond Basic Measurements
13. Virtual Try-On for Accessories: Beyond Clothing
14. Privacy and Security in AI Fashion Apps
15. How Fashion Brands Use AI to Predict Trends
16. The Customer Journey with Virtual Fitting Rooms
17. 2D vs 3D Virtual Try-On: Which Technology is Right for You?
18. Virtual Try-On Success Stories: Real Results from Fashion Brands
19. Building Customer Trust Through AI Fashion Technology
20. The Economics of Virtual Try-On: ROI and Implementation Costs

### Landing Page Sections
- Hero with virtual try-on demo
- Use Cases (Shopping, Content Creation, E-commerce, Personal Styling)
- Features showcase
- How It Works
- Testimonials
- Before/After showcase
- Statistics
- FAQ
- Latest blog posts
- CTA

## Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npx tsc --noEmit
```

## Deployment

The project deploys automatically to Azure Static Web Apps via GitHub Actions when pushing to the `main` branch.

**Workflow**: `.github/workflows/azure-static-web-apps-*.yml`

## Environment Variables

```env
NEXT_PUBLIC_BASE_URL=https://dressmeai.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
DASHSCOPE_API_KEY=xxx
AZURE_STORAGE_CONNECTION_STRING=xxx
```

## SEO Checklist

- [x] SSG/SSR implementation
- [x] sitemap.xml
- [x] robots.txt
- [x] TDK structure on all pages
- [x] Canonical URLs
- [x] hreflang tags for multi-language
- [x] Open Graph meta tags
- [x] Twitter Card meta tags
- [x] Structured data (JSON-LD)
- [x] Blog with keyword-rich content
- [ ] Keywords meta on all pages (partial)

## Recent Updates

### 2024-12-28
- Major homepage redesign
  - Virtual try-on on first screen
  - Simplified navigation
  - Added blog cover images
  - Fixed Showcase section images
- Added new pages: about, faq, contact, privacy, terms, feed.xml
- Expanded blog to 20 articles
- Generated 32 images (20 blog + 12 landing)
- Full multilingual content for all new pages

## Known Issues

- Some pages missing keywords meta tag (about, faq, contact, try-on)
- Non-English locales have `noindex` to avoid duplicate content issues

## Contact

- General: hello@dressmeai.com
- Support: support@dressmeai.com
- Business: business@dressmeai.com
