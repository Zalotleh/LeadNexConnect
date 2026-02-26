import Link from 'next/link'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import ConfirmDialog from '@/components/ConfirmDialog'
import ProgressDialog from '@/components/ProgressDialog'
import WorkflowSelector from '@/components/WorkflowSelector'
import CreateLeadGenerationForm from '@/components/campaigns/CreateLeadGenerationForm'
import CreateOutreachForm from '@/components/campaigns/CreateOutreachForm'
import CreateFullyAutomatedForm from '@/components/campaigns/CreateFullyAutomatedForm'
import { Plus, Play, Pause, Mail, X, ChevronLeft, ChevronRight, Check, Edit, Trash2, Eye, TrendingUp, Users, Send, MousePointer, Search, Database, Zap, MousePointerClick, Reply, RefreshCw, Calendar, BarChart3, Settings, Sparkles } from 'lucide-react'
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
  // Lead Generation specific
  isRecurring?: boolean
  recurringInterval?: string
  leadSources?: string[]
  maxResultsPerRun?: number
  totalLeadsGenerated?: number
  batchesCreated?: number
  nextRunAt?: string
  lastRunAt?: string
  city?: string
  country?: string
  // Outreach specific
  useWorkflow?: boolean
  workflowName?: string
  templateName?: string
  totalLeadsTargeted?: number
  emailsScheduledCount?: number
  emailsReplied?: number
  batchNames?: string[]
  scheduledStartAt?: string
  actualStartedAt?: string
  completedAt?: string
  currentWorkflowStep?: number
  // Fully Automated specific
  outreachDelayDays?: number
  totalRunsCompleted?: number
  endDate?: string
}

function Campaigns() {
  const [dateViewMode, setDateViewMode] = useState<'monthly' | 'allTime'>('allTime')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showModal, setShowModal] = useState(false)
  const [showTypePickerModal, setShowTypePickerModal] = useState(false)
  const [showLeadGenForm, setShowLeadGenForm] = useState(false)
  const [showOutreachForm, setShowOutreachForm] = useState(false)
  const [showAutomatedForm, setShowAutomatedForm] = useState(false)
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
    // Show different form based on current campaign type filter
    if (campaignTypeFilter === 'lead_generation') {
      setShowLeadGenForm(true)
    } else if (campaignTypeFilter === 'outreach') {
      setShowOutreachForm(true)
    } else if (campaignTypeFilter === 'fully_automated') {
      setShowAutomatedForm(true)
    } else {
      // If "All" tab is selected, show the type-picker modal
      setShowTypePickerModal(true)
    }
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

  const handleStartCampaign = async (campaignId: string, campaignType?: string) => {
    setCampaignToStart(campaignId)
    // Store the campaign type in state for use in confirmStartCampaign
    const campaign = campaigns.find(c => c.id === campaignId)
    if (campaign) {
      // Store campaign data temporarily
      (window as any).__startCampaignType = campaign.campaignType
    }
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
      
      // Use the correct endpoint based on campaign type
      const campaignType = (window as any).__startCampaignType
      // automated/fully_automated/lead_generation need /execute (generates leads + emails)
      // outreach/manual use /start (schedules emails for pre-existing leads)
      const needsExecution = campaignType === 'lead_generation' || campaignType === 'automated' || campaignType === 'fully_automated'
      const endpoint = needsExecution
        ? `/campaigns/${campaignToStart}/execute`
        : `/campaigns/${campaignToStart}/start`
      
      await api.post(endpoint)
      
      setProgressMessage('Campaign started successfully!')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setShowProgressDialog(false)
      toast.success('Campaign started successfully!')
      fetchCampaigns()
      setCampaignToStart(null)
      // Clean up temporary data
      delete (window as any).__startCampaignType
    } catch (error: any) {
      setShowProgressDialog(false)
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to start campaign'
      toast.error(errorMessage)
      console.error('Failed to start campaign:', error)
      // Clean up temporary data
      delete (window as any).__startCampaignType
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
      <div className="space-y-5 max-w-full overflow-x-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage, run and track all your campaigns</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setDateViewMode('monthly')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${dateViewMode === 'monthly' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'}`}
              >Monthly</button>
              <button
                onClick={() => setDateViewMode('allTime')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${dateViewMode === 'allTime' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'}`}
              >All Time</button>
            </div>
            {dateViewMode === 'monthly' && (
              <>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                  {months.map((month, idx) => <option key={month} value={idx + 1}>{month}</option>)}
                </select>
                <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                  {[2024, 2025, 2026].map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </>
            )}
            <Link href="/ai-create?type=campaign">
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                Create with AI
              </button>
            </Link>
            <button
              onClick={handleCreateCampaign}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        </div>

        {/* ── Smart Stat Strip ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type filter pills */}
          <button
            onClick={() => setCampaignTypeFilter('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              campaignTypeFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>All</span>
            <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${campaignTypeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {dateFilteredCampaigns.length}
            </span>
          </button>
          <button
            onClick={() => setCampaignTypeFilter(campaignTypeFilter === 'lead_generation' ? 'all' : 'lead_generation')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              campaignTypeFilter === 'lead_generation' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Lead Gen</span>
            <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${campaignTypeFilter === 'lead_generation' ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600'}`}>
              {dateFilteredCampaigns.filter(c => (c.campaignType || 'outreach') === 'lead_generation').length}
            </span>
          </button>
          <button
            onClick={() => setCampaignTypeFilter(campaignTypeFilter === 'outreach' ? 'all' : 'outreach')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              campaignTypeFilter === 'outreach' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Outreach</span>
            <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${campaignTypeFilter === 'outreach' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
              {dateFilteredCampaigns.filter(c => (c.campaignType || 'outreach') === 'outreach').length}
            </span>
          </button>
          <button
            onClick={() => setCampaignTypeFilter(campaignTypeFilter === 'fully_automated' ? 'all' : 'fully_automated')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              campaignTypeFilter === 'fully_automated' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Automated</span>
            <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${campaignTypeFilter === 'fully_automated' ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-600'}`}>
              {dateFilteredCampaigns.filter(c => c.campaignType === 'fully_automated').length}
            </span>
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Aggregate stats as read-only pills */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-semibold text-gray-800">{totalStats.leads}</span> leads
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
            <Send className="w-3.5 h-3.5 text-green-500" />
            <span className="font-semibold text-gray-800">{totalStats.emails}</span> sent
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
            <Eye className="w-3.5 h-3.5 text-purple-500" />
            <span className="font-semibold text-gray-800">{totalStats.emails > 0 ? Math.round((totalStats.opens / totalStats.emails) * 100) : 0}%</span> open
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
            <MousePointer className="w-3.5 h-3.5 text-orange-500" />
            <span className="font-semibold text-gray-800">{totalStats.emails > 0 ? Math.round((totalStats.clicks / totalStats.emails) * 100) : 0}%</span> CTR
          </div>
        </div>

        {/* ── Unified Toolbar ────────────────────────────────────────────────── */}
        {campaigns.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="flex-1 relative min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {['all', 'active', 'paused', 'draft', 'completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === status ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Bulk action controls */}
            <div className="flex items-center gap-2 ml-auto">
              {filteredCampaigns.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  {selectedCampaigns.size === filteredCampaigns.length && filteredCampaigns.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              )}
              {selectedCampaigns.size > 0 && (
                <>
                  <span className="text-xs text-gray-500">{selectedCampaigns.size} selected</span>
                  <button onClick={handleBulkStart} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                    <Play className="w-3.5 h-3.5" /> Start
                  </button>
                  <button onClick={handleBulkPause} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                  <button onClick={handleBulkDelete} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Campaign List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-sm">Loading campaigns…</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex flex-col items-center justify-center h-72 text-center px-6">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">No campaigns yet</h3>
              <p className="text-sm text-gray-500 mb-5 max-w-xs">Create your first campaign to start generating leads and reaching out</p>
              <button
                onClick={handleCreateCampaign}
                className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Your First Campaign
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCampaigns.length === 0 ? (
              <div className="col-span-full bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
                <p className="text-sm text-gray-500">No campaigns match your filters</p>
              </div>
            ) : (
              filteredCampaigns.map((campaign) => {
                const campaignType = campaign.campaignType || 'outreach';

                const typeConfig = {
                  lead_generation: { label: 'Lead Gen', icon: <Database className="w-3.5 h-3.5" />, badge: 'bg-purple-100 text-purple-700', border: 'border-l-purple-500', accent: 'text-purple-700', accentBg: 'bg-purple-50', actionColor: 'bg-purple-600 hover:bg-purple-700' },
                  outreach:        { label: 'Outreach', icon: <Mail className="w-3.5 h-3.5" />,     badge: 'bg-blue-100 text-blue-700',   border: 'border-l-blue-500',   accent: 'text-blue-700',   accentBg: 'bg-blue-50',   actionColor: 'bg-blue-600 hover:bg-blue-700'   },
                  fully_automated: { label: 'Automated', icon: <Zap className="w-3.5 h-3.5" />,    badge: 'bg-orange-100 text-orange-700', border: 'border-l-orange-500', accent: 'text-orange-700', accentBg: 'bg-orange-50', actionColor: 'bg-orange-600 hover:bg-orange-700' },
                }[campaignType] ?? { label: 'Outreach', icon: <Mail className="w-3.5 h-3.5" />, badge: 'bg-blue-100 text-blue-700', border: 'border-l-blue-500', accent: 'text-blue-700', accentBg: 'bg-blue-50', actionColor: 'bg-blue-600 hover:bg-blue-700' };

                const isActive = campaign.status === 'running' || campaign.status === 'active';

                const statusBadge = (() => {
                  if (campaign.status === 'running' || campaign.status === 'active') return 'bg-green-100 text-green-800';
                  if (campaign.status === 'paused') return 'bg-yellow-100 text-yellow-800';
                  if (campaign.status === 'scheduled') return 'bg-blue-100 text-blue-800';
                  if (campaign.status === 'completed') return 'bg-gray-100 text-gray-700';
                  return 'bg-gray-100 text-gray-700';
                })();

                const statusDot = (() => {
                  if (campaign.status === 'running' || campaign.status === 'active') return 'bg-green-500';
                  if (campaign.status === 'paused') return 'bg-yellow-500';
                  if (campaign.status === 'scheduled') return 'bg-blue-500';
                  return 'bg-gray-400';
                })();

                // Funnel stats for outreach / automated
                const sent = campaign.emailsSent || 0;
                const opened = campaign.emailsOpened || 0;
                const clicked = campaign.emailsClicked || 0;
                const replied = campaign.emailsReplied || campaign.responsesReceived || 0;
                const openPct = sent > 0 ? Math.round((opened / sent) * 100) : 0;
                const clickPct = sent > 0 ? Math.round((clicked / sent) * 100) : 0;
                const replyPct = sent > 0 ? Math.round((replied / sent) * 100) : 0;

                return (
                  <div
                    key={campaign.id}
                    onClick={() => window.location.href = `/campaigns/${campaign.id}`}
                    className={`bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all flex flex-col cursor-pointer border-l-4 ${typeConfig.border} ${
                      selectedCampaigns.has(campaign.id) ? 'border-t-primary-400 border-r-primary-400 border-b-primary-400' : 'border-t-gray-200 border-r-gray-200 border-b-gray-200'
                    }`}
                  >
                    {/* Card body */}
                    <div className="p-5 flex-1 space-y-3">
                      {/* Top row: checkbox + type badge + status */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedCampaigns.has(campaign.id)}
                          onChange={(e) => { e.stopPropagation(); handleSelectCampaign(campaign.id); }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 flex-shrink-0"
                        />
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeConfig.badge}`}>
                          {typeConfig.icon}
                          {typeConfig.label}
                        </span>
                        {campaign.isRecurring && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            <RefreshCw className="w-3 h-3" />
                            {campaign.recurringInterval === 'daily' ? 'Daily' :
                             campaign.recurringInterval === 'every_2_days' ? '2-day' :
                             campaign.recurringInterval === 'weekly' ? 'Weekly' : 'Recurring'}
                          </span>
                        )}
                        <span className={`ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                        </span>
                      </div>

                      {/* Campaign name */}
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-1 hover:text-primary-700">
                          {campaign.name}
                        </h3>
                        {campaign.industry && (
                          <p className="text-xs text-gray-500 mt-0.5">{campaign.industry}</p>
                        )}
                      </div>

                      {/* Lead Gen stats */}
                      {campaignType === 'lead_generation' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className={`rounded-lg p-2.5 text-center ${typeConfig.accentBg}`}>
                            <div className={`text-xl font-bold ${typeConfig.accent}`}>{campaign.leadsGenerated || 0}</div>
                            <div className="text-[10px] text-gray-500">Leads Generated</div>
                          </div>
                          <div className={`rounded-lg p-2.5 text-center ${typeConfig.accentBg}`}>
                            <div className={`text-xl font-bold ${typeConfig.accent}`}>{campaign.batchesCreated || 0}</div>
                            <div className="text-[10px] text-gray-500">Batches</div>
                          </div>
                        </div>
                      )}

                      {/* Automated stats */}
                      {campaignType === 'fully_automated' && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className={`rounded-lg p-2.5 text-center ${typeConfig.accentBg}`}>
                            <div className={`text-lg font-bold ${typeConfig.accent}`}>{campaign.totalRunsCompleted || 0}</div>
                            <div className="text-[10px] text-gray-500">Runs</div>
                          </div>
                          <div className={`rounded-lg p-2.5 text-center ${typeConfig.accentBg}`}>
                            <div className={`text-lg font-bold ${typeConfig.accent}`}>{campaign.totalLeadsGenerated || 0}</div>
                            <div className="text-[10px] text-gray-500">Leads</div>
                          </div>
                          <div className={`rounded-lg p-2.5 text-center ${typeConfig.accentBg}`}>
                            <div className={`text-lg font-bold ${typeConfig.accent}`}>{sent}</div>
                            <div className="text-[10px] text-gray-500">Emails</div>
                          </div>
                        </div>
                      )}

                      {/* Outreach / Automated funnel mini-bar */}
                      {(campaignType === 'outreach' || campaignType === 'fully_automated') && sent > 0 && (
                        <div className="pt-2 border-t border-gray-100 space-y-1.5">
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span className="w-10">Sent</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-gray-400 h-1.5 rounded-full" style={{ width: '100%' }} />
                            </div>
                            <span className="w-6 text-right font-medium text-gray-700">{sent}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span className="w-10">Opened</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${openPct}%` }} />
                            </div>
                            <span className="w-6 text-right font-medium text-gray-700">{openPct}%</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span className="w-10">Clicked</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${clickPct}%` }} />
                            </div>
                            <span className="w-6 text-right font-medium text-gray-700">{clickPct}%</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span className="w-10">Replied</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div className="bg-purple-400 h-1.5 rounded-full" style={{ width: `${replyPct}%` }} />
                            </div>
                            <span className="w-6 text-right font-medium text-gray-700">{replyPct}%</span>
                          </div>
                        </div>
                      )}

                      {/* Outreach info line */}
                      {campaignType === 'outreach' && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          {campaign.useWorkflow ? <RefreshCw className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                          <span className="truncate">{campaign.useWorkflow ? campaign.workflowName || 'Workflow' : campaign.templateName || 'Template'}</span>
                          <span className="ml-auto flex-shrink-0 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {campaign.totalLeadsTargeted || campaign.leadsGenerated || 0}
                          </span>
                        </div>
                      )}

                      {/* Next run */}
                      {campaign.nextRunAt && isActive && (
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-blue-50 rounded-lg px-2.5 py-1.5">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          Next run: {new Date(campaign.nextRunAt).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Card footer */}
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl flex items-center justify-between gap-2">
                      <span className="text-[10px] text-gray-400">{new Date(campaign.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-1.5">
                        {isActive ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePauseCampaign(campaign.id); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <Pause className="w-3 h-3" /> Pause
                          </button>
                        ) : (campaign.status === 'paused' || campaign.status === 'draft' || campaign.status === 'scheduled') ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartCampaign(campaign.id, campaign.campaignType); }}
                            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white rounded-lg ${typeConfig.actionColor}`}
                          >
                            <Play className="w-3 h-3" /> {campaign.status === 'paused' ? 'Resume' : 'Start'}
                          </button>
                        ) : null}
                        <button
                          onClick={(e) => { e.stopPropagation(); window.location.href = `/campaigns/${campaign.id}`; }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <BarChart3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(campaign.id); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-100 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
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
                        Target Leads Per Run
                      </label>
                      <input
                        type="number"
                        value={formData.leadsPerDay}
                        onChange={(e) => setFormData({ ...formData, leadsPerDay: parseInt(e.target.value) || 0 })}
                        min="1"
                        max="500"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        The system will try its best to reach this number. Actual results may be lower due to deduplication, quality filtering, and API availability.
                      </p>
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

        {/* Lead Generation Campaign Form */}
        {showLeadGenForm && (
          <CreateLeadGenerationForm
            onClose={() => setShowLeadGenForm(false)}
            onSuccess={() => {
              fetchCampaigns()
              setShowLeadGenForm(false)
            }}
          />
        )}

        {/* Outreach Campaign Form */}
        {showOutreachForm && (
          <CreateOutreachForm
            onClose={() => setShowOutreachForm(false)}
            onSuccess={() => {
              fetchCampaigns()
              setShowOutreachForm(false)
            }}
          />
        )}

        {/* Fully Automated Campaign Form */}
        {showAutomatedForm && (
          <CreateFullyAutomatedForm
            onClose={() => setShowAutomatedForm(false)}
            onSuccess={() => {
              fetchCampaigns()
              setShowAutomatedForm(false)
            }}
          />
        )}

        {/* Campaign Type Picker Modal */}
        {showTypePickerModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
              <div className="flex items-center justify-between px-8 pt-8 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Create a Campaign</h2>
                  <p className="text-gray-500 mt-1 text-sm">Choose the type of campaign you want to run</p>
                </div>
                <button
                  onClick={() => setShowTypePickerModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-8 pb-8 grid grid-cols-1 gap-3">
                <button
                  onClick={() => {
                    setShowTypePickerModal(false)
                    setCampaignTypeFilter('lead_generation')
                    setShowLeadGenForm(true)
                  }}
                  className="flex items-center gap-5 p-5 rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
                    <Database className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900">Lead Generation</h3>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition-colors flex-shrink-0" />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Auto-discover leads from Apollo.io, Google Places, and more.
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowTypePickerModal(false)
                    setCampaignTypeFilter('outreach')
                    setShowOutreachForm(true)
                  }}
                  className="flex items-center gap-5 p-5 rounded-xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900">Outreach</h3>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Send personalized email sequences to your existing leads and contact lists.
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowTypePickerModal(false)
                    setCampaignTypeFilter('fully_automated')
                    setShowAutomatedForm(true)
                  }}
                  className="flex items-center gap-5 p-5 rounded-xl border-2 border-gray-100 hover:border-orange-300 hover:bg-orange-50 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 transition-colors">
                    <Zap className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900">Fully Automated</h3>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors flex-shrink-0" />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Lead generation + outreach combined. Set up once, runs on autopilot.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

function CampaignsWithProtection() {
  return (
    <ProtectedRoute>
      <Campaigns />
    </ProtectedRoute>
  )
}

export default CampaignsWithProtection
