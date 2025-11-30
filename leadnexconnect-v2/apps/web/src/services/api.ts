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
    batchId?: string
  }) => api.get('/leads', { params }),
  getBatches: () => api.get('/leads/batches'),
  getBatchAnalytics: (batchId: string) => api.get(`/leads/batches/${batchId}/analytics`),
  getLeadById: (id: string) => api.get(`/leads/${id}`),
  deleteLead: (id: string) => api.delete(`/leads/${id}`),
  updateLead: (id: string, data: any) => api.put(`/leads/${id}`, data),
  createLead: (data: any) => api.post('/leads', data),
}

// Campaigns endpoints
export const campaignsAPI = {
  createCampaignFromBatch: (data: {
    name: string
    description?: string
    batchId: string
    workflowId?: string
    emailTemplateId?: string
    startImmediately?: boolean
  }) => api.post('/campaigns/from-batch', data),
  getCampaigns: () => api.get('/campaigns'),
  getCampaign: (id: string) => api.get(`/campaigns/${id}`),
}

// AI endpoints
export const aiAPI = {
  generateEmailContent: (data: {
    industry?: string
    companyName?: string
    contactName?: string
    website?: string
    location?: string
    companySize?: string
    tone?: 'professional' | 'casual' | 'friendly'
    purpose?: string
    productService?: string
    callToAction?: string
  }) => api.post('/ai/generate-email', data),
  testConnection: () => api.get('/ai/test'),
}

export default api
