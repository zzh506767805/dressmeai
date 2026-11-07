// 安全的localStorage工具函数

export const safeGetItem = (key: string): string | null => {
  try {
    if (typeof window === 'undefined') return null
    let value = localStorage.getItem(key)
    
    // 如果localStorage中没有数据，尝试从sessionStorage获取
    if (!value || value === 'undefined' || value === 'null' || value === '') {
      value = sessionStorage.getItem(key)
      if (value && value !== 'undefined' && value !== 'null' && value !== '') {
        // 如果从sessionStorage找到数据，恢复到localStorage
        localStorage.setItem(key, value)
        return value
      }
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
      return null
    }
    return value
  } catch (error) {
    console.error(`Error getting localStorage item ${key}:`, error)
    // 尝试从sessionStorage获取
    try {
      return sessionStorage.getItem(key)
    } catch (sessionError) {
      console.error(`Error getting sessionStorage item ${key}:`, sessionError)
      return null
    }
  }
}

export const safeSetItem = (key: string, value: string): boolean => {
  if (typeof window === 'undefined') return false
  let saved = false
  try { localStorage.setItem(key, value); saved = true } catch { /* Try the redirect-safe backup independently. */ }
  try { sessionStorage.setItem(key, value); saved = true } catch { /* Local storage may still have succeeded. */ }
  return saved
}

export const safeRemoveItem = (key: string): boolean => {
  if (typeof window === 'undefined') return false
  let removed = true
  try { localStorage.removeItem(key) } catch { removed = false }
  try { sessionStorage.removeItem(key) } catch { removed = false }
  return removed
}

export const safeParseJSON = <T>(value: string | null, defaultValue: T): T => {
  if (!value || value === 'undefined' || value === 'null') {
    return defaultValue
  }
  
  try {
    const parsed = JSON.parse(value)
    return parsed !== null && parsed !== undefined ? parsed : defaultValue
  } catch (error) {
    console.error('Error parsing JSON:', error)
    return defaultValue
  }
}

export const safeGetJSONItem = <T>(key: string, defaultValue: T): T => {
  const value = safeGetItem(key)
  return safeParseJSON(value, defaultValue)
}

export const safeSetJSONItem = <T>(key: string, value: T): boolean => {
  try {
    const jsonString = JSON.stringify(value)
    return safeSetItem(key, jsonString)
  } catch (error) {
    console.error(`Error stringifying value for ${key}:`, error)
    return false
  }
}
