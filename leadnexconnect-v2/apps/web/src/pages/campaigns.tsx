import Layout from '@/components/Layout'
import ConfirmDialog from '@/components/ConfirmDialog'
import ProgressDialog from '@/components/ProgressDialog'
import WorkflowSelector from '@/components/WorkflowSelector'
import { Plus, Play, Pause, Mail, X, ChevronLeft, ChevronRight, Check, Edit, Trash2, Eye, TrendingUp, Users, Send, MousePointer, Search, Database, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { INDUSTRIES, getIndustriesByCategory } from '@leadnex/shared'

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

interface CampaignFormData {
  name: string
  description: string
  industry: string
  targetCountries: string[]
  targetCities: string[]
  companySize: string
  leadsPerDay: number
  usesLinkedin: boolean
  usesApollo: boolean
  usesPeopleDL: boolean
  usesGooglePlaces: boolean
  workflowId: string | null
  emailTemplateId: string
  scheduleType: 'manual' | 'daily'
  scheduleTime: string
}

interface Campaign {
  id: string
  name: string
  description?: string
  industry?: string
  status: string
  scheduleType?: string
  campaignType?: string
  leadsGenerated: number
  emailsSent: number
  emailsOpened: number
  emailsClicked: number
  responsesReceived: number
  createdAt: string
}

export default function Campaigns() {
  const [dateViewMode, setDateViewMode] = useState<'monthly' | 'allTime'>('allTime')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showModal, setShowModal] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showStartConfirm, setShowStartConfirm] = useState(false)
  const [campaignToStart, setCampaignToStart] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [showPauseConfirm, setShowPauseConfirm] = useState(false)
  const [campaignToPause, setCampaignToPause] = useState<string | null>(null)
  const [isPausing, setIsPausing] = useState(false)
  const [newCountry, setNewCountry] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [campaignTypeFilter, setCampaignTypeFilter] = useState<'all' | 'lead_generation' | 'outreach' | 'fully_automated'>('all')
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set())
  const [showBulkStartConfirm, setShowBulkStartConfirm] = useState(false)
  const [showBulkPauseConfirm, setShowBulkPauseConfirm] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [progressTitle, setProgressTitle] = useState('')
  const [progressMessage, setProgressMessage] = useState('')
  
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    description: '',
    industry: '',
    targetCountries: [],
    targetCities: [],
    companySize: '',
    leadsPerDay: 50,
    usesLinkedin: false,
    usesApollo: true,
    usesPeopleDL: false,
    usesGooglePlaces: true,
    workflowId: null,
    emailTemplateId: '',
    scheduleType: 'manual',
    scheduleTime: '09:00',
  })

  // Use shared industries grouped by category
  const industriesByCategory = getIndustriesByCategory()

  const countries = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Other']
  const companySizes = ['1-10', '11-50', '51-200', '201-500', '500+']

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const response = await api.get('/campaigns')
      setCampaigns(response.data.data || [])
    } catch (error: any) {
      toast.error('Failed to load campaigns')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCampaign = () => {
    setShowModal(true)
    setCurrentStep(1)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setCurrentStep(1)
    // Reset form
    setFormData({
      name: '',
      description: '',
      industry: '',
      targetCountries: [],
      targetCities: [],
      companySize: '',
      leadsPerDay: 50,
      usesLinkedin: false,
      usesApollo: true,
      usesPeopleDL: false,
      usesGooglePlaces: true,
      workflowId: null,
      emailTemplateId: '',
      scheduleType: 'manual',
      scheduleTime: '09:00',
    })
  }

  const handleNext = () => {
    if (currentStep === 1 && !formData.name) {
      toast.error('Campaign name is required')
      return
    }
    if (currentStep === 2 && !formData.industry) {
      toast.error('Industry is required')
      return
    }
    if (currentStep === 3 && !formData.usesLinkedin && !formData.usesApollo && !formData.usesPeopleDL && !formData.usesGooglePlaces) {
      toast.error('Select at least one lead source')
      return
    }
    setCurrentStep(currentStep + 1)
  }

  const handleBack = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      const response = await api.post('/campaigns', formData)
      toast.success('Campaign created successfully!')
      setCampaigns([response.data.data, ...campaigns])
      handleCloseModal()
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create campaign')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartCampaign = async (campaignId: string) => {
    setCampaignToStart(campaignId)
    setShowStartConfirm(true)
  }

  const confirmStartCampaign = async () => {
    if (!campaignToStart) return
    
    try {
      setIsStarting(true)
      setShowStartConfirm(false)
      
      // Show progress dialog
      setProgressTitle('Starting Campaign')
      setProgressMessage('Initializing campaign execution...')
      setShowProgressDialog(true)
      
      await api.post(`/campaigns/${campaignToStart}/start`)
      
      setProgressMessage('Campaign started successfully!')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setShowProgressDialog(false)
      toast.success('Campaign started successfully!')
      fetchCampaigns()
      setCampaignToStart(null)
    } catch (error: any) {
      setShowProgressDialog(false)
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to start campaign'
      toast.error(errorMessage)
      console.error('Failed to start campaign:', error)
    } finally {
      setIsStarting(false)
    }
  }

  const handlePauseCampaign = async (campaignId: string) => {
    setCampaignToPause(campaignId)
    setShowPauseConfirm(true)
  }

  const confirmPauseCampaign = async () => {
    if (!campaignToPause) return
    
    try {
      setIsPausing(true)
      await api.post(`/campaigns/${campaignToPause}/pause`)
      toast.success('Campaign paused successfully!')
      fetchCampaigns()
      setShowPauseConfirm(false)
      setCampaignToPause(null)
    } catch (error: any) {
      toast.error('Failed to pause campaign')
      console.error(error)
    } finally {
      setIsPausing(false)
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    setCampaignToDelete(campaignId)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteCampaign = async () => {
    if (!campaignToDelete) return
    
    try {
      setIsDeleting(true)
      await api.delete(`/campaigns/${campaignToDelete}`)
      toast.success('Campaign deleted successfully!')
      fetchCampaigns()
      setShowDeleteConfirm(false)
      setCampaignToDelete(null)
    } catch (error: any) {
      toast.error('Failed to delete campaign')
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Bulk Actions
  const handleSelectCampaign = (campaignId: string) => {
    const newSelected = new Set(selectedCampaigns)
    if (newSelected.has(campaignId)) {
      newSelected.delete(campaignId)
    } else {
      newSelected.add(campaignId)
    }
    setSelectedCampaigns(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedCampaigns.size === filteredCampaigns.length) {
      setSelectedCampaigns(new Set())
    } else {
      setSelectedCampaigns(new Set(filteredCampaigns.map(c => c.id)))
    }
  }

  const handleBulkStart = () => {
    setShowBulkStartConfirm(true)
  }

  const handleBulkPause = () => {
    setShowBulkPauseConfirm(true)
  }

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirm(true)
  }

  const confirmBulkStart = async () => {
    try {
      setIsBulkProcessing(true)
      const campaignsToStart = Array.from(selectedCampaigns).filter(id => {
        const campaign = campaigns.find(c => c.id === id)
        return campaign && campaign.status !== 'active'
      })

      if (campaignsToStart.length === 0) {
        toast.success('All selected campaigns are already active')
        setShowBulkStartConfirm(false)
        return
      }

      let successCount = 0
      let failCount = 0

      for (const campaignId of campaignsToStart) {
        try {
          await api.post(`/campaigns/${campaignId}/start`)
          successCount++
        } catch (error) {
          failCount++
          console.error(`Failed to start campaign ${campaignId}:`, error)
        }
      }

      if (successCount > 0) {
        toast.success(`Started ${successCount} campaign${successCount > 1 ? 's' : ''} successfully!`)
      }
      if (failCount > 0) {
        toast.error(`Failed to start ${failCount} campaign${failCount > 1 ? 's' : ''}`)
      }

      fetchCampaigns()
      setSelectedCampaigns(new Set())
      setShowBulkStartConfirm(false)
    } catch (error: any) {
      toast.error('Failed to start campaigns')
      console.error(error)
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const confirmBulkPause = async () => {
    try {
      setIsBulkProcessing(true)
      const campaignsToPause = Array.from(selectedCampaigns).filter(id => {
        const campaign = campaigns.find(c => c.id === id)
        return campaign && campaign.status === 'active'
      })

      if (campaignsToPause.length === 0) {
        toast.success('No active campaigns selected to pause')
        setShowBulkPauseConfirm(false)
        return
      }

      let successCount = 0
      let failCount = 0

      for (const campaignId of campaignsToPause) {
        try {
          await api.post(`/campaigns/${campaignId}/pause`)
          successCount++
        } catch (error) {
          failCount++
          console.error(`Failed to pause campaign ${campaignId}:`, error)
        }
      }

      if (successCount > 0) {
        toast.success(`Paused ${successCount} campaign${successCount > 1 ? 's' : ''} successfully!`)
      }
      if (failCount > 0) {
        toast.error(`Failed to pause ${failCount} campaign${failCount > 1 ? 's' : ''}`)
      }

      fetchCampaigns()
      setSelectedCampaigns(new Set())
      setShowBulkPauseConfirm(false)
    } catch (error: any) {
      toast.error('Failed to pause campaigns')
      console.error(error)
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const confirmBulkDelete = async () => {
    try {
      setIsBulkProcessing(true)
      const campaignsToDelete = Array.from(selectedCampaigns)
      let successCount = 0
      let failCount = 0

      for (const campaignId of campaignsToDelete) {
        try {
          await api.delete(`/campaigns/${campaignId}`)
          successCount++
        } catch (error) {
          failCount++
          console.error(`Failed to delete campaign ${campaignId}:`, error)
        }
      }

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} campaign${successCount > 1 ? 's' : ''} successfully!`)
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} campaign${failCount > 1 ? 's' : ''}`)
      }

      fetchCampaigns()
      setSelectedCampaigns(new Set())
      setShowBulkDeleteConfirm(false)
    } catch (error: any) {
      toast.error('Failed to delete campaigns')
      console.error(error)
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const calculateOpenRate = (campaign: Campaign) => {
    if (campaign.emailsSent === 0) return 0
    return Math.round((campaign.emailsOpened / campaign.emailsSent) * 100)
  }

  const calculateClickRate = (campaign: Campaign) => {
    if (campaign.emailsSent === 0) return 0
    return Math.round((campaign.emailsClicked / campaign.emailsSent) * 100)
  }

  const calculateResponseRate = (campaign: Campaign) => {
    if (campaign.emailsSent === 0) return 0
    return Math.round((campaign.responsesReceived / campaign.emailsSent) * 100)
  }

  const totalStats = campaigns.reduce((acc, campaign) => ({
    leads: acc.leads + campaign.leadsGenerated,
    emails: acc.emails + campaign.emailsSent,
    opens: acc.opens + campaign.emailsOpened,
    clicks: acc.clicks + campaign.emailsClicked,
  }), { leads: 0, emails: 0, opens: 0, clicks: 0 })

  const toggleArrayValue = (array: string[], value: string) => {
    if (array.includes(value)) {
      return array.filter(item => item !== value)
    }
    return [...array, value]
  }

  // Filter campaigns by date first
  const dateFilteredCampaigns = campaigns.filter((campaign) => {
    if (dateViewMode === 'allTime') return true
    
    const campaignDate = new Date(campaign.createdAt)
    const campaignMonth = campaignDate.getMonth() + 1
    const campaignYear = campaignDate.getFullYear()
    
    return campaignMonth === selectedMonth && campaignYear === selectedYear
  })

  // Then filter by search, status, and campaign type, and sort with active campaigns on top
  const filteredCampaigns = dateFilteredCampaigns
    .filter((campaign) => {
      // Campaign type filter
      if (campaignTypeFilter !== 'all') {
        const campaignType = campaign.campaignType || 'outreach' // default to outreach for backwards compatibility
        if (campaignType !== campaignTypeFilter) {
          return false
        }
      }

      // Status filter
      if (statusFilter !== 'all' && campaign.status !== statusFilter) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = campaign.name?.toLowerCase().includes(query)
        const matchesDescription = campaign.description?.toLowerCase().includes(query)
        const matchesIndustry = campaign.industry?.toLowerCase().includes(query)

        if (!matchesName && !matchesDescription && !matchesIndustry) {
          return false
        }
      }

      return true
    })
    .sort((a, b) => {
      // Sort by status: active campaigns first
      if (a.status === 'active' && b.status !== 'active') return -1
      if (a.status !== 'active' && b.status === 'active') return 1

      // If both have same status, sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  return (
    <Layout>
      <div className="space-y-6 max-w-full overflow-x-hidden">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-600 mt-2">Manage your email campaigns</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Date Filter Controls */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setDateViewMode('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateViewMode === 'monthly'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setDateViewMode('allTime')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateViewMode === 'allTime'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Time
              </button>
            </div>
            
            {/* Month/Year selectors - only show in monthly mode */}
            {dateViewMode === 'monthly' && (
              <>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {months.map((month, idx) => (
                    <option key={month} value={idx + 1}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {[2024, 2025, 2026].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </>
            )}
            
            <button 
              onClick={handleCreateCampaign}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              New Campaign
            </button>
          </div>
        </div>

        {/* Campaign Type Tabs - Always show tabs */}
        <div className="bg-white rounded-lg shadow p-1">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCampaignTypeFilter('all')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                campaignTypeFilter === 'all'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>All Campaigns</span>
            </button>
            <button
              onClick={() => setCampaignTypeFilter('lead_generation')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                campaignTypeFilter === 'lead_generation'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Lead Generation</span>
              <span className="sm:hidden">Gen</span>
            </button>
            <button
              onClick={() => setCampaignTypeFilter('outreach')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                campaignTypeFilter === 'outreach'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Outreach</span>
              <span className="sm:hidden">Out</span>
            </button>
            <button
              onClick={() => setCampaignTypeFilter('fully_automated')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                campaignTypeFilter === 'fully_automated'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Fully Automated</span>
              <span className="sm:hidden">Auto</span>
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Leads</p>
                  <p className="text-2xl font-bold text-gray-900">{totalStats.leads}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {campaigns.filter(c => c.status === 'active').length} active campaigns
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Emails Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{totalStats.emails}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {totalStats.emails > 0 ? Math.round((totalStats.opens / totalStats.emails) * 100) : 0}% open rate
                  </p>
                </div>
                <Send className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Emails Opened</p>
                  <p className="text-2xl font-bold text-gray-900">{totalStats.opens}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {totalStats.opens > 0 ? Math.round((totalStats.clicks / totalStats.opens) * 100) : 0}% clicked
                  </p>
                </div>
                <Eye className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Link Clicks</p>
                  <p className="text-2xl font-bold text-gray-900">{totalStats.clicks}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {totalStats.emails > 0 ? Math.round((totalStats.clicks / totalStats.emails) * 100) : 0}% CTR
                  </p>
                </div>
                <MousePointer className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        {campaigns.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 space-y-4">
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search campaigns by name, industry..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter and Bulk Actions */}
            <div className="flex items-center justify-between gap-4">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 mr-2">Status:</span>
                {['all', 'active', 'paused', 'draft', 'completed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      statusFilter === status
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              {/* Bulk Actions */}
              {filteredCampaigns.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSelectAll}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      selectedCampaigns.size === filteredCampaigns.length
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Check className="w-4 h-4 inline mr-1" />
                    {selectedCampaigns.size === filteredCampaigns.length ? 'Deselect All' : 'Select All'}
                  </button>
                  
                  {selectedCampaigns.size > 0 && (
                    <>
                      <span className="text-sm text-gray-600">
                        {selectedCampaigns.size} selected
                      </span>
                      <button
                        onClick={handleBulkStart}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-1"
                      >
                        <Play className="w-4 h-4" />
                        Start
                      </button>
                      <button
                        onClick={handleBulkPause}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campaign List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Mail className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-600 mb-6">Create your first email campaign to start reaching out to leads</p>
              <button
                onClick={handleCreateCampaign}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Create Your First Campaign
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.length === 0 ? (
              <div className="col-span-full">
                {/* Tab-Specific Empty States */}
                {campaignTypeFilter === 'lead_generation' ? (
                  <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg shadow-lg p-12 text-center border-2 border-purple-100">
                    <Database className="w-20 h-20 text-purple-500 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">No Lead Generation Campaigns</h3>
                    <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                      Lead generation campaigns automatically discover and collect leads from sources like Apollo.io and Google Places.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button
                        onClick={() => window.location.href = '/leads'}
                        className="px-6 py-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                      >
                        <Database className="w-5 h-5" />
                        Generate Lead Batch
                      </button>
                      <button
                        onClick={handleCreateCampaign}
                        className="px-6 py-3 text-sm font-medium text-purple-600 bg-white border-2 border-purple-600 rounded-lg hover:bg-purple-50 flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Create Lead Gen Campaign
                      </button>
                    </div>
                  </div>
                ) : campaignTypeFilter === 'outreach' ? (
                  <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg shadow-lg p-12 text-center border-2 border-blue-100">
                    <Mail className="w-20 h-20 text-blue-500 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">No Outreach Campaigns</h3>
                    <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                      Outreach campaigns send personalized email sequences to your existing leads or batches. Perfect for manual lead lists or targeted outreach.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button
                        onClick={() => window.location.href = '/leads'}
                        className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Users className="w-5 h-5" />
                        Select Leads or Batch
                      </button>
                      <button
                        onClick={handleCreateCampaign}
                        className="px-6 py-3 text-sm font-medium text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Create Outreach Campaign
                      </button>
                    </div>
                  </div>
                ) : campaignTypeFilter === 'fully_automated' ? (
                  <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg shadow-lg p-12 text-center border-2 border-orange-100">
                    <Zap className="w-20 h-20 text-orange-500 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">No Fully Automated Campaigns</h3>
                    <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                      Fully automated campaigns combine lead generation and outreach into one hands-free workflow. Set it up once and let it run continuously.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button
                        onClick={handleCreateCampaign}
                        className="px-6 py-3 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 flex items-center gap-2"
                      >
                        <Zap className="w-5 h-5" />
                        Create Automated Campaign
                      </button>
                      <a
                        href="https://docs.example.com/automated-campaigns"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 text-sm font-medium text-orange-600 bg-white border-2 border-orange-600 rounded-lg hover:bg-orange-50 flex items-center gap-2"
                      >
                        <Eye className="w-5 h-5" />
                        Learn More
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <p className="text-gray-600">No campaigns match your search criteria</p>
                  </div>
                )}
              </div>
            ) : (
              <>
              {/* Quick Action Card - Show when viewing specific campaign type tabs */}
              {campaignTypeFilter === 'lead_generation' && (
                <div className="col-span-full">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                          <Database className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-1">Generate More Leads</h3>
                          <p className="text-purple-100 text-sm">Create a new batch of leads from Apollo.io or Google Places</p>
                        </div>
                      </div>
                      <button
                        onClick={() => window.location.href = '/leads'}
                        className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 font-medium text-sm flex items-center gap-2 whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4" />
                        Generate Leads
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {campaignTypeFilter === 'outreach' && (
                <div className="col-span-full">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                          <Mail className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-1">Start New Outreach</h3>
                          <p className="text-blue-100 text-sm">Select leads or batches and create a personalized email campaign</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => window.location.href = '/leads'}
                          className="px-4 py-2 bg-white/10 text-white border border-white/30 rounded-lg hover:bg-white/20 font-medium text-sm flex items-center gap-2 whitespace-nowrap"
                        >
                          <Users className="w-4 h-4" />
                          Select Leads
                        </button>
                        <button
                          onClick={handleCreateCampaign}
                          className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium text-sm flex items-center gap-2 whitespace-nowrap"
                        >
                          <Plus className="w-4 h-4" />
                          New Campaign
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {campaignTypeFilter === 'fully_automated' && (
                <div className="col-span-full">
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                          <Zap className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-1">Create Automated Campaign</h3>
                          <p className="text-orange-100 text-sm">Set up continuous lead generation + outreach on autopilot</p>
                        </div>
                      </div>
                      <button
                        onClick={handleCreateCampaign}
                        className="px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 font-medium text-sm flex items-center gap-2 whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4" />
                        New Automated Campaign
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {filteredCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className={`bg-white rounded-lg shadow hover:shadow-xl transition-all flex flex-col cursor-pointer ${
                  selectedCampaigns.has(campaign.id) ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <div className="p-4 lg:p-6 flex-1">
                  {/* Header with Checkbox */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-2 lg:gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedCampaigns.has(campaign.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleSelectCampaign(campaign.id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 
                          onClick={() => window.location.href = `/campaigns/${campaign.id}`}
                          className="text-lg font-semibold text-gray-900 truncate mb-2 hover:text-primary-600"
                        >
                          {campaign.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                            campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                            campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                            campaign.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {campaign.status}
                          </span>
                          {campaign.campaignType && campaign.campaignType !== 'outreach' && (
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                              campaign.campaignType === 'lead_generation' ? 'bg-purple-100 text-purple-800' :
                              campaign.campaignType === 'fully_automated' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {campaign.campaignType === 'lead_generation' ? 'Lead Gen' :
                               campaign.campaignType === 'fully_automated' ? 'Auto' : campaign.campaignType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {campaign.description && (
                    <p 
                      onClick={() => window.location.href = `/campaigns/${campaign.id}`}
                      className="text-gray-600 text-sm mb-3 line-clamp-2"
                    >
                      {campaign.description}
                    </p>
                  )}

                  {/* Tags */}
                  <div 
                    onClick={() => window.location.href = `/campaigns/${campaign.id}`}
                    className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-4"
                  >
                    {campaign.industry && (
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                        <TrendingUp className="w-3 h-3" />
                        {campaign.industry}
                      </span>
                    )}
                    {campaign.scheduleType && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {campaign.scheduleType === 'daily' ? '🕒 Daily' : '👆 Manual'}
                      </span>
                    )}
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-gray-500" />
                        <p className="text-xs text-gray-600">Leads</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{campaign.leadsGenerated}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Send className="w-4 h-4 text-gray-500" />
                        <p className="text-xs text-gray-600">Sent</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{campaign.emailsSent}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="w-4 h-4 text-green-600" />
                        <p className="text-xs text-green-600">Opens</p>
                      </div>
                      <p className="text-lg font-bold text-green-700">{campaign.emailsOpened}</p>
                      <p className="text-xs text-green-600 font-medium">{calculateOpenRate(campaign)}%</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="w-4 h-4 text-purple-600" />
                        <p className="text-xs text-purple-600">Replies</p>
                      </div>
                      <p className="text-lg font-bold text-purple-700">{campaign.responsesReceived}</p>
                      <p className="text-xs text-purple-600 font-medium">{calculateResponseRate(campaign)}%</p>
                    </div>
                  </div>

                  {/* Performance Bars */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Open Rate</span>
                        <span className="font-medium">{calculateOpenRate(campaign)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(calculateOpenRate(campaign), 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Click Rate</span>
                        <span className="font-medium">{calculateClickRate(campaign)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(calculateClickRate(campaign), 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer with Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-500">
                    Created {new Date(campaign.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    {campaign.status === 'active' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePauseCampaign(campaign.id);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
                        title="Pause Campaign"
                      >
                        <Pause className="w-3 h-3" />
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartCampaign(campaign.id);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 flex items-center gap-1"
                        title="Start Campaign"
                      >
                        <Play className="w-3 h-3" />
                        Start
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCampaign(campaign.id);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded hover:bg-red-50 flex items-center gap-1"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
              ))
              </>
            )}
          </div>
        )}

        {/* Campaign Creation Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Create Campaign</h2>
                  <p className="text-sm text-gray-600 mt-1">Step {currentStep} of 4</p>
                </div>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Progress Steps */}
              <div className="px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step < currentStep ? 'bg-green-600 text-white' :
                        step === currentStep ? 'bg-primary-600 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {step < currentStep ? <Check className="w-5 h-5" /> : step}
                      </div>
                      {step < 4 && (
                        <div className={`w-12 md:w-24 h-1 ${
                          step < currentStep ? 'bg-green-600' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-gray-600">Basic Info</span>
                  <span className="text-xs text-gray-600">Targeting</span>
                  <span className="text-xs text-gray-600">Sources</span>
                  <span className="text-xs text-gray-600">Schedule</span>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campaign Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="e.g., Restaurant Outreach Q4 2024"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Describe your campaign goals..."
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Targeting */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Industry *
                      </label>
                      <select
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select industry...</option>
                        {Object.entries(industriesByCategory).map(([category, items]) => (
                          <optgroup key={category} label={category}>
                            {items.map((industry) => (
                              <option key={industry.value} value={industry.value}>
                                {industry.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Choose the specific business type for better targeting
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Countries
                      </label>
                      <div className="space-y-3">
                        {/* Input to add custom country */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCountry}
                            onChange={(e) => setNewCountry(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && newCountry.trim()) {
                                e.preventDefault()
                                if (!formData.targetCountries.includes(newCountry.trim())) {
                                  setFormData({
                                    ...formData,
                                    targetCountries: [...formData.targetCountries, newCountry.trim()]
                                  })
                                }
                                setNewCountry('')
                              }
                            }}
                            placeholder="Type country name and press Enter"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newCountry.trim() && !formData.targetCountries.includes(newCountry.trim())) {
                                setFormData({
                                  ...formData,
                                  targetCountries: [...formData.targetCountries, newCountry.trim()]
                                })
                                setNewCountry('')
                              }
                            }}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                          >
                            Add
                          </button>
                        </div>

                        {/* Display selected countries as chips */}
                        {formData.targetCountries.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formData.targetCountries.map((country, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                              >
                                {country}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      targetCountries: formData.targetCountries.filter((_, i) => i !== index)
                                    })
                                  }}
                                  className="hover:text-blue-900"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Quick select popular countries */}
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Quick select:</p>
                          <div className="flex flex-wrap gap-2">
                            {countries.map((country) => (
                              !formData.targetCountries.includes(country) && (
                                <button
                                  key={country}
                                  type="button"
                                  onClick={() => setFormData({
                                    ...formData,
                                    targetCountries: [...formData.targetCountries, country]
                                  })}
                                  className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                  + {country}
                                </button>
                              )
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Size
                      </label>
                      <select
                        value={formData.companySize}
                        onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Any size</option>
                        {companySizes.map((size) => (
                          <option key={size} value={size}>{size} employees</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Leads Per Day
                      </label>
                      <input
                        type="number"
                        value={formData.leadsPerDay}
                        onChange={(e) => setFormData({ ...formData, leadsPerDay: parseInt(e.target.value) || 0 })}
                        min="1"
                        max="500"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Lead Sources */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Select the sources to generate leads from. You can choose multiple sources.
                    </p>
                    
                    <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-primary-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.usesApollo}
                        onChange={(e) => setFormData({ ...formData, usesApollo: e.target.checked })}
                        className="mt-1 rounded text-primary-600"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Apollo.io</p>
                        <p className="text-sm text-gray-600">B2B contact database with 275M+ contacts</p>
                        <p className="text-xs text-gray-500 mt-1">100 leads/day limit</p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-primary-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.usesGooglePlaces}
                        onChange={(e) => setFormData({ ...formData, usesGooglePlaces: e.target.checked })}
                        className="mt-1 rounded text-primary-600"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Google Places</p>
                        <p className="text-sm text-gray-600">Local businesses from Google Maps</p>
                        <p className="text-xs text-gray-500 mt-1">Unlimited</p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-primary-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.usesPeopleDL}
                        onChange={(e) => setFormData({ ...formData, usesPeopleDL: e.target.checked })}
                        className="mt-1 rounded text-primary-600"
                      />
                      <div>
                        <p className="font-medium text-gray-900">People Data Labs</p>
                        <p className="text-sm text-gray-600">Contact enrichment and email finding</p>
                        <p className="text-xs text-gray-500 mt-1">1,000 credits/month</p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-primary-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.usesLinkedin}
                        onChange={(e) => setFormData({ ...formData, usesLinkedin: e.target.checked })}
                        className="mt-1 rounded text-primary-600"
                      />
                      <div>
                        <p className="font-medium text-gray-900">LinkedIn CSV Import</p>
                        <p className="text-sm text-gray-600">Import from Sales Navigator exports</p>
                        <p className="text-xs text-gray-500 mt-1">Manual upload required</p>
                      </div>
                    </label>
                  </div>
                )}

                {/* Step 4: Schedule & Settings */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Schedule Type
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-primary-500">
                          <input
                            type="radio"
                            checked={formData.scheduleType === 'manual'}
                            onChange={() => setFormData({ ...formData, scheduleType: 'manual' })}
                            className="text-primary-600"
                          />
                          <div>
                            <p className="font-medium text-gray-900">Manual</p>
                            <p className="text-sm text-gray-600">Start campaign manually when ready</p>
                          </div>
                        </label>
                        <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-primary-500">
                          <input
                            type="radio"
                            checked={formData.scheduleType === 'daily'}
                            onChange={() => setFormData({ ...formData, scheduleType: 'daily' })}
                            className="text-primary-600"
                          />
                          <div>
                            <p className="font-medium text-gray-900">Daily Automation</p>
                            <p className="text-sm text-gray-600">Run automatically every day</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {formData.scheduleType === 'daily' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Daily Run Time
                        </label>
                        <input
                          type="time"
                          value={formData.scheduleTime}
                          onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Campaign will automatically generate leads and send emails at this time daily
                        </p>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <WorkflowSelector
                        selectedWorkflowId={formData.workflowId}
                        onSelect={(workflowId) => setFormData({ ...formData, workflowId })}
                        label="Email Workflow (Optional)"
                        placeholder="Select an email workflow"
                        required={false}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Choose a workflow to send automated email sequences. If no workflow is selected, you'll need to configure emails manually.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-6 border-t">
                <button
                  onClick={currentStep === 1 ? handleCloseModal : handleBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <ChevronLeft className="w-4 h-4 inline mr-1" />
                  {currentStep === 1 ? 'Cancel' : 'Back'}
                </button>
                
                {currentStep < 4 ? (
                  <button
                    onClick={handleNext}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 inline ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Campaign'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false)
            setCampaignToDelete(null)
          }}
          onConfirm={confirmDeleteCampaign}
          title="Delete Campaign"
          message="Are you sure you want to delete this campaign? This action cannot be undone. All campaign data, leads, and email history will be permanently removed."
          confirmText="Delete Campaign"
          cancelText="Cancel"
          variant="danger"
          isLoading={isDeleting}
        />

        {/* Start Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showStartConfirm}
          onClose={() => {
            setShowStartConfirm(false)
            setCampaignToStart(null)
          }}
          onConfirm={confirmStartCampaign}
          title="Start Campaign"
          message="Are you ready to activate this campaign? Emails will be sent to leads according to your schedule settings. You can pause the campaign at any time."
          confirmText="Start Campaign"
          cancelText="Cancel"
          variant="success"
          isLoading={isStarting}
        />

        {/* Pause Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showPauseConfirm}
          onClose={() => {
            setShowPauseConfirm(false)
            setCampaignToPause(null)
          }}
          onConfirm={confirmPauseCampaign}
          title="Pause Campaign"
          message="This will temporarily stop all email outreach for this campaign. You can resume it at any time. Scheduled emails will not be sent while paused."
          confirmText="Pause Campaign"
          cancelText="Cancel"
          variant="warning"
          isLoading={isPausing}
        />

        {/* Bulk Start Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showBulkStartConfirm}
          onClose={() => setShowBulkStartConfirm(false)}
          onConfirm={confirmBulkStart}
          title="Start Selected Campaigns"
          message={`Are you ready to start ${selectedCampaigns.size} campaign${selectedCampaigns.size > 1 ? 's' : ''}? Active campaigns will be skipped. Emails will be sent according to each campaign's schedule settings.`}
          confirmText={`Start ${selectedCampaigns.size} Campaign${selectedCampaigns.size > 1 ? 's' : ''}`}
          cancelText="Cancel"
          variant="success"
          isLoading={isBulkProcessing}
        />

        {/* Bulk Pause Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showBulkPauseConfirm}
          onClose={() => setShowBulkPauseConfirm(false)}
          onConfirm={confirmBulkPause}
          title="Pause Selected Campaigns"
          message={`This will pause ${selectedCampaigns.size} campaign${selectedCampaigns.size > 1 ? 's' : ''}. Only active campaigns will be affected. Paused/inactive campaigns will be skipped. Scheduled emails will not be sent while paused.`}
          confirmText={`Pause ${selectedCampaigns.size} Campaign${selectedCampaigns.size > 1 ? 's' : ''}`}
          cancelText="Cancel"
          variant="warning"
          isLoading={isBulkProcessing}
        />

        {/* Bulk Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showBulkDeleteConfirm}
          onClose={() => setShowBulkDeleteConfirm(false)}
          onConfirm={confirmBulkDelete}
          title="Delete Selected Campaigns"
          message={`Are you absolutely sure you want to delete ${selectedCampaigns.size} campaign${selectedCampaigns.size > 1 ? 's' : ''}? This action cannot be undone. All campaign data, leads, and email history will be permanently removed.`}
          confirmText={`Delete ${selectedCampaigns.size} Campaign${selectedCampaigns.size > 1 ? 's' : ''}`}
          cancelText="Cancel"
          variant="danger"
          isLoading={isBulkProcessing}
        />

        {/* Progress Dialog */}
        <ProgressDialog
          isOpen={showProgressDialog}
          title={progressTitle}
          message={progressMessage}
          indeterminate={true}
        />
      </div>
    </Layout>
  )
}
