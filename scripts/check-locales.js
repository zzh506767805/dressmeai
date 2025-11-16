const fs = require('fs')
const path = require('path')

const messagesDir = path.join(__dirname, '..', 'messages')
const baseLocale = 'en'

const loadLocaleMessages = (locale) => {
  const localeDir = path.join(messagesDir, locale)
  const files = ['common.json', 'landing.json', 'components.json']
  const result = {}
  for (const file of files) {
    const filePath = path.join(localeDir, file)
    if (!fs.existsSync(filePath)) {
      console.error(`Missing message file: ${filePath}`)
      process.exit(1)
    }
    const namespace = path.basename(file, '.json')
    result[namespace] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  }
  return result
}

const flattenKeys = (value, prefix = '', result = new Set()) => {
  const currentPrefix = prefix
  if (value === null || typeof value !== 'object') {
    if (currentPrefix) {
      result.add(currentPrefix)
    }
    return result
  }

  if (Array.isArray(value)) {
    if (value.length === 0 && currentPrefix) {
      result.add(currentPrefix)
    }
    value.forEach((item, index) => {
      const nextPrefix = currentPrefix ? `${currentPrefix}[${index}]` : `[${index}]`
      flattenKeys(item, nextPrefix, result)
    })
    return result
  }

  Object.entries(value).forEach(([key, nested]) => {
    const nextPrefix = currentPrefix ? `${currentPrefix}.${key}` : key
    flattenKeys(nested, nextPrefix, result)
  })

  return result
}

const baseMessages = loadLocaleMessages(baseLocale)
const baseKeys = flattenKeys(baseMessages)

const locales = fs
  .readdirSync(messagesDir)
  .filter(entry => fs.statSync(path.join(messagesDir, entry)).isDirectory() && entry !== baseLocale)

let hasError = false

locales.forEach(locale => {
  const localeMessages = loadLocaleMessages(locale)
  const localeKeys = flattenKeys(localeMessages)

  const missing = [...baseKeys].filter(key => !localeKeys.has(key))
  const extra = [...localeKeys].filter(key => !baseKeys.has(key))

  if (missing.length || extra.length) {
    hasError = true
    console.error(`\nLocale "${locale}" has mismatched keys:`)
    if (missing.length) {
      console.error(`  Missing (${missing.length}):`)
      missing.slice(0, 10).forEach(key => console.error(`    - ${key}`))
      if (missing.length > 10) {
        console.error('    ...')
      }
    }
    if (extra.length) {
      console.error(`  Extra (${extra.length}):`)
      extra.slice(0, 10).forEach(key => console.error(`    - ${key}`))
      if (extra.length > 10) {
        console.error('    ...')
      }
    }
  }
})

if (hasError) {
  console.error('\nLocale check failed. Please align translation files with the base locale.')
  process.exit(1)
}

console.log('All locale files are aligned with the base locale.')
