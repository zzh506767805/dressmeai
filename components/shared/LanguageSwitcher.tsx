import { useRouter } from 'next/router'
import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { defaultLocale, getAllLocaleMeta, isSupportedLocale } from '../../i18n/config'

interface LanguageSwitcherProps {
  className?: string
}

const localeOptions = getAllLocaleMeta()

export default function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const router = useRouter()
  const t = useTranslations('common.language')
  const currentLocale = isSupportedLocale(router.locale) ? router.locale : defaultLocale

  const handleChange = useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextLocale = event.target.value
      if (nextLocale === currentLocale) {
        return
      }

      await router.push(router.asPath, router.asPath, { locale: nextLocale })
    },
    [currentLocale, router]
  )

  return (
    <label className={`flex items-center gap-2 text-sm text-gray-600 ${className ?? ''}`}>
      <span className="font-medium">{t('label')}</span>
      <span className="sr-only">{t('ariaLabel')}</span>
      <select
        aria-label={t('ariaLabel')}
        className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        value={currentLocale}
        onChange={handleChange}
      >
        {localeOptions.map(locale => (
          <option key={locale.code} value={locale.code}>
            {locale.nativeName}
          </option>
        ))}
      </select>
    </label>
  )
}
