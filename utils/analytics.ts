// Google Analytics 工具函数
declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

const GA_TRACKING_ID = 'G-427HD7RMNW'

// 页面浏览事件
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
      page_title: document.title,
      page_location: window.location.href,
    })
  }
}

// 通用事件跟踪
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// 业务相关的跟踪事件
export const analytics = {
  // 虚拟试衣相关事件
  virtualTryOn: {
    start: () => trackEvent('virtual_tryon_start', 'engagement', 'ai_fashion'),
    upload_person: () => trackEvent('upload_person_image', 'virtual_tryon', 'image_upload'),
    upload_clothes: () => trackEvent('upload_clothes_image', 'virtual_tryon', 'image_upload'),
    generate_start: () => trackEvent('generate_start', 'virtual_tryon', 'ai_processing'),
    generate_success: () => trackEvent('generate_success', 'virtual_tryon', 'ai_success'),
    generate_error: (error: string) => trackEvent('generate_error', 'virtual_tryon', error),
    save_result: () => trackEvent('save_result', 'virtual_tryon', 'user_action'),
    share_result: (platform: string) => trackEvent('share_result', 'social', platform),
  },

  // 用户互动事件
  user: {
    login: () => trackEvent('login', 'engagement', 'user_authentication'),
    upgrade: (plan: string) => trackEvent('upgrade_click', 'conversion', plan),
    payment_success: (plan: string, amount: number) => trackEvent('purchase', 'ecommerce', plan, amount),
    payment_failed: (reason: string) => trackEvent('payment_failed', 'ecommerce', reason),
  },

  // 内容互动事件
  content: {
    faq_view: (question: string) => trackEvent('faq_view', 'content', question),
    tutorial_view: (step: string) => trackEvent('tutorial_view', 'content', step),
  },

  // 搜索和导航
  navigation: {
    search: (query: string) => trackEvent('search', 'navigation', query),
    internal_link_click: (link: string) => trackEvent('internal_link_click', 'navigation', link),
    external_link_click: (link: string) => trackEvent('external_link_click', 'navigation', link),
    menu_click: (item: string) => trackEvent('menu_click', 'navigation', item),
  },

  // SEO相关事件
  seo: {
    organic_landing: (page: string) => trackEvent('organic_landing', 'seo', page),
    keyword_ranking: (keyword: string, position: number) => trackEvent('keyword_ranking', 'seo', keyword, position),
    featured_snippet: (keyword: string) => trackEvent('featured_snippet', 'seo', keyword),
    social_referral: (platform: string) => trackEvent('social_referral', 'seo', platform),
  },

  // 性能监控
  performance: {
    page_load_time: (time: number) => trackEvent('page_load_time', 'performance', 'load_time', time),
    api_response_time: (endpoint: string, time: number) => trackEvent('api_response_time', 'performance', endpoint, time),
    error_occurred: (error: string, page: string) => trackEvent('error_occurred', 'technical', `${page}_${error}`),
  }
}

// 转化事件跟踪
export const trackConversion = (conversionType: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: GA_TRACKING_ID,
      event_category: 'conversion',
      event_label: conversionType,
      value: value || 1,
    })
  }
}

// 增强电商跟踪
export const trackPurchase = (transactionId: string, items: any[], revenue: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: revenue,
      currency: 'USD',
      items: items,
    })
  }
}

// 自定义维度跟踪
export const setCustomDimension = (dimension: string, value: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      [`custom_map.${dimension}`]: value,
    })
  }
}

// 用户属性设置
export const setUserProperties = (properties: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      user_properties: properties,
    })
  }
}

// A/B测试跟踪
export const trackABTest = (testName: string, variant: string) => {
  trackEvent('ab_test', 'experimentation', `${testName}_${variant}`)
  setCustomDimension('ab_test', `${testName}:${variant}`)
}

// 实时事件批量发送（性能优化）
let eventQueue: any[] = []
let eventTimer: NodeJS.Timeout | null = null

export const queueEvent = (eventData: any) => {
  eventQueue.push(eventData)
  
  if (eventTimer) {
    clearTimeout(eventTimer)
  }
  
  eventTimer = setTimeout(() => {
    if (eventQueue.length > 0) {
      eventQueue.forEach(event => {
        window.gtag('event', event.action, event.parameters)
      })
      eventQueue = []
    }
  }, 1000) // 1秒后批量发送
} 