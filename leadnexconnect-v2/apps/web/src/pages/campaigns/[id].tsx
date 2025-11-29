import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import WorkflowSelector from '@/components/WorkflowSelector'
import api from '@/services/api'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Play,
  Pause,
  Trash2,
  Users,
  Send,
  Eye,
  MousePointer,
  Mail,
  Calendar,
  Workflow,
  Loader,
  Sparkles,
} from 'lucide-react'

interface Lead {
  id: string
  companyName: string
  contactName: string | null
  email: string
  phone: string | null
  industry: string | null
  city: string | null
  country: string | null
  qualityScore: number | null
}

interface WorkflowStep {
  id: string
  stepNumber: number
  daysAfterPrevious: number
  subject: string
  body: string
}

interface Workflow {
  id: string
  name: string
  description: string | null
  stepsCount: number
  steps?: WorkflowStep[]
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  bodyText: string
  bodyHtml: string | null
}

interface Campaign {
  id: string
  name: string
  description: string | null
  campaignType: string
  status: string
  industry: string | null
  targetCountries: string[] | null
  companySize: string | null
  leadsPerDay: number
  emailTemplateId: string | null
  workflowId: string | null
  followUpEnabled: boolean
  followUp1DelayDays: number
  followUp2DelayDays: number
  scheduleType: string
  scheduleTime: string | null
  startDate: string | null
  endDate: string | null
  leadsGenerated: number
  emailsSent: number
  emailsOpened: number
  emailsClicked: number
  responsesReceived: number
  createdAt: string
  updatedAt: string
  workflow?: Workflow
  emailTemplate?: EmailTemplate
}

export default function CampaignDetail() {
  const router = useRouter()
  const { id } = router.query
  const queryClient = useQueryClient()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    industry: '',
    targetCountries: [] as string[],
    companySize: '',
    workflowId: null as string | null,
    emailSubject: '',
    emailBody: '',
  })
  const [enrolledLeads, setEnrolledLeads] = useState<Lead[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [newCountry, setNewCountry] = useState('')

  // Fetch campaign details
  const { data: campaignData, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const response = await api.get(`/campaigns/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })

  const campaign: Campaign | undefined = campaignData

  // Load enrolled leads
  useEffect(() => {
    if (id && campaign) {
      loadEnrolledLeads()
    }
  }, [id, campaign])

  const loadEnrolledLeads = async () => {
    try {
      setLoadingLeads(true)
      const response = await api.get(`/campaigns/${id}/leads`)
      setEnrolledLeads(response.data.data || [])
    } catch (error) {
      console.error('Failed to load enrolled leads:', error)
    } finally {
      setLoadingLeads(false)
    }
  }

  // Initialize edit form when campaign loads
  useEffect(() => {
    if (campaign && !isEditing) {
      setEditForm({
        name: campaign.name,
        description: campaign.description || '',
        industry: campaign.industry || '',
        targetCountries: campaign.targetCountries || [],
        companySize: campaign.companySize || '',
        workflowId: campaign.workflowId,
        emailSubject: '',
        emailBody: '',
      })
    }
  }, [campaign, isEditing])

  // Update campaign mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.put(`/campaigns/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] })
      toast.success('Campaign updated successfully')
      setIsEditing(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update campaign')
    },
  })

  // Execute campaign mutation
  const executeMutation = useMutation({
    mutationFn: async () => {
      return await api.post(`/campaigns/${id}/execute`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] })
      toast.success('Campaign execution started')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to execute campaign')
    },
  })

  // Pause campaign mutation
  const pauseMutation = useMutation({
    mutationFn: async () => {
      return await api.post(`/campaigns/${id}/pause`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] })
      toast.success('Campaign paused')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to pause campaign')
    },
  })

  // Delete campaign mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await api.delete(`/campaigns/${id}`)
    },
    onSuccess: () => {
      toast.success('Campaign deleted')
      router.push('/campaigns')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete campaign')
    },
  })

  const handleSave = () => {
    if (!editForm.name.trim()) {
      toast.error('Campaign name is required')
      return
    }

    updateMutation.mutate({
      name: editForm.name,
      description: editForm.description,
      industry: editForm.industry,
      targetCountries: editForm.targetCountries,
      companySize: editForm.companySize,
      workflowId: editForm.workflowId,
    })
  }

  const calculateOpenRate = () => {
    if (!campaign || campaign.emailsSent === 0) return 0
    return ((campaign.emailsOpened / campaign.emailsSent) * 100).toFixed(1)
  }

  const calculateClickRate = () => {
    if (!campaign || campaign.emailsSent === 0) return 0
    return ((campaign.emailsClicked / campaign.emailsSent) * 100).toFixed(1)
  }

  const calculateResponseRate = () => {
    if (!campaign || campaign.emailsSent === 0) return 0
    return ((campaign.responsesReceived / campaign.emailsSent) * 100).toFixed(1)
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    )
  }

  if (!campaign) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Campaign not found</h2>
          <button
            onClick={() => router.push('/campaigns')}
            className="text-primary-600 hover:text-primary-700"
          >
            Back to Campaigns
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/campaigns')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="text-3xl font-bold text-gray-900 border-b-2 border-primary-500 focus:outline-none"
                />
              ) : (
                <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span
                  className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
                    campaign.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : campaign.status === 'paused'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {campaign.status}
                </span>
                <span className="text-sm text-gray-600">
                  {campaign.campaignType === 'manual' ? 'Manual Campaign' : 'Automated Campaign'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <X className="w-4 h-4 inline mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditForm({
                      name: campaign.name,
                      description: campaign.description || '',
                      industry: campaign.industry || '',
                      targetCountries: campaign.targetCountries || [],
                      companySize: campaign.companySize || '',
                      workflowId: campaign.workflowId,
                      emailSubject: '',
                      emailBody: '',
                    })
                    setIsEditing(true)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4 inline mr-2" />
                  Edit
                </button>
                {campaign.status === 'active' ? (
                  <button
                    onClick={() => pauseMutation.mutate()}
                    disabled={pauseMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                  >
                    <Pause className="w-4 h-4 inline mr-2" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={() => executeMutation.mutate()}
                    disabled={executeMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 inline mr-2" />
                    {campaign.status === 'draft' ? 'Start' : 'Resume'}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this campaign?')) {
                      deleteMutation.mutate()
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">Leads</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{campaign.leadsGenerated}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Send className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600">Emails Sent</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{campaign.emailsSent}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">Opens</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{campaign.emailsOpened}</p>
            <p className="text-sm text-green-600 font-medium mt-1">{calculateOpenRate()}% rate</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MousePointer className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-sm text-gray-600">Clicks</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{campaign.emailsClicked}</p>
            <p className="text-sm text-orange-600 font-medium mt-1">{calculateClickRate()}% rate</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Mail className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-sm text-gray-600">Responses</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{campaign.responsesReceived}</p>
            <p className="text-sm text-indigo-600 font-medium mt-1">{calculateResponseRate()}% rate</p>
          </div>
        </div>

        {/* Campaign Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Campaign Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Campaign Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                {isEditing ? (
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Campaign description..."
                  />
                ) : (
                  <p className="text-gray-600">{campaign.description || 'No description'}</p>
                )}
              </div>

              {/* Industry Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                {isEditing ? (
                  <select
                    value={editForm.industry}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Industry</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Retail">Retail</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Education">Education</option>
                    <option value="Hospitality">Hospitality</option>
                    <option value="Construction">Construction</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{campaign.industry || 'Not specified'}</p>
                )}
              </div>

              {/* Target Countries */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Countries
                </label>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCountry}
                        onChange={(e) => setNewCountry(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newCountry.trim()) {
                            e.preventDefault()
                            setEditForm({
                              ...editForm,
                              targetCountries: [...editForm.targetCountries, newCountry.trim()]
                            })
                            setNewCountry('')
                          }
                        }}
                        placeholder="Add country and press Enter"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newCountry.trim()) {
                            setEditForm({
                              ...editForm,
                              targetCountries: [...editForm.targetCountries, newCountry.trim()]
                            })
                            setNewCountry('')
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editForm.targetCountries.map((country, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {country}
                          <button
                            type="button"
                            onClick={() => {
                              setEditForm({
                                ...editForm,
                                targetCountries: editForm.targetCountries.filter((_, i) => i !== index)
                              })
                            }}
                            className="hover:text-blue-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {campaign.targetCountries && campaign.targetCountries.length > 0 ? (
                      campaign.targetCountries.map((country, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {country}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-600">No target countries specified</p>
                    )}
                  </div>
                )}
              </div>

              {/* Company Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size
                </label>
                {isEditing ? (
                  <select
                    value={editForm.companySize}
                    onChange={(e) => setEditForm({ ...editForm, companySize: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Company Size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="501-1000">501-1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{campaign.companySize || 'Not specified'}</p>
                )}
              </div>

              {isEditing ? (
                <div>
                  <WorkflowSelector
                    selectedWorkflowId={editForm.workflowId}
                    onSelect={(workflowId) => setEditForm({ ...editForm, workflowId })}
                    label="Email Workflow"
                    placeholder="Select a workflow"
                    required={false}
                  />
                </div>
              ) : (
                <>
                  {campaign.workflow && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Workflow
                      </label>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Workflow className="w-5 h-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{campaign.workflow.name}</p>
                          <p className="text-sm text-gray-600">
                            {campaign.workflow.stepsCount} email steps
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!campaign.workflow && campaign.emailTemplate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Template
                      </label>
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Subject</p>
                          <p className="text-sm font-medium text-gray-900">{campaign.emailTemplate.subject}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Body</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{campaign.emailTemplate.bodyText}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {campaign.scheduleType && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Schedule
                        </label>
                        <p className="text-gray-900 capitalize">{campaign.scheduleType}</p>
                      </div>
                    )}
                    {campaign.leadsPerDay && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Leads Per Day
                        </label>
                        <p className="text-gray-900">{campaign.leadsPerDay}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Created
                      </label>
                      <p className="text-gray-900">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Workflow Steps */}
          {campaign.workflow && campaign.workflow.steps && campaign.workflow.steps.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Email Sequence</h2>
              
              <div className="space-y-4">
                {campaign.workflow.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-sm">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium text-gray-900">Step {step.stepNumber}</p>
                          {step.daysAfterPrevious > 0 && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              +{step.daysAfterPrevious} days
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-2">{step.subject}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{step.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Enrolled Leads */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              Enrolled Leads ({enrolledLeads.length})
            </h2>
          </div>
          
          {loadingLeads ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : enrolledLeads.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No leads enrolled in this campaign yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enrolledLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900">{lead.companyName}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{lead.contactName || '-'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600">{lead.email}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600">{lead.industry || '-'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600">
                          {lead.city && lead.country ? `${lead.city}, ${lead.country}` : lead.country || lead.city || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (lead.qualityScore || 0) >= 80
                              ? 'bg-green-100 text-green-800'
                              : (lead.qualityScore || 0) >= 60
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {lead.qualityScore || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
