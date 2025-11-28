import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  timeout: 30000,
})

// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API Performance endpoints
export const apiPerformanceAPI = {
  getMonthlyReport: (params?: { month?: number; year?: number }) =>
    api.get('/performance/report', { params }),
  getROISummary: () => api.get('/performance/roi'),
  updateConversion: (data: {
    apiSource: string
    demosBooked?: number
    trialsStarted?: number
    customersAcquired?: number
  }) => api.post('/performance/conversion', data),
}

// Enhanced Dashboard endpoints
export const dashboardAPI = {
  getStats: () => api.get('/analytics/dashboard'),
  getLeadsByTier: () => api.get('/leads/by-tier'),
  getRecentLeads: (limit: number = 10) => api.get(`/leads?limit=${limit}&sort=-createdAt`),
}

// Enhanced Leads endpoints
export const leadsAPI = {
  generateLeads: (data: {
    batchName?: string
    industry: string
    country: string
    city?: string
    sources: string[]
    maxResults: number
  }) => api.post('/leads/generate', data),
  getLeads: (params?: {
    page?: number
    limit?: number
    search?: string
    tier?: string
    source?: string
    industry?: string
  }) => api.get('/leads', { params }),
  getBatches: () => api.get('/leads/batches'),
  getLeadById: (id: string) => api.get(`/leads/${id}`),
}

export default api
