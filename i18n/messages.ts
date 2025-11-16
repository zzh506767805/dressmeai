import enCommon from '../messages/en/common.json'
import enLanding from '../messages/en/landing.json'
import enComponents from '../messages/en/components.json'
import enBlog from '../messages/en/blog.json'
import zhCommon from '../messages/zh-CN/common.json'
import zhLanding from '../messages/zh-CN/landing.json'
import zhComponents from '../messages/zh-CN/components.json'
import zhBlog from '../messages/zh-CN/blog.json'
import koCommon from '../messages/ko/common.json'
import koLanding from '../messages/ko/landing.json'
import koComponents from '../messages/ko/components.json'
import koBlog from '../messages/ko/blog.json'
import jaCommon from '../messages/ja/common.json'
import jaLanding from '../messages/ja/landing.json'
import jaComponents from '../messages/ja/components.json'
import jaBlog from '../messages/ja/blog.json'
import ruCommon from '../messages/ru/common.json'
import ruLanding from '../messages/ru/landing.json'
import ruComponents from '../messages/ru/components.json'
import ruBlog from '../messages/ru/blog.json'
import frCommon from '../messages/fr/common.json'
import frLanding from '../messages/fr/landing.json'
import frComponents from '../messages/fr/components.json'
import frBlog from '../messages/fr/blog.json'
import deCommon from '../messages/de/common.json'
import deLanding from '../messages/de/landing.json'
import deComponents from '../messages/de/components.json'
import deBlog from '../messages/de/blog.json'
import esCommon from '../messages/es/common.json'
import esLanding from '../messages/es/landing.json'
import esComponents from '../messages/es/components.json'
import esBlog from '../messages/es/blog.json'
import itCommon from '../messages/it/common.json'
import itLanding from '../messages/it/landing.json'
import itComponents from '../messages/it/components.json'
import itBlog from '../messages/it/blog.json'
import { defaultLocale, type Locale } from './config'

const buildMessages = (common: unknown, landing: unknown, components: unknown, blog: unknown) => ({
  common,
  landing,
  components,
  blog
})

export const messageCatalog: Record<Locale, Record<string, unknown>> = {
  en: buildMessages(enCommon, enLanding, enComponents, enBlog),
  'zh-CN': buildMessages(zhCommon, zhLanding, zhComponents, zhBlog),
  ko: buildMessages(koCommon, koLanding, koComponents, koBlog),
  ja: buildMessages(jaCommon, jaLanding, jaComponents, jaBlog),
  ru: buildMessages(ruCommon, ruLanding, ruComponents, ruBlog),
  fr: buildMessages(frCommon, frLanding, frComponents, frBlog),
  de: buildMessages(deCommon, deLanding, deComponents, deBlog),
  es: buildMessages(esCommon, esLanding, esComponents, esBlog),
  it: buildMessages(itCommon, itLanding, itComponents, itBlog)
}

export const getMessages = (locale?: string) => {
  if (locale && locale in messageCatalog) {
    return messageCatalog[locale as Locale]
  }
  return messageCatalog[defaultLocale]
}
