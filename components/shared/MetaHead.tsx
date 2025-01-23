import Head from 'next/head'

interface MetaHeadProps {
  title: string
  description: string
  keywords?: string
}

export default function MetaHead({ 
  title, 
  description, 
  keywords = 'AI virtual try-on, fashion AI, style recommendations'
}: MetaHeadProps) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      
      {/* Favicon and App Icons */}
      <link rel="icon" href="/icons/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon.ico" />
      <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
      
      {/* PWA Settings */}
      <meta name="application-name" content="DressMeAI" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="DressMeAI" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="msapplication-TileColor" content="#4F46E5" />
      <meta name="msapplication-tap-highlight" content="no" />
      <meta name="theme-color" content="#4F46E5" />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content="DressMeAI" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Head>
  )
} 