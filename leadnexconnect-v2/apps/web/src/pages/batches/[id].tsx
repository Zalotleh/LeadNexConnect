import { useState } from 'react'
import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import { leadsAPI, campaignsAPI } from '@/services/api'
import {
  ArrowLeft,
  Users,
  Mail,
  TrendingUp,
  Target,
  Package,
  Zap,
  Play,
  Pause,
  Trash2,
  Edit,
  Plus,
  Download,
  Filter,
  Search,
  X,
  Loader,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function BatchDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const queryClient = useQueryClient()

  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [showAddLeadModal, setShowAddLeadModal] = useState(false)
  const [showEditLeadModal, setShowEditLeadModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<any>(null)

  // Fetch batch details
  const { data: batchData, isLoading: batchLoading, refetch: refetchBatch } = useQuery({
    queryKey: ['batch', id],
    queryFn: async () => {
      const result = await leadsAPI.getBatches()
      const batches = result.data?.data || []
      return batches.find((b: any) => b.id === id)
    },
    enabled: !!id,
  })

  // Fetch batch analytics
  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['batchAnalytics', id],
    queryFn: async () => {
      const result = await leadsAPI.getBatchAnalytics(id as string)
      return result.data?.data
    },
    enabled: !!id,
  })

  // Fetch leads for this batch
  const { data: leadsData, isLoading: leadsLoading, refetch: refetchLeads } = useQuery({
    queryKey: ['batchLeads', id],
    queryFn: async () => {
      const result = await leadsAPI.getLeads({ batchId: id as string })
      return result.data?.data || []
    },
    enabled: !!id,
  })

  const batch = batchData
  const analytics = analyticsData
  const leads = leadsData || []

  // Filter leads
  const filteredLeads = leads.filter((lead: any) => {
    const matchesSearch =
      !searchTerm ||
      lead.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter

    const score = lead.qualityScore || 0
    const matchesTier =
      tierFilter === 'all' ||
      (tierFilter === 'hot' && score >= 80) ||
      (tierFilter === 'warm' && score >= 60 && score < 80) ||
      (tierFilter === 'cold' && score < 60)

    return matchesSearch && matchesStatus && matchesTier
  })

  const handleExport = () => {
    if (filteredLeads.length === 0) {
      toast.error('No leads to export')
      return
    }

    // Prepare CSV data
    const headers = ['Company Name', 'Email', 'Phone', 'Website', 'City', 'Country', 'Industry', 'Quality Score', 'Status']
    const rows = filteredLeads.map((lead: any) => [
      lead.companyName || '',
      lead.email || '',
      lead.phone || '',
      lead.website || '',
      lead.city || '',
      lead.country || '',
      lead.industry || '',
      lead.qualityScore || 0,
      lead.status || 'new'
    ])

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${batch.name.replace(/[^a-z0-9]/gi, '_')}_leads.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`Exported ${filteredLeads.length} leads`)
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return

    try {
      await leadsAPI.deleteLead(leadId)
      toast.success('Lead deleted successfully')
      refetchLeads()
      refetchBatch()
      refetchAnalytics()
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete lead')
    }
  }

  const handleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(filteredLeads.map((l: any) => l.id)))
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

  const getTierBadge = (score: number) => {
    if (score >= 80)
      return { label: 'HOT', className: 'bg-red-100 text-red-800', icon: TrendingUp }
    if (score >= 60)
      return { label: 'WARM', className: 'bg-yellow-100 text-yellow-800', icon: Target }
    return { label: 'COLD', className: 'bg-blue-100 text-blue-800', icon: Package }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: any = {
      new: { label: 'New', className: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      contacted: { label: 'Contacted', className: 'bg-yellow-100 text-yellow-800', icon: Mail },
      qualified: { label: 'Qualified', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      unqualified: { label: 'Unqualified', className: 'bg-gray-100 text-gray-800', icon: XCircle },
    }
    return statusMap[status] || statusMap.new
  }

  if (batchLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader className="w-12 h-12 animate-spin text-primary-600" />
        </div>
      </Layout>
    )
  }

  if (!batch) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-screen">
          <Package className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Batch Not Found</h2>
          <button
            onClick={() => router.push('/leads')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Leads
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/leads?view=batches')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leads
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{batch.name}</h1>
              <p className="text-gray-600">
                Created on {new Date(batch.createdAt).toLocaleDateString()} at{' '}
                {new Date(batch.createdAt).toLocaleTimeString()}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddLeadModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Lead
              </button>
              <button
                onClick={() => setShowCampaignModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Start Campaign
              </button>
              <button 
                onClick={handleExport}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Summary */}
        {analyticsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : analytics && analytics.metrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{analytics.metrics.totalLeads || 0}</p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-green-600 font-medium">
                  {analytics.metrics.successfulImports || 0} successful
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-yellow-600">{analytics.metrics.duplicatesSkipped || 0} duplicates</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Email Performance</p>
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{analytics.metrics.emailsSent || 0}</p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-gray-600">
                  {analytics.metrics.openRate?.toFixed(1) || 0}% opened
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">{analytics.metrics.clickRate?.toFixed(1) || 0}% clicked</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Lead Quality</p>
                <TrendingUp className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <p className="text-2xl font-bold text-red-600">{analytics.leadQuality?.hot || 0}</p>
                  <p className="text-xs text-gray-600">Hot</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{analytics.leadQuality?.warm || 0}</p>
                  <p className="text-xs text-gray-600">Warm</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{analytics.leadQuality?.cold || 0}</p>
                  <p className="text-xs text-gray-600">Cold</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{analytics.campaigns?.length || 0}</p>
              <div className="mt-2">
                {analytics.campaigns && analytics.campaigns.length > 0 ? (
                  <p className="text-sm text-gray-600">{analytics.campaigns[0].name}</p>
                ) : (
                  <p className="text-sm text-gray-500">No campaigns yet</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by company or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="unqualified">Unqualified</option>
                </select>

                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Tiers</option>
                  <option value="hot">Hot (80+)</option>
                  <option value="warm">Warm (60-79)</option>
                  <option value="cold">Cold (&lt;60)</option>
                </select>
              </div>

              {selectedLeads.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{selectedLeads.size} selected</span>
                  <button className="px-3 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors text-sm flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Results Summary */}
          <div className="px-4 py-3 bg-gray-50 border-b">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium text-gray-900">{filteredLeads.length}</span> of{' '}
              <span className="font-medium text-gray-900">{leads.length}</span> leads
            </p>
          </div>

          {/* Leads Table */}
          <div className="overflow-x-auto">
            {leadsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No leads found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedLeads.size === filteredLeads.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeads.map((lead: any) => {
                    const tier = getTierBadge(lead.qualityScore || 0)
                    const status = getStatusBadge(lead.status)
                    const TierIcon = tier.icon
                    const StatusIcon = status.icon

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/leads/${lead.id}`)}
                      >
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedLeads.has(lead.id)}
                            onChange={() => handleSelectLead(lead.id)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{lead.companyName}</p>
                              {lead.website && (
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {lead.website}
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-900">{lead.email || 'N/A'}</p>
                          {lead.phone && <p className="text-xs text-gray-500">{lead.phone}</p>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <TierIcon className="w-4 h-4" />
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${tier.className}`}>
                              {lead.qualityScore || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${status.className}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-gray-900">{lead.city || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{lead.country}</p>
                        </td>
                        <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setSelectedLead(lead)
                                setShowEditLeadModal(true)
                              }}
                              className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                              title="Edit lead"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteLead(lead.id)}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete lead"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modals */}
        {showCampaignModal && (
          <FullCampaignModal
            batch={batch}
            selectedLeads={Array.from(selectedLeads)}
            onClose={() => setShowCampaignModal(false)}
            onSuccess={() => {
              setShowCampaignModal(false)
              queryClient.invalidateQueries({ queryKey: ['batchAnalytics', id] })
              refetchLeads()
            }}
          />
        )}

        {showAddLeadModal && (
          <AddEditLeadModal
            batch={batch}
            onClose={() => setShowAddLeadModal(false)}
            onSuccess={() => {
              setShowAddLeadModal(false)
              refetchLeads()
              refetchBatch()
              refetchAnalytics()
            }}
          />
        )}

        {showEditLeadModal && selectedLead && (
          <AddEditLeadModal
            batch={batch}
            lead={selectedLead}
            onClose={() => {
              setShowEditLeadModal(false)
              setSelectedLead(null)
            }}
            onSuccess={() => {
              setShowEditLeadModal(false)
              setSelectedLead(null)
              refetchLeads()
              refetchBatch()
              refetchAnalytics()
            }}
          />
        )}
      </div>
    </Layout>
  )
}

// Full Campaign Modal Component (matching the one in leads.tsx)
function FullCampaignModal({
  batch,
  selectedLeads,
  onClose,
  onSuccess,
}: {
  batch: any
  selectedLeads: string[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [campaignForm, setCampaignForm] = useState({
    name: `${batch.name} - Campaign`,
    description: '',
    workflowId: '',
    emailSubject: '',
    emailBody: '',
    startTime: '',
  })
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!campaignForm.name.trim()) {
      toast.error('Please enter a campaign name')
      return
    }

    if (!campaignForm.workflowId && (!campaignForm.emailSubject || !campaignForm.emailBody)) {
      toast.error('Please select a workflow or provide email subject and body')
      return
    }

    try {
      setLoading(true)

      // Use the selectedLeads if any, otherwise use all batch leads
      const payload: any = {
        name: campaignForm.name,
        description: campaignForm.description,
        batchId: batch.id,
        workflowId: campaignForm.workflowId || undefined,
        startImmediately: false,
      }

      if (!campaignForm.workflowId) {
        payload.emailTemplate = {
          subject: campaignForm.emailSubject,
          body: campaignForm.emailBody,
        }
      }

      if (campaignForm.startTime) {
        payload.startTime = new Date(campaignForm.startTime).toISOString()
      }

      // If specific leads selected, add them
      if (selectedLeads.length > 0) {
        payload.leadIds = selectedLeads
      }

      await campaignsAPI.createCampaignFromBatch(payload)

      toast.success('Campaign created successfully!')
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create Campaign</h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedLeads.length > 0 
                ? `Campaign with ${selectedLeads.length} selected lead${selectedLeads.length !== 1 ? 's' : ''}`
                : `Campaign with all ${batch.leadCount} leads from batch`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name *</label>
            <input
              type="text"
              value={campaignForm.name}
              onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
              placeholder="e.g., Q4 Outreach Campaign"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
            <textarea
              value={campaignForm.description}
              onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
              placeholder="Describe the campaign purpose..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="border-t pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Workflow ID (Optional)</label>
            <input
              type="text"
              value={campaignForm.workflowId}
              onChange={(e) => setCampaignForm({ ...campaignForm, workflowId: e.target.value })}
              placeholder="Enter workflow ID or leave empty for custom email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-blue-600 mt-2">
              💡 Use a workflow for multi-step sequences, or create a single email below
            </p>
          </div>

          {!campaignForm.workflowId && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject *</label>
                <input
                  type="text"
                  value={campaignForm.emailSubject}
                  onChange={(e) => setCampaignForm({ ...campaignForm, emailSubject: e.target.value })}
                  placeholder="e.g., Transform Your Process with [Product]"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Body *</label>
                <textarea
                  value={campaignForm.emailBody}
                  onChange={(e) => setCampaignForm({ ...campaignForm, emailBody: e.target.value })}
                  placeholder="Hi {{contactName}},

I noticed {{companyName}} and wanted to reach out...

Use {{companyName}}, {{contactName}}, {{email}} for personalization"
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                />
              </div>
            </>
          )}

          <div className="border-t pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Time (Optional)</label>
            <input
              type="datetime-local"
              value={campaignForm.startTime}
              onChange={(e) => setCampaignForm({ ...campaignForm, startTime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to start immediately</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Next Steps:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Campaign will be created in draft status</li>
              <li>{selectedLeads.length > 0 ? `${selectedLeads.length} selected` : `All ${batch.leadCount}`} leads will be linked</li>
              <li>Go to Campaigns page to review and start sending</li>
            </ol>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={
              loading ||
              !campaignForm.name ||
              (!campaignForm.workflowId && (!campaignForm.emailSubject || !campaignForm.emailBody))
            }
            className="px-6 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Campaign
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Add/Edit Lead Modal Component
function AddEditLeadModal({
  batch,
  lead,
  onClose,
  onSuccess,
}: {
  batch: any
  lead?: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    companyName: lead?.companyName || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    website: lead?.website || '',
    contactName: lead?.contactName || '',
    jobTitle: lead?.jobTitle || '',
    city: lead?.city || '',
    country: lead?.country || 'United Kingdom',
    industry: lead?.industry || batch.importSettings?.industry || '',
    notes: lead?.notes || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!formData.companyName.trim()) {
      toast.error('Please enter a company name')
      return
    }

    try {
      setLoading(true)

      const payload = {
        ...formData,
        batchId: batch.id,
        source: 'manual',
        sourceType: 'manual',
        status: 'new',
        qualityScore: 50,
      }

      if (lead) {
        // Update existing lead
        await leadsAPI.updateLead(lead.id, payload)
        toast.success('Lead updated successfully!')
      } else {
        // Create new lead
        await leadsAPI.createLead(payload)
        toast.success('Lead added successfully!')
      }

      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || `Failed to ${lead ? 'update' : 'add'} lead`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">{lead ? 'Edit Lead' : 'Add New Lead'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="e.g., Acme Corporation"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="CEO / Marketing Manager"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="London"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="United Kingdom"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., Healthcare, Technology"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this lead..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.companyName.trim()}
            className="px-6 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                {lead ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              <>
                {lead ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {lead ? 'Update Lead' : 'Add Lead'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
