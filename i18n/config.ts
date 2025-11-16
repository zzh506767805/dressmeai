import settings from './settings.json'

export interface LocaleOption {
  code: string
  label: string
  nativeName: string
  region: string
}

const localeMetadata = settings.locales as LocaleOption[]

export type Locale = (typeof localeMetadata)[number]['code']

export const locales = localeMetadata.map(locale => locale.code) as Locale[]
export const defaultLocale = settings.defaultLocale as Locale
export const localePrefix = (settings.localePrefix || 'as-needed') as
  | 'as-needed'
  | 'always'
  | 'never'

export const getLocaleMeta = (code: string): LocaleOption | undefined =>
  localeMetadata.find(locale => locale.code === code)

export const getAllLocaleMeta = () => localeMetadata

export const isSupportedLocale = (code?: string | null): code is Locale =>
  !!code && locales.includes(code as Locale)
