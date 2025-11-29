import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import ConfirmDialog from '@/components/ConfirmDialog'
import leadsService, { Lead } from '@/services/leads.service'
import { leadsAPI, aiAPI } from '@/services/api'
import { Plus, Filter, Download, Upload, Users, Zap, X, Search, Loader, TrendingUp, Target, Package, List, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { INDUSTRIES, getIndustriesByCategory, INDUSTRY_CATEGORIES, type IndustryOption } from '@leadnex/shared'

export default function Leads() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'all' | 'imported' | 'generated'>('all')
  const [viewMode, setViewMode] = useState<'table' | 'batches'>('table')
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [editForm, setEditForm] = useState<Partial<Lead>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false)
  const [createLeadForm, setCreateLeadForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    city: '',
    country: 'United States',
    jobTitle: '',
    companySize: '',
  })
  const [isCreatingLead, setIsCreatingLead] = useState(false)
  const [filters, setFilters] = useState({
    industry: 'all',
    minScore: 0,
    maxScore: 100,
    verificationStatus: 'all',
    source: 'all',
  })
  
  const [generateForm, setGenerateForm] = useState({
    batchName: '',
    source: 'apollo' as 'apollo' | 'google_places' | 'peopledatalabs' | 'linkedin',
    industry: '',
    country: 'United States',
    city: '',
    maxResults: 50,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leads', statusFilter, filters, searchQuery, activeTab],
    queryFn: async () => {
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (filters.industry !== 'all') params.industry = filters.industry
      if (filters.source !== 'all') params.source = filters.source
      if (searchQuery) params.search = searchQuery
      
      // Filter by source type based on active tab
      if (activeTab === 'imported') params.sourceType = 'manual_import'
      if (activeTab === 'generated') params.sourceType = 'automated'
      
      return await leadsService.getAll(params)
    },
  })

  // Fetch batches for batch view
  const { data: batchesData, isLoading: batchesLoading, refetch: refetchBatches } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => await leadsAPI.getBatches(),
    enabled: viewMode === 'batches' || generating, // Enable when in batch view or generating
  })

  const leads: Lead[] = data?.data || []
  const batches = Array.isArray(batchesData?.data) ? batchesData.data : []

  // Client-side filtering for score and tier
  const filteredLeads = leads.filter(lead => {
    const score = lead.qualityScore || lead.score || 0
    
    // Score range filter
    if (score < filters.minScore || score > filters.maxScore) return false
    
    // Tier filter
    if (tierFilter !== 'all') {
      if (tierFilter === 'hot' && score < 80) return false
      if (tierFilter === 'warm' && (score < 60 || score >= 80)) return false
      if (tierFilter === 'cold' && score >= 60) return false
    }
    
    return true
  })

  const getTierBadge = (score: number) => {
    if (score >= 80) return { label: 'HOT', className: 'bg-red-100 text-red-800' }
    if (score >= 60) return { label: 'WARM', className: 'bg-yellow-100 text-yellow-800' }
    return { label: 'COLD', className: 'bg-blue-100 text-blue-800' }
  }

  // Use shared industries grouped by category
  const industriesByCategory = getIndustriesByCategory()

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 
    'Germany', 'France', 'Spain', 'Italy', 'Other'
  ]

  const handleGenerateLeads = async () => {
    if (!generateForm.industry) {
      toast.error('Please select an industry')
      return
    }

    if (!generateForm.batchName.trim()) {
      toast.error('Please enter a batch name')
      return
    }

    try {
      setGenerating(true)
      setGenerationProgress(`Generating leads from ${generateForm.source}...`)

      // Close modal and switch to batch view
      setShowGenerateModal(false)
      setViewMode('batches')

      // Use the new unified generation endpoint with batch name
      const response = await leadsAPI.generateLeads({
        batchName: generateForm.batchName,
        industry: generateForm.industry,
        country: generateForm.country,
        city: generateForm.city,
        sources: [generateForm.source],
        maxResults: generateForm.maxResults,
      })

      setGenerationProgress('Analyzing websites and scoring leads...')
      
      // Wait for analysis to complete
      await new Promise(resolve => setTimeout(resolve, 1500))

      const data = response.data.data
      const savedCount = data?.saved || data?.count || 0
      const duplicatesCount = data?.duplicates || 0
      const byTier = data?.byTier || { hot: 0, warm: 0, cold: 0 }
      
      let message = `✅ Generated ${savedCount} leads!`
      if (byTier.hot > 0 || byTier.warm > 0 || byTier.cold > 0) {
        message += `\n🔥 ${byTier.hot} hot | ⚡ ${byTier.warm} warm | ❄️ ${byTier.cold} cold`
      }
      if (duplicatesCount > 0) {
        message += `\n(${duplicatesCount} duplicates skipped)`
      }

      toast.success(message, { duration: 5000 })
      
      // Refresh both leads and batches - force refetch
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['leads'] }),
        queryClient.invalidateQueries({ queryKey: ['batches'] }),
        refetch(), // Force immediate refetch of leads
        refetchBatches() // Force immediate refetch of batches
      ])
      
      // Reset form
      setGenerateForm({
        batchName: '',
        source: 'apollo',
        industry: '',
        country: 'United States',
        city: '',
        maxResults: 50,
      })
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to generate leads')
      console.error(error)
      
      // Switch back to table view on error
      setViewMode('table')
    } finally {
      setGenerating(false)
      setGenerationProgress('')
    }
  }

  const handleExport = async () => {
    try {
      // Build query params from current filters
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (filters.industry !== 'all') params.append('industry', filters.industry);
      if (filters.source !== 'all') params.append('source', filters.source);
      if (filters.minScore > 0) params.append('minScore', filters.minScore.toString());
      if (filters.maxScore < 100) params.append('maxScore', filters.maxScore.toString());

      const queryString = params.toString();
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/leads/export${queryString ? '?' + queryString : ''}`;
      
      // Download file
      window.location.href = url;
      toast.success('Exporting leads...');
    } catch (error) {
      toast.error('Failed to export leads');
    }
  }

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const csvData = event.target?.result as string;
          
          toast.loading('Importing leads...');
          
          const response = await api.post('/leads/import', {
            csvData,
            industry: 'Other', // Can be enhanced with a modal to select industry
            enrichEmail: true,
          });

          if (response.data.success) {
            toast.dismiss();
            toast.success(`Imported ${response.data.data.imported} leads successfully!`);
            refetch();
          }
        };
        reader.readAsText(file);
      } catch (error: any) {
        toast.dismiss();
        toast.error(error.response?.data?.error?.message || 'Failed to import leads');
      }
    };
    input.click();
  }

  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    setSelectedLeads(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(filteredLeads.map(lead => lead.id)))
    }
  }

  const handleCreateCampaignFromSelected = async () => {
    if (selectedLeads.size === 0) {
      toast.error('Please select at least one lead')
      return
    }
    setShowCreateCampaignModal(true)
  }

  const [createCampaignForm, setCreateCampaignForm] = useState({
    name: '',
    description: '',
    emailSubject: '',
    emailBody: '',
    startTime: '', // Optional start time for campaign
    daysBetweenEmails: 1, // Default 1 day between emails
    followUpCount: 0, // Default no follow-ups
  })

  const handleGenerateAIContent = async () => {
    try {
      setAiGenerating(true)
      
      // Get sample lead for context
      const sampleLead = filteredLeads[0]
      
      const response = await aiAPI.generateEmailContent({
        industry: sampleLead?.industry,
        companyName: sampleLead?.companyName,
        tone: 'professional',
        purpose: createCampaignForm.description || 'introduce our services',
        callToAction: 'schedule a demo'
      })
      
      if (response.data.success) {
        setCreateCampaignForm({
          ...createCampaignForm,
          emailSubject: response.data.data.subject,
          emailBody: response.data.data.body
        })
        toast.success('AI content generated successfully!')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate AI content')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleSubmitManualCampaign = async () => {
    try {
      if (!createCampaignForm.name || !createCampaignForm.emailSubject || !createCampaignForm.emailBody) {
        toast.error('Please fill in all required fields')
        return
      }

      toast.loading('Creating campaign...')
      
      // Create campaign with email template data inline
      const campaignResponse = await api.post('/campaigns', {
        name: createCampaignForm.name,
        description: createCampaignForm.description,
        campaignType: 'manual',
        status: 'draft',
        emailSubject: createCampaignForm.emailSubject,
        emailBody: createCampaignForm.emailBody,
      })

      const campaignId = campaignResponse.data.data.id

      // Link selected leads to campaign
      await api.post(`/campaigns/${campaignId}/leads`, {
        leadIds: Array.from(selectedLeads),
      })

      toast.dismiss()
      toast.success(`Campaign "${createCampaignForm.name}" created with ${selectedLeads.size} leads!`)
      
      setShowCreateCampaignModal(false)
      setSelectedLeads(new Set())
      setCreateCampaignForm({ 
        name: '', 
        description: '', 
        emailSubject: '', 
        emailBody: '',
        startTime: '',
        daysBetweenEmails: 1,
        followUpCount: 0,
      })
      
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.response?.data?.error?.message || 'Failed to create campaign')
    }
  }

  const handleCreateLead = async () => {
    try {
      if (!createLeadForm.companyName || !createLeadForm.email) {
        toast.error('Company name and email are required')
        return
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(createLeadForm.email)) {
        toast.error('Please enter a valid email address')
        return
      }

      setIsCreatingLead(true)
      toast.loading('Creating lead...')

      const response = await api.post('/leads', {
        companyName: createLeadForm.companyName,
        contactName: createLeadForm.contactName || null,
        email: createLeadForm.email,
        phone: createLeadForm.phone || null,
        website: createLeadForm.website || null,
        industry: createLeadForm.industry || 'Other',
        city: createLeadForm.city || null,
        country: createLeadForm.country || 'United States',
        jobTitle: createLeadForm.jobTitle || null,
        companySize: createLeadForm.companySize || null,
        source: 'manual_entry',
        status: 'new',
        qualityScore: 50, // Default score for manual entries
      })

      toast.dismiss()
      toast.success('Lead created successfully!')
      
      // Refresh leads
      await refetch()
      
      // Close modal and reset form
      setShowCreateLeadModal(false)
      setCreateLeadForm({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        website: '',
        industry: '',
        city: '',
        country: 'United States',
        jobTitle: '',
        companySize: '',
      })
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.response?.data?.error?.message || 'Failed to create lead')
    } finally {
      setIsCreatingLead(false)
    }
  }

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead)
    setShowViewModal(true)
  }

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead)
    setEditForm({
      companyName: lead.companyName,
      contactName: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      jobTitle: lead.jobTitle,
      website: lead.website,
      industry: lead.industry,
      city: lead.city,
      country: lead.country,
      companySize: lead.companySize,
      status: lead.status,
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedLead) return

    try {
      toast.loading('Updating lead...')
      
      await api.put(`/leads/${selectedLead.id}`, editForm)
      
      toast.dismiss()
      toast.success('Lead updated successfully')
      setShowEditModal(false)
      setSelectedLead(null)
      setEditForm({})
      refetch()
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.response?.data?.error?.message || 'Failed to update lead')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-green-100 text-green-800',
      unqualified: 'bg-gray-100 text-gray-800',
      responded: 'bg-purple-100 text-purple-800',
      interested: 'bg-teal-100 text-teal-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-600 mt-2">Manage and track your leads</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowCreateLeadModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Create Lead
            </button>
            <button 
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              <Zap className="w-4 h-4 inline mr-2" />
              Generate Leads
            </button>
            <button 
              onClick={handleImport}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Import CSV
            </button>
            <button 
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div 
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setTierFilter(tierFilter === 'hot' ? 'all' : 'hot')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hot Leads</p>
                <p className="text-2xl font-bold text-red-600">
                  {leads.filter(l => (l.qualityScore || l.score || 0) >= 80).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Score 80+</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setTierFilter(tierFilter === 'warm' ? 'all' : 'warm')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Warm Leads</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {leads.filter(l => {
                    const score = l.qualityScore || l.score || 0
                    return score >= 60 && score < 80
                  }).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Score 60-79</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setTierFilter(tierFilter === 'cold' ? 'all' : 'cold')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cold Leads</p>
                <p className="text-2xl font-bold text-blue-600">
                  {leads.filter(l => (l.qualityScore || l.score || 0) < 60).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Score &lt;60</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Qualified</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leads.filter(l => l.status === 'qualified' || l.status === 'interested').length}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-bold">Q</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => { setActiveTab('all'); setSelectedLeads(new Set()) }}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Leads
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                  {leads.length}
                </span>
              </button>
              <button
                onClick={() => { setActiveTab('imported'); setSelectedLeads(new Set()) }}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'imported'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Imported
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-600">
                  {leads.filter(l => l.sourceType === 'manual_import').length}
                </span>
              </button>
              <button
                onClick={() => { setActiveTab('generated'); setSelectedLeads(new Set()) }}
                className={`px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'generated'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Zap className="w-4 h-4 inline mr-2" />
                Generated
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-100 text-green-600">
                  {leads.filter(l => l.sourceType === 'automated' || !l.sourceType).length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedLeads.size > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-primary-900">
                {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedLeads(new Set())}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCreateCampaignFromSelected}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Create Campaign from Selected
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  viewMode === 'table'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
                Table View
              </button>
              <button
                onClick={() => setViewMode('batches')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  viewMode === 'batches'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package className="w-4 h-4" />
                Batch View
              </button>
            </div>
          </div>

          {/* Search Bar and Status Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by company name, email, or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                showAdvancedFilters
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              Advanced Filters
            </button>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">Status:</span>
            {['all', 'new', 'contacted', 'qualified', 'responded', 'interested', 'unqualified'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <select
                  value={filters.industry}
                  onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Industries</option>
                  {INDUSTRIES.map((industry) => (
                    <option key={industry.value} value={industry.value}>{industry.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lead Source
                </label>
                <select
                  value={filters.source}
                  onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Sources</option>
                  <option value="apollo">Apollo.io</option>
                  <option value="google_places">Google Places</option>
                  <option value="peopledatalabs">People Data Labs</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="manual_import">Manual Import</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Score ({filters.minScore})
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.minScore}
                  onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Score ({filters.maxScore})
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.maxScore}
                  onChange={(e) => setFilters({ ...filters, maxScore: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="md:col-span-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setFilters({
                      industry: 'all',
                      minScore: 0,
                      maxScore: 100,
                      verificationStatus: 'all',
                      source: 'all',
                    })
                    setSearchQuery('')
                    setStatusFilter('all')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-lg text-gray-500">Loading leads...</div>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Users className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filters.industry !== 'all' || filters.source !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by importing or generating your first leads'}
              </p>
              <button 
                onClick={() => setShowGenerateModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <Zap className="w-4 h-4 inline mr-2" />
                Generate Leads
              </button>
            </div>
          ) : (
            <>
              {viewMode === 'table' ? (
                // Table View
                <>
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{filteredLeads.length}</span> of <span className="font-medium">{leads.length}</span> leads
                    </p>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead) => {
                  const score = lead.qualityScore || lead.score || 0
                  const tierBadge = getTierBadge(score)
                  return (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLeads.has(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{lead.companyName}</div>
                      <div className="text-sm text-gray-500">{lead.website || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.contactName}</div>
                      <div className="text-sm text-gray-500">{lead.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.industry || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          lead.status
                        )}`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${tierBadge.className}`}
                      >
                        {tierBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900">{score}/100</div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              score >= 80 ? 'bg-red-500' : score >= 60 ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button 
                        onClick={() => handleViewLead(lead)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        View
                      </button>
                      <button 
                        onClick={() => handleEditLead(lead)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
                </>
              ) : (
                // Batch View
                <div className="p-6 space-y-4">
                  {/* Loading Card - Show when generating */}
                  {generating && (
                    <div className="border-2 border-primary-500 rounded-lg overflow-hidden bg-primary-50 animate-pulse">
                      <div className="flex items-center justify-between p-6">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="relative">
                            <Loader className="w-8 h-8 animate-spin text-primary-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-primary-900 flex items-center gap-2">
                              <Zap className="w-5 h-5" />
                              Generating: {generateForm.batchName}
                            </h3>
                            <p className="text-sm text-primary-700 mt-1">
                              {generationProgress || 'Preparing to generate leads...'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                              <Loader className="w-8 h-8 animate-spin text-primary-600" />
                            </div>
                            <p className="text-xs text-primary-700 mt-2">Processing...</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {batchesLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader className="w-8 h-8 animate-spin text-primary-600" />
                    </div>
                  ) : batches.length === 0 && !generating ? (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Batches Yet</h3>
                      <p className="text-gray-600">Generate leads with batch names to see them organized here</p>
                    </div>
                  ) : (
                    batches.map((batch: any) => {
                      const isExpanded = expandedBatches.has(batch.id)
                      return (
                        <div key={batch.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Batch Header */}
                          <div
                            onClick={() => {
                              const newExpanded = new Set(expandedBatches)
                              if (isExpanded) {
                                newExpanded.delete(batch.id)
                              } else {
                                newExpanded.add(batch.id)
                              }
                              setExpandedBatches(newExpanded)
                            }}
                            className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                              )}
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900">{batch.name}</h3>
                                <p className="text-sm text-gray-600">
                                  Generated on {new Date(batch.createdAt).toLocaleDateString()} at {new Date(batch.createdAt).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-primary-600">{batch.leadCount}</p>
                                <p className="text-xs text-gray-600">Total Leads</p>
                              </div>
                              {batch.totalLeads && (
                                <>
                                  <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600">{batch.successfulImports}</p>
                                    <p className="text-xs text-gray-600">Successful</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-2xl font-bold text-yellow-600">{batch.duplicatesSkipped}</p>
                                    <p className="text-xs text-gray-600">Duplicates</p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Expanded Batch Content */}
                          {isExpanded && (
                            <div className="p-4 bg-white">
                              {batch.sampleLeads && batch.sampleLeads.length > 0 ? (
                                <>
                                  <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Settings Used:</h4>
                                    <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                                      {batch.settings && (
                                        <>
                                          {batch.settings.industry && (
                                            <p><span className="font-medium">Industry:</span> {batch.settings.industry}</p>
                                          )}
                                          {batch.settings.location && (
                                            <p><span className="font-medium">Location:</span> {batch.settings.location}</p>
                                          )}
                                          {batch.settings.source && (
                                            <p><span className="font-medium">Source:</span> {batch.settings.source}</p>
                                          )}
                                          {batch.settings.count && (
                                            <p><span className="font-medium">Count:</span> {batch.settings.count}</p>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-3">Leads in this Batch:</h4>
                                  <div className="space-y-2">
                                    {batch.sampleLeads.map((lead: any) => (
                                      <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="flex-1">
                                          <h5 className="font-medium text-gray-900">{lead.companyName}</h5>
                                          <p className="text-sm text-gray-600">{lead.contactName || 'No contact'} • {lead.email || 'No email'}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                            lead.tier === 'A' ? 'bg-green-100 text-green-800' :
                                            lead.tier === 'B' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            Tier {lead.tier}
                                          </span>
                                          <span className="text-sm font-medium text-gray-700">Score: {lead.score}</span>
                                        </div>
                                      </div>
                                    ))}
                                    {batch.leadCount > 5 && (
                                      <p className="text-sm text-gray-500 text-center pt-2">
                                        Showing 5 of {batch.leadCount} leads. Switch to table view to see all.
                                      </p>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <p className="text-sm text-gray-500 text-center py-4">No leads found in this batch</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Lead Generation Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Generate Leads</h2>
                  <p className="text-sm text-gray-600 mt-1">Select source and configure filters</p>
                </div>
                <button 
                  onClick={() => setShowGenerateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={generating}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Source Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Lead Source *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      generateForm.source === 'apollo' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                    }`}>
                      <input
                        type="radio"
                        checked={generateForm.source === 'apollo'}
                        onChange={() => setGenerateForm({ ...generateForm, source: 'apollo' })}
                        className="mt-1"
                        disabled={generating}
                      />
                      <div>
                        <p className="font-medium text-gray-900">Apollo.io</p>
                        <p className="text-sm text-gray-600">B2B contact database</p>
                        <p className="text-xs text-gray-500 mt-1">100 leads/day limit</p>
                      </div>
                    </label>

                    <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      generateForm.source === 'google_places' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                    }`}>
                      <input
                        type="radio"
                        checked={generateForm.source === 'google_places'}
                        onChange={() => setGenerateForm({ ...generateForm, source: 'google_places' })}
                        className="mt-1"
                        disabled={generating}
                      />
                      <div>
                        <p className="font-medium text-gray-900">Google Places</p>
                        <p className="text-sm text-gray-600">Local businesses</p>
                        <p className="text-xs text-gray-500 mt-1">Unlimited</p>
                      </div>
                    </label>

                    <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      generateForm.source === 'peopledatalabs' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                    }`}>
                      <input
                        type="radio"
                        checked={generateForm.source === 'peopledatalabs'}
                        onChange={() => setGenerateForm({ ...generateForm, source: 'peopledatalabs' })}
                        className="mt-1"
                        disabled={generating}
                      />
                      <div>
                        <p className="font-medium text-gray-900">People Data Labs</p>
                        <p className="text-sm text-gray-600">Contact enrichment</p>
                        <p className="text-xs text-gray-500 mt-1">1,000 credits/month</p>
                      </div>
                    </label>

                    <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      generateForm.source === 'linkedin' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                    }`}>
                      <input
                        type="radio"
                        checked={generateForm.source === 'linkedin'}
                        onChange={() => setGenerateForm({ ...generateForm, source: 'linkedin' })}
                        className="mt-1"
                        disabled={generating}
                      />
                      <div>
                        <p className="font-medium text-gray-900">LinkedIn CSV</p>
                        <p className="text-sm text-gray-600">Sales Navigator</p>
                        <p className="text-xs text-gray-500 mt-1">Manual upload</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Batch Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Name *
                  </label>
                  <input
                    type="text"
                    value={generateForm.batchName}
                    onChange={(e) => setGenerateForm({ ...generateForm, batchName: e.target.value })}
                    placeholder="e.g., NYC Hotels - March 2024"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={generating}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Give this batch a descriptive name to organize your leads
                  </p>
                </div>

                {/* Industry Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry *
                  </label>
                  <select
                    value={generateForm.industry}
                    onChange={(e) => setGenerateForm({ ...generateForm, industry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={generating}
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

                {/* Location Filters */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <select
                      value={generateForm.country}
                      onChange={(e) => setGenerateForm({ ...generateForm, country: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={generating}
                    >
                      {countries.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City (Optional)
                    </label>
                    <input
                      type="text"
                      value={generateForm.city}
                      onChange={(e) => setGenerateForm({ ...generateForm, city: e.target.value })}
                      placeholder="e.g., New York"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={generating}
                    />
                  </div>
                </div>

                {/* Max Results */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Results
                  </label>
                  <input
                    type="number"
                    value={generateForm.maxResults}
                    onChange={(e) => setGenerateForm({ ...generateForm, maxResults: parseInt(e.target.value) || 0 })}
                    min="1"
                    max="500"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={generating}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Note: Actual results may be lower based on API limits and data availability
                  </p>
                </div>

                {/* Progress Indicator */}
                {generating && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Generating leads...</p>
                        <p className="text-xs text-blue-700 mt-1">{generationProgress}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-6 border-t">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={generating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateLeads}
                  disabled={generating || !generateForm.industry}
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader className="w-4 h-4 inline mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 inline mr-2" />
                      Generate Leads
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Campaign from Selected Leads Modal */}
        {showCreateCampaignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Create Manual Campaign</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Campaign will be created with {selectedLeads.size} selected lead{selectedLeads.size !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateCampaignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={createCampaignForm.name}
                    onChange={(e) => setCreateCampaignForm({ ...createCampaignForm, name: e.target.value })}
                    placeholder="e.g., Imported Leads Q4 Outreach"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={createCampaignForm.description}
                    onChange={(e) => setCreateCampaignForm({ ...createCampaignForm, description: e.target.value })}
                    placeholder="Describe the campaign purpose..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Email Subject *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateAIContent}
                      disabled={aiGenerating}
                      className="px-3 py-1 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 flex items-center gap-1 disabled:opacity-50"
                    >
                      {aiGenerating ? (
                        <Loader className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {aiGenerating ? 'Generating...' : 'Generate with AI'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={createCampaignForm.emailSubject}
                    onChange={(e) => setCreateCampaignForm({ ...createCampaignForm, emailSubject: e.target.value })}
                    placeholder="e.g., Transform Your Booking Process with [Product]"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Body *
                  </label>
                  <textarea
                    value={createCampaignForm.emailBody}
                    onChange={(e) => setCreateCampaignForm({ ...createCampaignForm, emailBody: e.target.value })}
                    placeholder="Hi {{contactName}},&#10;&#10;I noticed {{companyName}} and wanted to reach out...&#10;&#10;Use {{variable}} for personalization"
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Available variables: {'{{companyName}}'}, {'{{contactName}}'}, {'{{website}}'}, {'{{industry}}'}
                  </p>
                </div>

                {/* Schedule Options */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Options</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={createCampaignForm.startTime}
                        onChange={(e) => setCreateCampaignForm({ ...createCampaignForm, startTime: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty to start immediately</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Days Between Emails
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={createCampaignForm.daysBetweenEmails}
                        onChange={(e) => setCreateCampaignForm({ ...createCampaignForm, daysBetweenEmails: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">For follow-up sequences</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-Up Emails
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={createCampaignForm.followUpCount}
                        onChange={(e) => setCreateCampaignForm({ ...createCampaignForm, followUpCount: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">0 = one-time send</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Next Steps:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Campaign will be created in draft status</li>
                    <li>All {selectedLeads.size} selected leads will be linked</li>
                    <li>Go to Campaigns page to start sending emails</li>
                  </ol>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-6 border-t">
                <button
                  onClick={() => setShowCreateCampaignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitManualCampaign}
                  disabled={!createCampaignForm.name || !createCampaignForm.emailSubject || !createCampaignForm.emailBody}
                  className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Create Campaign
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Lead Modal */}
        {showViewModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Lead Details</h2>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedLead(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Company Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Company Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.companyName || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Industry</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.industry || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Website</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedLead.website ? (
                          <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                            {selectedLead.website}
                          </a>
                        ) : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Company Size</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.companySize || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Contact Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.contactName || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Job Title</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.jobTitle || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.email || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Phone</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.phone || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">City</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.city || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Country</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.country || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Lead Metrics */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Quality Score</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.qualityScore || 0}/100</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Status</label>
                      <p className="mt-1">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedLead.status)}`}>
                          {selectedLead.status?.toUpperCase()}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Source</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.source || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Source Type</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedLead.sourceType === 'manual_import' ? 'Imported' : 'Generated'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end p-6 border-t space-x-3">
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    handleEditLead(selectedLead)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  Edit Lead
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedLead(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Lead Modal */}
        {showEditModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Edit Lead</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedLead(null)
                    setEditForm({})
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Company Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                      <input
                        type="text"
                        value={editForm.companyName || ''}
                        onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                      <input
                        type="text"
                        value={editForm.industry || ''}
                        onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input
                        type="url"
                        value={editForm.website || ''}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                      <select
                        value={editForm.companySize || ''}
                        onChange={(e) => setEditForm({ ...editForm, companySize: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select size</option>
                        <option value="1-10">1-10</option>
                        <option value="11-50">11-50</option>
                        <option value="51-200">51-200</option>
                        <option value="201-500">201-500</option>
                        <option value="501-1000">501-1000</option>
                        <option value="1000+">1000+</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={editForm.contactName || ''}
                        onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                      <input
                        type="text"
                        value={editForm.jobTitle || ''}
                        onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={editForm.city || ''}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={editForm.country || ''}
                        onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={editForm.status || ''}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="unqualified">Unqualified</option>
                        <option value="responded">Responded</option>
                        <option value="interested">Interested</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end p-6 border-t space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedLead(null)
                    setEditForm({})
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editForm.companyName}
                  className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Lead Modal */}
        {showCreateLeadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-bold text-gray-900">Create New Lead</h2>
                <button
                  onClick={() => {
                    setShowCreateLeadModal(false)
                    setCreateLeadForm({
                      companyName: '',
                      contactName: '',
                      email: '',
                      phone: '',
                      website: '',
                      industry: '',
                      city: '',
                      country: 'United States',
                      jobTitle: '',
                      companySize: '',
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Company Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={createLeadForm.companyName}
                        onChange={(e) => setCreateLeadForm({ ...createLeadForm, companyName: e.target.value })}
                        placeholder="e.g., Acme Corporation"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                      <select
                        value={createLeadForm.industry}
                        onChange={(e) => setCreateLeadForm({ ...createLeadForm, industry: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Industry</option>
                        {Object.values(INDUSTRY_CATEGORIES).map(category => {
                          const industriesInCategory = INDUSTRIES.filter(ind => ind.category === category);
                          return (
                            <optgroup key={category} label={category}>
                              {industriesInCategory.map((ind: IndustryOption) => (
                                <option key={ind.value} value={ind.value}>
                                  {ind.label}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                      <select
                        value={createLeadForm.companySize}
                        onChange={(e) => setCreateLeadForm({ ...createLeadForm, companySize: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Size</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-500">201-500 employees</option>
                        <option value="501+">501+ employees</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input
                        type="url"
                        value={createLeadForm.website}
                        onChange={(e) => setCreateLeadForm({ ...createLeadForm, website: e.target.value })}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={createLeadForm.contactName}
                        onChange={(e) => setCreateLeadForm({ ...createLeadForm, contactName: e.target.value })}
                        placeholder="John Doe"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                      <input
                        type="text"
                        value={createLeadForm.jobTitle}
                        onChange={(e) => setCreateLeadForm({ ...createLeadForm, jobTitle: e.target.value })}
                        placeholder="CEO"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={createLeadForm.email}
                        onChange={(e) => setCreateLeadForm({ ...createLeadForm, email: e.target.value })}
                        placeholder="john@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={createLeadForm.phone}
                        onChange={(e) => setCreateLeadForm({ ...createLeadForm, phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={createLeadForm.city}
                        onChange={(e) => setCreateLeadForm({ ...createLeadForm, city: e.target.value })}
                        placeholder="New York"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={createLeadForm.country}
                        onChange={(e) => setCreateLeadForm({ ...createLeadForm, country: e.target.value })}
                        placeholder="United States"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Use this to create test leads for email campaigns. Make sure to use a real email address you have access to for testing.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end p-6 border-t space-x-3">
                <button
                  onClick={() => {
                    setShowCreateLeadModal(false)
                    setCreateLeadForm({
                      companyName: '',
                      contactName: '',
                      email: '',
                      phone: '',
                      website: '',
                      industry: '',
                      city: '',
                      country: 'United States',
                      jobTitle: '',
                      companySize: '',
                    })
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={isCreatingLead}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateLead}
                  disabled={!createLeadForm.companyName || !createLeadForm.email || isCreatingLead}
                  className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreatingLead ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Lead
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
