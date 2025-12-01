import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useQueryClient } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import ConfirmDialog from '@/components/ConfirmDialog'
import leadsService, { Lead } from '@/services/leads.service'
import { aiAPI, campaignsAPI, leadsAPI } from '@/services/api'
import { Plus, Filter, Download, Upload, Users, Zap, Search, Package, List, TrendingUp, Target } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { INDUSTRIES, getIndustriesByCategory, INDUSTRY_CATEGORIES, type IndustryOption } from '@leadnex/shared'

// Extracted Components
import { useLeadsData } from '@/hooks/useLeadsData'
import ImportCSVDialog from '@/components/leads/ImportCSVDialog'
import { GenerateLeadsModal } from '@/components/leads/GenerateLeadsModal'
import { CreateCampaignModal } from '@/components/leads/CreateCampaignModal'
import { LeadModals } from '@/components/leads/LeadModals'
import { BatchModals } from '@/components/leads/BatchModals'
import { LeadsTableView } from '@/components/leads/LeadsTableView'
import { BatchesView } from '@/components/leads/BatchesView'

export default function Leads() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'all' | 'imported' | 'generated'>('all')
  const [viewMode, setViewMode] = useState<'table' | 'batches'>('table')
  
  // Check if URL has view=batches query parameter
  useEffect(() => {
    if (router.query.view === 'batches') {
      setViewMode('batches')
    }
  }, [router.query.view])
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
  const [showBatchCampaignModal, setShowBatchCampaignModal] = useState(false)
  const [selectedBatchForCampaign, setSelectedBatchForCampaign] = useState<any>(null)
  const [showBatchAnalyticsModal, setShowBatchAnalyticsModal] = useState(false)
  const [selectedBatchForAnalytics, setSelectedBatchForAnalytics] = useState<any>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importForm, setImportForm] = useState({
    batchName: '',
    industry: 'Other',
    enrichEmail: true,
  })
  const [isImporting, setIsImporting] = useState(false)
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

  // Use custom hook for data fetching
  const { leads, batches, allLeads, allBatches, isLoading, batchesLoading, refetch, refetchBatches } = useLeadsData({
    statusFilter,
    filters,
    searchQuery,
    activeTab,
    viewMode,
    generating,
  })

  // Client-side filtering for score and tier
  const filteredLeads = leads.filter((lead: any) => {
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
      if (viewMode === 'batches') {
        // Export batches as CSV
        const batchesData = batches || [];
        const csvContent = [
          ['Batch Name', 'Source', 'Total Leads', 'Successful', 'Duplicates', 'Status', 'Created Date'].join(','),
          ...batchesData.map((batch: any) => [
            `"${batch.name}"`,
            batch.source,
            batch.totalLeads,
            batch.successfulImports,
            batch.duplicatesSkipped,
            batch.status || 'completed',
            new Date(batch.createdAt).toLocaleDateString(),
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `batches-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('Batches exported successfully!');
      } else {
        // Export leads from table view
        toast.loading('Exporting leads...');
        
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (filters.industry !== 'all') params.append('industry', filters.industry);
        if (filters.source !== 'all') params.append('source', filters.source);
        if (filters.minScore > 0) params.append('minScore', filters.minScore.toString());
        if (filters.maxScore < 100) params.append('maxScore', filters.maxScore.toString());

        const queryString = params.toString();
        const url = `/leads/export${queryString ? '?' + queryString : ''}`;
        
        // Fetch the CSV data
        const response = await api.get(url);
        
        // Create blob and download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        
        toast.dismiss();
        toast.success('Leads exported successfully!');
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.response?.data?.error?.message || 'Failed to export');
    }
  }

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      // Set file and show dialog
      setImportFile(file);
      setImportForm({
        batchName: `CSV Import - ${new Date().toLocaleDateString()}`,
        industry: 'Other',
        enrichEmail: true,
      });
      setShowImportDialog(true);
    };
    input.click();
  }

  const handleImportSubmit = async () => {
    if (!importFile) return;

    setIsImporting(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csvData = event.target?.result as string;
        
        try {
          const response = await api.post('/leads/import', {
            csvData,
            industry: importForm.industry,
            enrichEmail: importForm.enrichEmail,
            batchName: importForm.batchName,
          });

          if (response.data.success) {
            toast.success(`Imported ${response.data.data.imported} leads successfully! ${response.data.data.duplicates > 0 ? `(${response.data.data.duplicates} duplicates skipped)` : ''}`);
            refetch();
            refetchBatches();
            
            // Switch to batch view to see the new batch
            if (viewMode !== 'batches') {
              setViewMode('batches');
            }
            
            // Close dialog
            setShowImportDialog(false);
            setImportFile(null);
          }
        } catch (error: any) {
          toast.error(error.response?.data?.error?.message || 'Failed to import leads');
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(importFile);
    } catch (error: any) {
      toast.error('Failed to read file');
      setIsImporting(false);
    }
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
      setSelectedLeads(new Set(filteredLeads.map((lead: any) => lead.id)))
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
    workflowId: null as string | null, // Selected workflow ID
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
      // Validate: need name and either workflow or custom email
      if (!createCampaignForm.name) {
        toast.error('Please enter a campaign name')
        return
      }

      if (!createCampaignForm.workflowId && (!createCampaignForm.emailSubject || !createCampaignForm.emailBody)) {
        toast.error('Please select a workflow or provide custom email template')
        return
      }

      toast.loading('Creating campaign...')
      
      // Create campaign with email template data inline or workflow reference
      const campaignData: any = {
        name: createCampaignForm.name,
        description: createCampaignForm.description,
        campaignType: 'manual',
        status: 'draft',
      }

      // Add workflow or custom email
      if (createCampaignForm.workflowId) {
        campaignData.workflowId = createCampaignForm.workflowId
      } else {
        campaignData.emailSubject = createCampaignForm.emailSubject
        campaignData.emailBody = createCampaignForm.emailBody
      }

      // Add schedule if provided
      if (createCampaignForm.startTime) {
        campaignData.startTime = createCampaignForm.startTime
      }

      const campaignResponse = await api.post('/campaigns', campaignData)

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
        workflowId: null,
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

  const confirmDelete = async () => {
    if (!leadToDelete) return

    try {
      setIsDeleting(true)
      toast.loading('Deleting lead...')
      
      await api.delete(`/leads/${leadToDelete}`)
      
      toast.dismiss()
      toast.success('Lead deleted successfully')
      setShowDeleteConfirm(false)
      setLeadToDelete(null)
      refetch()
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.response?.data?.error?.message || 'Failed to delete lead')
    } finally {
      setIsDeleting(false)
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
            <h1 className="text-3xl font-bold text-gray-900">Leads Management</h1>
            <p className="text-gray-600 mt-2">Manage and track your leads and batches</p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => {
                  setViewMode('table')
                  setSelectedLeads(new Set())
                  setStatusFilter('all')
                  setTierFilter('all')
                }}
                className={`px-8 py-4 border-b-2 font-medium text-base ${
                  viewMode === 'table'
                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <List className="w-5 h-5 inline mr-2" />
                Leads View
              </button>
              <button
                onClick={() => {
                  setViewMode('batches')
                  setSelectedLeads(new Set())
                  setActiveTab('all')
                  setStatusFilter('all')
                }}
                className={`px-8 py-4 border-b-2 font-medium text-base ${
                  viewMode === 'batches'
                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="w-5 h-5 inline mr-2" />
                Batch View
              </button>
            </nav>
          </div>
        </div>

        {/* Action Buttons - Different for each view */}
        <div className="flex items-center justify-end space-x-3">
          {viewMode === 'table' ? (
            <>
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
                Generate Leads Batch
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
                Export Leads
              </button>
            </>
          ) : (
            <>
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
                Export Batches
              </button>
            </>
          )}
        </div>

        {/* Stats Cards - Different for each view */}
        {viewMode === 'table' ? (
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
                    {leads.filter((l: any) => (l.qualityScore || l.score || 0) >= 80).length}
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
                    {leads.filter((l: any) => {
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
                    {leads.filter((l: any) => (l.qualityScore || l.score || 0) < 60).length}
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
                    {leads.filter((l: any) => l.status === 'qualified' || l.status === 'interested').length}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold">Q</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Batches</p>
                  <p className="text-2xl font-bold text-gray-900">{batches.length}</p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Leads in Batches</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {batches.reduce((sum: number, batch: any) => sum + (batch.leadsCount || 0), 0)}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Leads per Batch</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {batches.length > 0 ? Math.round(batches.reduce((sum: number, batch: any) => sum + (batch.leadsCount || 0), 0) / batches.length) : 0}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {batches.filter((b: any) => b.campaignStatus === 'active').length}
                  </p>
                </div>
                <Zap className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>
        )}

        {/* Category Tabs - Different for each view */}
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
                {viewMode === 'table' ? 'All Leads' : 'All Batches'}
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                  {viewMode === 'table' ? allLeads.length : allBatches.length}
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
                  {viewMode === 'table' 
                    ? allLeads.filter((l: any) => l.sourceType === 'manual_import').length
                    : allBatches.filter((b: any) => !b.importSettings?.sources).length
                  }
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
                  {viewMode === 'table'
                    ? allLeads.filter((l: any) => l.sourceType === 'automated' || (!l.sourceType && l.source !== 'manual')).length
                    : allBatches.filter((b: any) => b.importSettings?.sources && Array.isArray(b.importSettings.sources)).length
                  }
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
          {/* Search Bar and Advanced Filters Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={viewMode === 'table' ? "Search by company name, email, or contact..." : "Search batches by name or industry..."}
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

          {/* Status Filter Buttons - Only show for Leads View */}
          {viewMode === 'table' && (
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
          )}

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

        {/* Leads View - Table or Batches */}
        {viewMode === 'table' ? (
          <LeadsTableView
            leads={leads}
            filteredLeads={filteredLeads}
            selectedLeads={selectedLeads}
            isLoading={isLoading}
            searchQuery={searchQuery}
            filters={filters}
            onSelectAll={handleSelectAll}
            onSelectLead={handleSelectLead}
            onViewLead={handleViewLead}
            onEditLead={handleEditLead}
            onGenerateClick={() => setShowGenerateModal(true)}
            getStatusColor={getStatusColor}
            getTierBadge={getTierBadge}
          />
        ) : (
          <BatchesView
            batches={batches}
            batchesLoading={batchesLoading}
            generating={generating}
            generateForm={generateForm}
            generationProgress={generationProgress}
            onBatchClick={(batchId) => router.push(`/batches/${batchId}`)}
            onStartCampaign={(batch) => {
              setSelectedBatchForCampaign(batch)
              setShowBatchCampaignModal(true)
            }}
            onViewAnalytics={(batch) => {
              setSelectedBatchForAnalytics(batch)
              setShowBatchAnalyticsModal(true)
            }}
          />
        )}

        {/* Modals */}
        <GenerateLeadsModal
          show={showGenerateModal}
          generateForm={generateForm}
          generating={generating}
          generationProgress={generationProgress}
          industriesByCategory={industriesByCategory}
          countries={countries}
          onClose={() => setShowGenerateModal(false)}
          onFormChange={setGenerateForm}
          onSubmit={handleGenerateLeads}
        />

        <ImportCSVDialog
          show={showImportDialog}
          importFile={importFile}
          importForm={importForm}
          isImporting={isImporting}
          onClose={() => {
            setShowImportDialog(false)
            setImportFile(null)
            setImportForm({ batchName: '', industry: 'Other', enrichEmail: true })
          }}
          onFormChange={setImportForm}
          onSubmit={handleImportSubmit}
        />

        <CreateCampaignModal
          show={showCreateCampaignModal}
          selectedLeadsCount={selectedLeads.size}
          createCampaignForm={createCampaignForm}
          aiGenerating={aiGenerating}
          onClose={() => setShowCreateCampaignModal(false)}
          onFormChange={setCreateCampaignForm}
          onSubmit={handleSubmitManualCampaign}
          onGenerateAI={handleGenerateAIContent}
        />

        <LeadModals
          showViewModal={showViewModal}
          selectedLead={selectedLead}
          onCloseView={() => {
            setShowViewModal(false)
            setSelectedLead(null)
          }}
          onEditFromView={(lead) => {
            setShowViewModal(false)
            handleEditLead(lead)
          }}
          getStatusColor={getStatusColor}
          showEditModal={showEditModal}
          editForm={editForm}
          onCloseEdit={() => {
            setShowEditModal(false)
            setSelectedLead(null)
            setEditForm({})
          }}
          onEditFormChange={setEditForm}
          onSaveEdit={handleSaveEdit}
          showCreateModal={showCreateLeadModal}
          createForm={createLeadForm}
          isCreating={isCreatingLead}
          onCloseCreate={() => {
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
          onCreateFormChange={(form) => setCreateLeadForm(form as any)}
          onCreateLead={handleCreateLead}
          industriesByCategory={industriesByCategory}
        />

        <BatchModals
          showAnalyticsModal={showBatchAnalyticsModal}
          selectedBatchForAnalytics={selectedBatchForAnalytics}
          onCloseAnalytics={() => {
            setShowBatchAnalyticsModal(false)
            setSelectedBatchForAnalytics(null)
          }}
          showCampaignModal={showBatchCampaignModal}
          selectedBatchForCampaign={selectedBatchForCampaign}
          onCloseCampaign={() => {
            setShowBatchCampaignModal(false)
            setSelectedBatchForCampaign(null)
          }}
          onCreateCampaign={async (data: any) => {
            await campaignsAPI.createCampaignFromBatch({
              ...data,
              batchId: String(data.batchId)
            })
          }}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false)
            setLeadToDelete(null)
          }}
          onConfirm={confirmDelete}
          title="Delete Lead"
          message="Are you sure you want to delete this lead? This action cannot be undone."
          confirmText="Delete"
          isLoading={isDeleting}
        />
      </div>
    </Layout>
  )
}
