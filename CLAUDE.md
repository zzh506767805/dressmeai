# DressMeAI Project Documentation

## Project Overview

DressMeAI is an AI-powered virtual try-on platform that allows users to visualize how clothes look on their body before purchasing. The platform uses advanced AI technology to create realistic virtual fitting experiences.

**Live URL**: https://dressmeai.com

## Tech Stack

- **Framework**: Next.js 14.1.0 (Pages Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth**: NextAuth v4 + Google OAuth + PrismaAdapter (database sessions)
- **Database**: Prisma v6 + Azure PostgreSQL Flexible Server (`dressmeai-db.postgres.database.azure.com`)
- **Payment**: Stripe (subscriptions + single $1 payments, no webhook — uses verify-payment polling)
- **Internationalization**: next-intl (9 languages)
- **Deployment**: Azure Static Web Apps (auto-deploy via GitHub Actions on push to main)
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
│   ├── index.tsx          # Homepage with virtual try-on (all generation happens here)
│   ├── pricing.tsx        # Subscription pricing page (Basic/Pro/Unlimited, monthly/annual)
│   ├── account.tsx        # User account, subscription status, history
│   ├── success.tsx        # Payment verification + redirect (subscriptions → account, single → homepage)
│   ├── try-on.tsx         # Dedicated try-on page (legacy)
│   ├── history.tsx        # User try-on history (localStorage-based, legacy)
│   ├── blog/              # Blog pages
│   ├── about.tsx, faq.tsx, contact.tsx, privacy.tsx, terms.tsx
│   ├── feed.xml.tsx       # RSS feed
│   ├── cancel.tsx         # Payment cancel
│   └── api/
│       ├── auth/[...nextauth].ts  # NextAuth Google OAuth
│       ├── create-payment.ts      # Stripe single $1 payment
│       ├── create-subscription.ts # Stripe subscription checkout
│       ├── verify-payment.ts      # Verify + activate payment (replaces webhook)
│       ├── check-credits.ts       # Check user credits + expire subscriptions
│       ├── use-credit.ts          # Deduct 1 credit atomically + create TryOnJob
│       ├── update-job.ts          # Update TryOnJob status/result
│       ├── upload.ts              # Upload image to Azure Blob (10MB limit)
│       ├── tryon.ts               # Call DashScope AI try-on API
│       ├── status.ts              # Poll DashScope task status
│       ├── webhook.ts             # Stripe webhook (backup, not primary)
│       ├── stripe/portal.ts       # Stripe billing portal (unused)
│       └── user/history.ts        # User try-on history from DB
├── components/
│   ├── UserMenu.tsx       # Login/user dropdown (Google sign-in + avatar menu)
│   └── ...                # ImageUpload, EzoicAd, LanguageSwitcher, etc.
├── lib/
│   ├── auth.ts            # NextAuth config (Google Provider + PrismaAdapter)
│   ├── db.ts              # Prisma client singleton
│   ├── stripe.ts          # Stripe client singleton
│   └── pricing.ts         # Plan definitions + pricing helpers
├── prisma/
│   └── schema.prisma      # DB schema (User, Account, Session, Payment, TryOnJob, VerificationToken)
├── types/
│   └── next-auth.d.ts     # Session type augmentation (id, credits, subscriptionStatus)
├── messages/              # i18n translations (9 languages)
├── public/                # Static assets
├── i18n/                  # i18n configuration
├── utils/                 # Utility functions
└── styles/                # Global styles
```

## Key Features

### 1. Virtual Try-On
- Upload model photo + clothing photo
- AI generates realistic try-on result
- All generation happens on homepage (unified flow)

### 2. Auth & Subscription
- Google OAuth login (required to generate)
- 3 paid plans: Basic ($5.90/mo), Pro ($12.90/mo), Unlimited ($29.90/mo)
- Annual billing with ~17% discount (e.g. $4.90/mo billed $58.80/yr)
- Annual plans get 12x monthly credits upfront; Unlimited = 999999
- Single $1 per try-on payment (adds 1 credit, then consumed immediately)
- No webhook dependency — verify-payment API polls Stripe and updates DB
- Subscription expiry checked on each credit check; expired → credits cleared to 0

### 3. Generation Flow
- **Not logged in** → Click Generate → Google sign-in → back to homepage
- **Logged in with credits** → Click Generate → direct generation on homepage
- **Logged in, no credits** → Click Generate → redirect to /pricing → subscribe or $1 single pay
- **After $1 payment** → Stripe → /success (verify + add 1 credit) → redirect to homepage → auto-generate from localStorage images
- **After subscription** → Stripe → /success (verify + activate plan) → redirect to /account

### 4. Multi-language Support
- 9 languages with full translations
- Locale-based routing
- SEO-optimized for each language

### 5. Blog System
- 20 SEO-optimized articles
- Topics: AI fashion, virtual try-on technology
- Multilingual content

### 6. SEO Optimization
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
# Base
NEXT_PUBLIC_BASE_URL=https://dressmeai.com

# Database (Azure PostgreSQL Flexible Server)
DATABASE_URL=postgresql://user:pass@dressmeai-db.postgres.database.azure.com:5432/dressmeai?sslmode=require

# Auth (NextAuth + Google OAuth)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://dressmeai.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# AI (DashScope)
ALIYUN_API_KEY=xxx

# Azure Blob Storage (image upload)
AZURE_STORAGE_ACCOUNT=dressmeaiupload
AZURE_STORAGE_KEY=xxx
AZURE_STORAGE_CONTAINER=tryon-images
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

## Database Schema (Prisma)

- **User** — id, email, name, image, subscriptionStatus (FREE/BASIC/PRO), subscriptionExpiry, credits
- **Account** — NextAuth OAuth account linking (Google)
- **Session** — NextAuth database sessions
- **Payment** — Stripe payment records (stripeSessionId unique, mode: subscription/payment)
- **TryOnJob** — Generation history (status: PENDING/PROCESSING/COMPLETED/FAILED, resultImageUrl)
- **VerificationToken** — NextAuth verification tokens

## Recent Updates

### 2026-03-23
- Added Google OAuth login (NextAuth v4 + PrismaAdapter)
- Added Azure PostgreSQL database (Prisma v6)
- Added subscription system: Basic/Pro/Unlimited with monthly and annual billing
- Added single $1 try-on payment
- Unified generation flow — all try-ons on homepage
- Added pricing page, account page, user menu
- Payment verification via polling (no webhook dependency)
- TryOnJob tracking in database with status updates

### 2024-12-28
- Major homepage redesign
- Added new pages: about, faq, contact, privacy, terms, feed.xml
- Expanded blog to 20 articles
- Full multilingual content for all new pages

## Known Issues

- Some pages missing keywords meta tag (about, faq, contact, try-on)
- Non-English locales have `noindex` to avoid duplicate content issues
- `pages/api/stripe/portal.ts` exists but is unused (Manage Billing removed from UI)

## Contact

- Email: zeta@myowncoach.online
