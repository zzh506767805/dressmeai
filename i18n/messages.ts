import enCommon from '../messages/en/common.json'
import enLanding from '../messages/en/landing.json'
import enComponents from '../messages/en/components.json'
import enBlog from '../messages/en/blog.json'
import enLegal from '../messages/en/legal.json'
import enPages from '../messages/en/pages.json'
import zhCommon from '../messages/zh-CN/common.json'
import zhLanding from '../messages/zh-CN/landing.json'
import zhComponents from '../messages/zh-CN/components.json'
import zhBlog from '../messages/zh-CN/blog.json'
import zhLegal from '../messages/zh-CN/legal.json'
import zhPages from '../messages/zh-CN/pages.json'
import koCommon from '../messages/ko/common.json'
import koLanding from '../messages/ko/landing.json'
import koComponents from '../messages/ko/components.json'
import koBlog from '../messages/ko/blog.json'
import koLegal from '../messages/ko/legal.json'
import koPages from '../messages/ko/pages.json'
import jaCommon from '../messages/ja/common.json'
import jaLanding from '../messages/ja/landing.json'
import jaComponents from '../messages/ja/components.json'
import jaBlog from '../messages/ja/blog.json'
import jaLegal from '../messages/ja/legal.json'
import jaPages from '../messages/ja/pages.json'
import ruCommon from '../messages/ru/common.json'
import ruLanding from '../messages/ru/landing.json'
import ruComponents from '../messages/ru/components.json'
import ruBlog from '../messages/ru/blog.json'
import ruLegal from '../messages/ru/legal.json'
import ruPages from '../messages/ru/pages.json'
import frCommon from '../messages/fr/common.json'
import frLanding from '../messages/fr/landing.json'
import frComponents from '../messages/fr/components.json'
import frBlog from '../messages/fr/blog.json'
import frLegal from '../messages/fr/legal.json'
import frPages from '../messages/fr/pages.json'
import deCommon from '../messages/de/common.json'
import deLanding from '../messages/de/landing.json'
import deComponents from '../messages/de/components.json'
import deBlog from '../messages/de/blog.json'
import deLegal from '../messages/de/legal.json'
import dePages from '../messages/de/pages.json'
import esCommon from '../messages/es/common.json'
import esLanding from '../messages/es/landing.json'
import esComponents from '../messages/es/components.json'
import esBlog from '../messages/es/blog.json'
import esLegal from '../messages/es/legal.json'
import esPages from '../messages/es/pages.json'
import itCommon from '../messages/it/common.json'
import itLanding from '../messages/it/landing.json'
import itComponents from '../messages/it/components.json'
import itBlog from '../messages/it/blog.json'
import itLegal from '../messages/it/legal.json'
import itPages from '../messages/it/pages.json'
import { defaultLocale, type Locale } from './config'

const buildMessages = (
  common: unknown,
  landing: unknown,
  components: unknown,
  blog: unknown,
  legal: unknown,
  pages: unknown
) => ({
  common,
  landing,
  components,
  blog,
  legal,
  pages
})

export const messageCatalog: Record<Locale, Record<string, unknown>> = {
  en: buildMessages(enCommon, enLanding, enComponents, enBlog, enLegal, enPages),
  'zh-CN': buildMessages(zhCommon, zhLanding, zhComponents, zhBlog, zhLegal, zhPages),
  ko: buildMessages(koCommon, koLanding, koComponents, koBlog, koLegal, koPages),
  ja: buildMessages(jaCommon, jaLanding, jaComponents, jaBlog, jaLegal, jaPages),
  ru: buildMessages(ruCommon, ruLanding, ruComponents, ruBlog, ruLegal, ruPages),
  fr: buildMessages(frCommon, frLanding, frComponents, frBlog, frLegal, frPages),
  de: buildMessages(deCommon, deLanding, deComponents, deBlog, deLegal, dePages),
  es: buildMessages(esCommon, esLanding, esComponents, esBlog, esLegal, esPages),
  it: buildMessages(itCommon, itLanding, itComponents, itBlog, itLegal, itPages)
}

export const getMessages = (locale?: string) => {
  if (locale && locale in messageCatalog) {
    return messageCatalog[locale as Locale]
  }
  return messageCatalog[defaultLocale]
}
