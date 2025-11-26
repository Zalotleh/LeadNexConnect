import api from './api'

export interface Lead {
  id: string
  companyName: string
  contactName: string
  email: string
  phone?: string
  website?: string
  industry?: string
  location?: string
  city?: string
  country?: string
  status: string
  score?: number
  qualityScore?: number
  digitalMaturityScore?: number
  bookingPotential?: string
  hasBookingKeywords?: boolean
  bookingKeywordScore?: number
  currentBookingTool?: string
  hasAppointmentForm?: boolean
  hasOnlineBooking?: boolean
  hasMultiLocation?: boolean
  servicesCount?: number
  hasGoogleMapsListing?: boolean
  googleRating?: number
  googleReviewCount?: number
  isDecisionMaker?: boolean
  hasWeekendHours?: boolean
  responseTime?: string
  priceLevel?: string
  source?: string
  createdAt: string
}

export const leadsService = {
  getAll: async (params?: { status?: string; search?: string }) => {
    const { data } = await api.get('/leads', { params })
    return data
  },

  getById: async (id: string) => {
    const { data } = await api.get(`/leads/${id}`)
    return data
  },

  create: async (lead: Partial<Lead>) => {
    const { data } = await api.post('/leads', lead)
    return data
  },

  update: async (id: string, lead: Partial<Lead>) => {
    const { data } = await api.put(`/leads/${id}`, lead)
    return data
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/leads/${id}`)
    return data
  },

  import: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/leads/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
}

export default leadsService
