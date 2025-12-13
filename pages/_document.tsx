import Document, { Html, Head, Main, NextScript, DocumentContext, DocumentInitialProps } from 'next/document'
import { defaultLocale, isSupportedLocale } from '../i18n/config'

interface CustomDocumentProps extends DocumentInitialProps {
  locale?: string
}

class MyDocument extends Document<CustomDocumentProps> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx)
    return {
      ...initialProps,
      locale: ctx.locale
    }
  }

  render() {
    const locale = isSupportedLocale(this.props.locale) ? this.props.locale : defaultLocale

    return (
      <Html lang={locale}>
        <Head>
          {/* Google AdSense */}
          <script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8366783560808157"
            crossOrigin="anonymous"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
