import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useQueryClient } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import ConfirmDialog from '@/components/ConfirmDialog'
import ProgressDialog from '@/components/ProgressDialog'
import ResultDialog from '@/components/ResultDialog'
import leadsService, { Lead } from '@/services/leads.service'
import { aiAPI, campaignsAPI, leadsAPI } from '@/services/api'
import { Plus, Filter, Download, Upload, Users, Zap, Search, Package, List, Flame, Thermometer, Snowflake, TrendingUp, X, ChevronRight, FileText, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { INDUSTRIES, getIndustriesByCategory, INDUSTRY_CATEGORIES, type IndustryOption } from '@leadnex/shared'

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
// Extracted Components
import { useLeadsData } from '@/hooks/useLeadsData'
import ImportCSVDialog from '@/components/leads/ImportCSVDialog'
import { GenerateLeadsModal } from '@/components/leads/GenerateLeadsModal'
import { CreateCampaignModal } from '@/components/leads/CreateCampaignModal'
import { LeadModals } from '@/components/leads/LeadModals'
import { BatchModals } from '@/components/leads/BatchModals'
import { LeadsTableView } from '@/components/leads/LeadsTableView'
import { BatchesView } from '@/components/leads/BatchesView'

function Leads() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [dateViewMode, setDateViewMode] = useState<'monthly' | 'allTime'>('allTime')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [activeTab, setActiveTab] = useState<'all' | 'imported' | 'generated'>('all')
  const [viewMode, setViewMode] = useState<'table' | 'batches'>('batches')
  
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
  const [showProgressDialog, setShowProgressDialog] = useState(false)
  const [progressTitle, setProgressTitle] = useState('')
  const [progressMessage, setProgressMessage] = useState('')
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [resultData, setResultData] = useState<{ title: string; message?: string; stats: Array<{ label: string; value: number | string; highlight?: boolean }>; variant: 'success' | 'warning' | 'error' | 'info' }>({
    title: '',
    stats: [],
    variant: 'success'
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [selectedBatches, setSelectedBatches] = useState<Set<string | number>>(new Set())
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [editForm, setEditForm] = useState<Partial<Lead>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteBatchesConfirm, setShowDeleteBatchesConfirm] = useState(false)
  const [showDeleteLeadsConfirm, setShowDeleteLeadsConfirm] = useState(false)
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
  const [showAddLeadsModal, setShowAddLeadsModal] = useState(false)
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
    withoutContacts: false,
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

  // Apply date filtering to allLeads for stats calculation
  const dateFilteredLeads = allLeads.filter((lead: any) => {
    if (dateViewMode === 'allTime') return true
    
    const leadDate = new Date(lead.createdAt)
    const leadMonth = leadDate.getMonth() + 1
    const leadYear = leadDate.getFullYear()
    
    return leadMonth === selectedMonth && leadYear === selectedYear
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
    'United States',
    'Canada',
    'United Kingdom',
    'Australia',
    'Germany',
    'France',
    'Spain',
    'Italy',
    'Netherlands',
    'Belgium',
    'Switzerland',
    'Austria',
    'Sweden',
    'Norway',
    'Denmark',
    'Finland',
    'Ireland',
    'Portugal',
    'Poland',
    'Czech Republic',
    'Greece',
    'New Zealand',
    'Singapore',
    'Hong Kong',
    'Japan',
    'South Korea',
    'India',
    'United Arab Emirates',
    'Saudi Arabia',
    'Qatar',
    'Brazil',
    'Mexico',
    'Argentina',
    'Chile',
    'South Africa',
    'Other (Manual Entry)'
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
      
      // Close generate modal immediately
      setShowGenerateModal(false)
      
      // Show success toast that generation started
      toast.success('🚀 Lead generation started! This may take a minute...', {
        duration: 4000,
      })
      
      // Switch to batch view immediately so user can see progress
      setViewMode('batches')

      // Run generation in "background" - user can still navigate
      const response = await leadsAPI.generateLeads({
        batchName: generateForm.batchName,
        industry: generateForm.industry,
        country: generateForm.country,
        city: generateForm.city,
        sources: [generateForm.source],
        maxResults: generateForm.maxResults,
      })

      const data = response.data.data
      const savedCount = data?.saved || data?.count || 0
      const duplicatesCount = data?.duplicates || 0
      const byTier = data?.byTier || { hot: 0, warm: 0, cold: 0 }
      
      // Show result dialog with statistics
      setResultData({
        title: 'Leads Generated Successfully!',
        message: `Successfully generated and analyzed ${savedCount} new leads`,
        variant: 'success',
        stats: [
          { label: '🔥 Hot Leads', value: byTier.hot, highlight: byTier.hot > 0 },
          { label: '⚡ Warm Leads', value: byTier.warm },
          { label: '❄️ Cold Leads', value: byTier.cold },
          { label: 'Total Generated', value: savedCount, highlight: true },
          ...(duplicatesCount > 0 ? [{ label: 'Duplicates Skipped', value: duplicatesCount }] : [])
        ]
      })
      setShowResultDialog(true)
      
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
    } finally {
      setGenerating(false)
      setGenerationProgress('')
    }
  }

  const handleExport = async () => {
    try {
      if (viewMode === 'batches') {
        // Show progress
        setProgressTitle('Exporting Batches')
        setProgressMessage('Preparing batch data...')
        setShowProgressDialog(true)
        
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

        setProgressMessage('Generating CSV file...')
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `batches-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        setShowProgressDialog(false)
        toast.success('Batches exported successfully!');
      } else {
        // Export leads from table view
        setProgressTitle('Exporting Leads')
        setProgressMessage('Fetching lead data...')
        setShowProgressDialog(true)
        
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (filters.industry !== 'all') params.append('industry', filters.industry);
        if (filters.source !== 'all') params.append('source', filters.source);
        if (filters.minScore > 0) params.append('minScore', filters.minScore.toString());
        if (filters.maxScore < 100) params.append('maxScore', filters.maxScore.toString());

        const queryString = params.toString();
        const url = `/leads/export${queryString ? '?' + queryString : ''}`;
        
        setProgressMessage('Generating CSV file...')
        
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
        
        setShowProgressDialog(false)
        toast.success('Leads exported successfully!');
      }
    } catch (error: any) {
      setShowProgressDialog(false)
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
    
    // Close import dialog
    setShowImportDialog(false);
    
    // Show progress dialog
    setProgressTitle('Importing Leads')
    setProgressMessage('Reading CSV file...')
    setShowProgressDialog(true)
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csvData = event.target?.result as string;
        
        try {
          setProgressMessage('Processing and validating leads...')
          
          const response = await api.post('/leads/import', {
            csvData,
            industry: importForm.industry,
            enrichEmail: importForm.enrichEmail,
            batchName: importForm.batchName,
          });

          if (response.data.success) {
            const { imported, duplicates, totalLeads } = response.data.data;
            const failed = totalLeads - imported - duplicates;
            
            // Hide progress dialog
            setShowProgressDialog(false)
            
            // Show result dialog
            setResultData({
              title: 'Import Complete!',
              message: `Processed ${totalLeads} leads from CSV file`,
              variant: imported === 0 && duplicates > 0 ? 'warning' : 'success',
              stats: [
                { label: '✅ Successfully Added', value: imported, highlight: imported > 0 },
                ...(duplicates > 0 ? [{ label: '⚠️ Duplicates Skipped', value: duplicates }] : []),
                ...(failed > 0 ? [{ label: '❌ Failed to Import', value: failed }] : []),
                { label: '📦 Total Processed', value: totalLeads, highlight: true }
              ]
            })
            setShowResultDialog(true)
            
            refetch();
            refetchBatches();
            
            // Switch to batch view to see the new batch
            if (viewMode !== 'batches') {
              setViewMode('batches');
            }
            
            // Reset import form
            setImportFile(null);
          }
        } catch (error: any) {
          setShowProgressDialog(false)
          toast.error(error.response?.data?.error?.message || 'Failed to import leads');
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(importFile);
    } catch (error: any) {
      setShowProgressDialog(false)
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
        campaignData.scheduledAt = createCampaignForm.startTime
        campaignData.scheduleType = 'scheduled'
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

  const handleSelectBatch = (batchId: string | number) => {
    const newSelected = new Set(selectedBatches)
    if (newSelected.has(batchId)) {
      newSelected.delete(batchId)
    } else {
      newSelected.add(batchId)
    }
    setSelectedBatches(newSelected)
  }

  const handleSelectAllBatches = () => {
    if (selectedBatches.size === batches.length) {
      setSelectedBatches(new Set())
    } else {
      setSelectedBatches(new Set(batches.map((batch: any) => batch.id)))
    }
  }

  const handleDeleteSelectedBatches = () => {
    if (selectedBatches.size === 0) return
    setShowDeleteBatchesConfirm(true)
  }

  const confirmDeleteBatches = async () => {
    try {
      setIsDeleting(true)
      setShowDeleteBatchesConfirm(false)
      
      // Show progress dialog
      setProgressTitle('Deleting Batches')
      setProgressMessage(`Removing ${selectedBatches.size} batch${selectedBatches.size > 1 ? 'es' : ''} and their associated leads...`)
      setShowProgressDialog(true)
      
      // Delete each batch
      const results = await Promise.allSettled(
        Array.from(selectedBatches).map(batchId => 
          api.delete(`/leads/batches/${batchId}`)
        )
      )
      
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      setShowProgressDialog(false)
      
      // Show result dialog
      setResultData({
        title: failed === 0 ? 'Batches Deleted Successfully' : 'Batch Deletion Completed',
        message: failed === 0 
          ? 'All selected batches have been removed from your workspace.'
          : 'Some batches could not be deleted. See details below.',
        variant: failed === 0 ? 'success' : 'warning',
        stats: [
          { label: '✅ Successfully Deleted', value: successful.toString(), highlight: successful > 0 },
          ...(failed > 0 ? [{ label: '❌ Failed to Delete', value: failed.toString(), highlight: true }] : []),
          { label: '📦 Total Selected', value: selectedBatches.size.toString() }
        ]
      })
      setShowResultDialog(true)
      
      if (successful > 0) {
        setSelectedBatches(new Set())
        refetchBatches()
      }
    } catch (error: any) {
      setShowProgressDialog(false)
      toast.error(error.response?.data?.error?.message || 'Failed to delete batches')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteSelectedLeads = () => {
    if (selectedLeads.size === 0) return
    setShowDeleteLeadsConfirm(true)
  }

  const confirmDeleteLeads = async () => {
    try {
      setIsDeleting(true)
      setShowDeleteLeadsConfirm(false)
      
      // Show progress dialog
      setProgressTitle('Deleting Leads')
      setProgressMessage(`Removing ${selectedLeads.size} lead${selectedLeads.size > 1 ? 's' : ''} from your workspace...`)
      setShowProgressDialog(true)
      
      // Delete each lead
      const results = await Promise.allSettled(
        Array.from(selectedLeads).map(leadId => 
          api.delete(`/leads/${leadId}`)
        )
      )
      
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      setShowProgressDialog(false)
      
      // Show result dialog
      setResultData({
        title: failed === 0 ? 'Leads Deleted Successfully' : 'Lead Deletion Completed',
        message: failed === 0 
          ? 'All selected leads have been removed from your workspace.'
          : 'Some leads could not be deleted. See details below.',
        variant: failed === 0 ? 'success' : 'warning',
        stats: [
          { label: '✅ Successfully Deleted', value: successful.toString(), highlight: successful > 0 },
          ...(failed > 0 ? [{ label: '❌ Failed to Delete', value: failed.toString(), highlight: true }] : []),
          { label: '📦 Total Selected', value: selectedLeads.size.toString() }
        ]
      })
      setShowResultDialog(true)
      
      if (successful > 0) {
        setSelectedLeads(new Set())
        refetch()
      }
    } catch (error: any) {
      setShowProgressDialog(false)
      toast.error(error.response?.data?.error?.message || 'Failed to delete leads')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      responded: 'bg-purple-100 text-purple-800',
      interested: 'bg-teal-100 text-teal-800',
      converted: 'bg-green-100 text-green-800',
      not_interested: 'bg-gray-100 text-gray-800',
      follow_up_1: 'bg-orange-100 text-orange-800',
      follow_up_2: 'bg-orange-100 text-orange-800',
      invalid: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Layout>
      <div className="space-y-5 max-w-full overflow-x-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage, generate and track all your leads</p>
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
            <Link href="/ai-create?type=leads">
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-semibold">
                <Sparkles className="w-4 h-4" />
                Generate with AI
              </button>
            </Link>
            <button
              onClick={() => setShowAddLeadsModal(true)}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Leads
            </button>
          </div>
        </div>

        {/* ── Smart Stat Strip ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode !== 'batches' && (
            <>
          <button
            onClick={() => setTierFilter('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              tierFilter === 'all'
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>All</span>
            <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${tierFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {allLeads.length}
            </span>
          </button>
          <button
            onClick={() => setTierFilter(tierFilter === 'hot' ? 'all' : 'hot')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              tierFilter === 'hot'
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Hot</span>
            <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${tierFilter === 'hot' ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600'}`}>
              {dateFilteredLeads.filter((l: any) => (l.qualityScore || l.score || 0) >= 80).length}
            </span>
          </button>
          <button
            onClick={() => setTierFilter(tierFilter === 'warm' ? 'all' : 'warm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              tierFilter === 'warm'
                ? 'bg-yellow-500 text-white border-yellow-500'
                : 'bg-white text-gray-700 border-gray-200 hover:border-yellow-300'
            }`}
          >
            <Thermometer className="w-4 h-4" />
            <span>Warm</span>
            <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${tierFilter === 'warm' ? 'bg-white/20 text-white' : 'bg-yellow-50 text-yellow-600'}`}>
              {dateFilteredLeads.filter((l: any) => { const s = l.qualityScore || l.score || 0; return s >= 60 && s < 80 }).length}
            </span>
          </button>
          <button
            onClick={() => setTierFilter(tierFilter === 'cold' ? 'all' : 'cold')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              tierFilter === 'cold'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
            }`}
          >
            <Snowflake className="w-4 h-4" />
            <span>Cold</span>
            <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${tierFilter === 'cold' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
              {dateFilteredLeads.filter((l: any) => (l.qualityScore || l.score || 0) < 60).length}
            </span>
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
            </>
          )}
          <button
            onClick={() => setViewMode('batches')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              viewMode === 'batches'
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Batches</span>
            <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${viewMode === 'batches' ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-600'}`}>
              {allBatches.length}
            </span>
          </button>
          {viewMode === 'batches' && (
            <button
              onClick={() => { setViewMode('table'); setTierFilter('all') }}
              className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
            >
              <List className="w-3 h-3" />
              All Leads
            </button>
          )}

          {/* Spacer + Export */}
          <div className="ml-auto">
            <button
              onClick={handleExport}
              className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* ── Unified Toolbar ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex items-center gap-3 flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setViewMode('table'); setSelectedLeads(new Set()); setStatusFilter('all'); setTierFilter('all') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => { setViewMode('batches'); setSelectedLeads(new Set()); setActiveTab('all'); setStatusFilter('all') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'batches' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Package className="w-3.5 h-3.5" />
              Batches
            </button>
          </div>

          {/* Source Tabs */}
          <div className="flex items-center gap-1">
            {(['all', 'imported', 'generated'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedLeads(new Set()) }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === tab ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab === 'all' ? 'All Sources' : tab === 'imported' ? '📋 Imported' : '⚡ Generated'}
                <span className="ml-1.5 text-[10px] opacity-70">
                  {tab === 'all'
                    ? allLeads.length
                    : tab === 'imported'
                    ? allLeads.filter((l: any) => l.sourceType === 'manual_import').length
                    : allLeads.filter((l: any) => l.sourceType === 'automated' || (!l.sourceType && l.source !== 'manual')).length}
                </span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200" />

          {/* Search */}
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={viewMode === 'table' ? 'Search company, email, contact…' : 'Search batches…'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              showAdvancedFilters ? 'bg-primary-100 text-primary-700' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>

          {/* Status filter - table view only */}
          {viewMode === 'table' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              {['all', 'new', 'contacted', 'responded', 'interested', 'converted'].map(s => (
                <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          )}
        </div>

        {/* ── Advanced Filters Panel (collapsible) ──────────────────────────── */}
        {showAdvancedFilters && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Industry</label>
              <select
                value={filters.industry}
                onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Industries</option>
                {INDUSTRIES.map((industry) => <option key={industry.value} value={industry.value}>{industry.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Lead Source</label>
              <select
                value={filters.source}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
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
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Min Score ({filters.minScore})</label>
              <input type="range" min="0" max="100" value={filters.minScore}
                onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
                className="w-full accent-primary-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Max Score ({filters.maxScore})</label>
              <input type="range" min="0" max="100" value={filters.maxScore}
                onChange={(e) => setFilters({ ...filters, maxScore: parseInt(e.target.value) })}
                className="w-full accent-primary-600" />
            </div>
            <div className="md:col-span-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.withoutContacts}
                  onChange={(e) => setFilters({ ...filters, withoutContacts: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm text-gray-700">Show only leads without email address</span>
              </label>
            </div>
            <div className="flex items-end justify-end">
              <button
                onClick={() => { setFilters({ industry: 'all', minScore: 0, maxScore: 100, verificationStatus: 'all', source: 'all', withoutContacts: false }); setSearchQuery(''); setStatusFilter('all') }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >Reset All</button>
            </div>
          </div>
        )}

        {/* ── Bulk Actions Banner ────────────────────────────────────────────── */}
        {selectedLeads.size > 0 && (
          <div className="bg-primary-600 text-white rounded-xl px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">{selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} selected</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedLeads(new Set())} className="text-sm text-primary-100 hover:text-white">Clear</button>
              <button
                onClick={handleCreateCampaignFromSelected}
                className="px-4 py-1.5 text-sm font-medium bg-white text-primary-700 rounded-lg hover:bg-primary-50 flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Create Campaign
              </button>
              <button
                onClick={handleDeleteSelectedLeads}
                className="px-4 py-1.5 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* ── Main Content ──────────────────────────────────────────────────── */}
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
            onGenerateClick={() => setShowAddLeadsModal(true)}
            getStatusColor={getStatusColor}
            getTierBadge={getTierBadge}
            onDeleteSelected={handleDeleteSelectedLeads}
          />
        ) : (
          <BatchesView
            batches={batches}
            batchesLoading={batchesLoading}
            generating={generating}
            generateForm={generateForm}
            generationProgress={generationProgress}
            selectedBatches={selectedBatches}
            onSelectBatch={handleSelectBatch}
            onSelectAllBatches={handleSelectAllBatches}
            onDeleteSelected={handleDeleteSelectedBatches}
            onBatchClick={(batchId) => router.push(`/batches/${batchId}`)}
            onStartCampaign={(batch) => { setSelectedBatchForCampaign(batch); setShowBatchCampaignModal(true) }}
            onViewAnalytics={(batch) => { setSelectedBatchForAnalytics(batch); setShowBatchAnalyticsModal(true) }}
          />
        )}

        {/* ── Add Leads Modal ───────────────────────────────────────────────── */}
        {showAddLeadsModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="flex items-center justify-between px-8 pt-8 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Add Leads</h2>
                  <p className="text-gray-500 mt-1 text-sm">How do you want to bring in new leads?</p>
                </div>
                <button onClick={() => setShowAddLeadsModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-8 pb-8 grid grid-cols-1 gap-3">
                <button
                  onClick={() => { setShowAddLeadsModal(false); setShowGenerateModal(true) }}
                  className="flex items-center gap-5 p-5 rounded-xl border-2 border-gray-100 hover:border-green-300 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900">Generate with AI</h3>
                      <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Recommended</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">Auto-discover leads from Apollo.io, Google Places, or People Data Labs.</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowAddLeadsModal(false); handleImport() }}
                  className="flex items-center gap-5 p-5 rounded-xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900">Import CSV</h3>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">Upload a spreadsheet with existing contacts. We'll deduplicate automatically.</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowAddLeadsModal(false); setShowCreateLeadModal(true) }}
                  className="flex items-center gap-5 p-5 rounded-xl border-2 border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                    <FileText className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900">Manual Entry</h3>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">Add a single lead manually by filling in their details.</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modals ────────────────────────────────────────────────────────── */}
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
          onClose={() => { setShowImportDialog(false); setImportFile(null); setImportForm({ batchName: '', industry: 'Other', enrichEmail: true }) }}
          onFormChange={setImportForm}
          onSubmit={handleImportSubmit}
        />

        <CreateCampaignModal
          show={showCreateCampaignModal}
          selectedLeadsCount={selectedLeads.size}
          selectedLead={selectedLeads.size > 0 ? allLeads.find((lead: Lead) => selectedLeads.has(lead.id)) : null}
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
          onCloseView={() => { setShowViewModal(false); setSelectedLead(null) }}
          onEditFromView={(lead) => { setShowViewModal(false); handleEditLead(lead) }}
          getStatusColor={getStatusColor}
          showEditModal={showEditModal}
          editForm={editForm}
          onCloseEdit={() => { setShowEditModal(false); setSelectedLead(null); setEditForm({}) }}
          onEditFormChange={setEditForm}
          onSaveEdit={handleSaveEdit}
          showCreateModal={showCreateLeadModal}
          createForm={createLeadForm}
          isCreating={isCreatingLead}
          onCloseCreate={() => { setShowCreateLeadModal(false); setCreateLeadForm({ companyName: '', contactName: '', email: '', phone: '', website: '', industry: '', city: '', country: 'United States', jobTitle: '', companySize: '' }) }}
          onCreateFormChange={(form) => setCreateLeadForm(form as any)}
          onCreateLead={handleCreateLead}
          industriesByCategory={industriesByCategory}
        />

        <BatchModals
          showAnalyticsModal={showBatchAnalyticsModal}
          selectedBatchForAnalytics={selectedBatchForAnalytics}
          onCloseAnalytics={() => { setShowBatchAnalyticsModal(false); setSelectedBatchForAnalytics(null) }}
          showCampaignModal={showBatchCampaignModal}
          selectedBatchForCampaign={selectedBatchForCampaign}
          onCloseCampaign={() => { setShowBatchCampaignModal(false); setSelectedBatchForCampaign(null) }}
          onCreateCampaign={async (data: any) => { await campaignsAPI.createCampaignFromBatch({ ...data, batchId: String(data.batchId) }) }}
        />

        <ConfirmDialog isOpen={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setLeadToDelete(null) }} onConfirm={confirmDelete} title="Delete Lead" message="Are you sure you want to delete this lead? This action cannot be undone." confirmText="Delete" isLoading={isDeleting} />
        <ConfirmDialog isOpen={showDeleteBatchesConfirm} onClose={() => setShowDeleteBatchesConfirm(false)} onConfirm={confirmDeleteBatches} title="Delete Batches" message={`Are you sure you want to delete ${selectedBatches.size} batch${selectedBatches.size > 1 ? 'es' : ''}? This will also delete all leads within ${selectedBatches.size > 1 ? 'these batches' : 'this batch'}. This action cannot be undone.`} confirmText="Delete" isLoading={isDeleting} />
        <ConfirmDialog isOpen={showDeleteLeadsConfirm} onClose={() => setShowDeleteLeadsConfirm(false)} onConfirm={confirmDeleteLeads} title="Delete Leads" message={`Are you sure you want to delete ${selectedLeads.size} lead${selectedLeads.size > 1 ? 's' : ''}? This action cannot be undone.`} confirmText="Delete" isLoading={isDeleting} />

        <ProgressDialog isOpen={showProgressDialog} title={progressTitle} message={progressMessage} indeterminate={true} />
        <ResultDialog isOpen={showResultDialog} onClose={() => setShowResultDialog(false)} title={resultData.title} message={resultData.message} variant={resultData.variant} stats={resultData.stats} />
      </div>
    </Layout>
  )
}

function LeadsWithProtection() {
  return (
    <ProtectedRoute>
      <Leads />
    </ProtectedRoute>
  )
}

export default LeadsWithProtection
