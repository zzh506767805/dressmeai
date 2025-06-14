import type { Metadata } from 'next'
import GoogleAnalytics from '../components/Analytics/GoogleAnalytics'

export const metadata: Metadata = {
  metadataBase: new URL('https://dressmeai.com'),
  title: {
    template: '%s | DressMeAI',
    default: 'DressMeAI - AI Virtual Try-On & Style Generator',
  },
  description: 'Transform your fashion experience with DressMeAI. Try on clothes virtually, get AI-generated outfits, and receive personalized style recommendations.',
  keywords: ['AI virtual try-on', 'fashion AI', 'virtual fitting room', 'style recommendations', 'AI fashion assistant'],
  authors: [{ name: 'DressMeAI Team' }],
  creator: 'DressMeAI',
  publisher: 'DressMeAI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/icons/favicon.ico',
    shortcut: '/icons/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        url: '/icons/icon-192.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        url: '/icons/icon-512.png',
      },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: 'DressMeAI',
    title: 'DressMeAI - AI Virtual Try-On & Style Generator',
    description: 'Experience the future of fashion with AI virtual try-on and personalized style recommendations.',
    images: [
      {
        url: '/images/og-banner.jpg',
        width: 1200,
        height: 630,
        alt: 'DressMeAI - AI Fashion Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@dressmeai',
    creator: '@dressmeai',
    images: '/images/og-banner.jpg',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  )
} 