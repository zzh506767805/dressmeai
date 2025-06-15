// 安全的localStorage工具函数

export const safeGetItem = (key: string): string | null => {
  try {
    if (typeof window === 'undefined') return null
    const value = localStorage.getItem(key)
    if (value === 'undefined' || value === 'null' || value === '') {
      localStorage.removeItem(key)
      return null
    }
    return value
  } catch (error) {
    console.error(`Error getting localStorage item ${key}:`, error)
    return null
  }
}

export const safeSetItem = (key: string, value: string): boolean => {
  try {
    if (typeof window === 'undefined') return false
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.error(`Error setting localStorage item ${key}:`, error)
    return false
  }
}

export const safeRemoveItem = (key: string): boolean => {
  try {
    if (typeof window === 'undefined') return false
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`Error removing localStorage item ${key}:`, error)
    return false
  }
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