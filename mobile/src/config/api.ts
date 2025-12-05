import Constants from 'expo-constants';

export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  auth: {
    requestOtp: '/auth/request-otp',
    verifyOtp: '/auth/verify-otp',
    logout: '/auth/logout',
    me: '/me',
  },
  businesses: {
    list: '/businesses',
    create: '/businesses',
    get: (id: string) => `/businesses/${id}`,
    update: (id: string) => `/businesses/${id}`,
  },
  eligibility: {
    evaluate: (id: string) => `/businesses/${id}/eligibility/evaluate`,
    get: (id: string, year: number) => `/businesses/${id}/eligibility/${year}`,
  },
  transactions: {
    list: (businessId: string) => `/businesses/${businessId}/transactions`,
    create: (businessId: string) => `/businesses/${businessId}/transactions`,
    get: (id: string) => `/transactions/${id}`,
    update: (id: string) => `/transactions/${id}`,
    delete: (id: string) => `/transactions/${id}`,
  },
  documents: {
    uploadUrl: (businessId: string) => `/businesses/${businessId}/documents/upload-url`,
    list: (businessId: string) => `/businesses/${businessId}/documents`,
    create: (businessId: string) => `/businesses/${businessId}/documents`,
    get: (id: string) => `/documents/${id}`,
    update: (id: string) => `/documents/${id}`,
    delete: (id: string) => `/documents/${id}`,
  },
  reporting: {
    summary: (businessId: string, year: number) => `/businesses/${businessId}/reports/${year}/summary`,
    generatePack: (businessId: string, year: number) => `/businesses/${businessId}/reports/${year}/pack`,
  },
  obligations: {
    list: (businessId: string) => `/businesses/${businessId}/obligations`,
    generate: (businessId: string) => `/businesses/${businessId}/obligations/generate`,
  },
  alerts: {
    list: (businessId: string) => `/businesses/${businessId}/alerts`,
    markRead: (alertId: string) => `/alerts/${alertId}/read`,
  },
  knowledge: {
    list: '/knowledge/articles',
    get: (slug: string) => `/knowledge/articles/${slug}`,
  },
  plans: {
    list: '/plans',
    get: (id: string) => `/plans/${id}`,
  },
  subscriptions: {
    mine: '/subscriptions/me',
  },
};

