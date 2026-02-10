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
          {/* Ezoic Privacy Scripts - must load first */}
          <script data-cfasync="false" src="https://cmp.gatekeeperconsent.com/min.js" />
          <script data-cfasync="false" src="https://the.gatekeeperconsent.com/cmp.min.js" />

          {/* Ezoic Header Script */}
          <script async src="//www.ezojs.com/ezoic/sa.min.js" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.ezstandalone = window.ezstandalone || {};
                ezstandalone.cmd = ezstandalone.cmd || [];
              `,
            }}
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
