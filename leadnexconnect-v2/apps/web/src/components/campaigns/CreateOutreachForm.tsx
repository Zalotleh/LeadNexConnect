import { useState, useEffect } from 'react'
import { X, Mail, Users, Calendar, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

interface CreateOutreachFormProps {
  onClose: () => void
  onSuccess: () => void
  preSelectedBatchId?: string // Optional: pre-select a batch (when creating from batch detail page)
}

interface OutreachFormData {
  name: string
  leadSelectionType: 'batches' | 'individual'
  batchIds: string[]
  leadIds: string[]
  emailStrategy: 'template' | 'workflow'
  emailTemplateId: string
  workflowId: string
  startType: 'manual' | 'scheduled'
  scheduledStartAt: string
}

interface Batch {
  id: string
  name: string
  totalLeads: number
  industry?: string
  createdAt: string
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  category?: string
}

interface Workflow {
  id: string
  name: string
  description?: string
  stepsCount?: number
}

export default function CreateOutreachForm({ onClose, onSuccess, preSelectedBatchId }: CreateOutreachFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [loadingWorkflows, setLoadingWorkflows] = useState(false)
  
  const [batches, setBatches] = useState<Batch[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  
  const [formData, setFormData] = useState<OutreachFormData>({
    name: '',
    leadSelectionType: preSelectedBatchId ? 'batches' : 'batches',
    batchIds: preSelectedBatchId ? [preSelectedBatchId] : [],
    leadIds: [],
    emailStrategy: 'workflow',
    emailTemplateId: '',
    workflowId: '',
    startType: 'manual',
    scheduledStartAt: '',
  })

  useEffect(() => {
    fetchBatches()
    fetchTemplates()
    fetchWorkflows()
  }, [])

  const fetchBatches = async () => {
    try {
      setLoadingBatches(true)
      const response = await api.get('/lead-batches')
      setBatches(response.data.data || [])
    } catch (error: any) {
      toast.error('Failed to load batches')
      console.error(error)
    } finally {
      setLoadingBatches(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true)
      const response = await api.get('/email-templates')
      setTemplates(response.data.data || [])
    } catch (error: any) {
      toast.error('Failed to load email templates')
      console.error(error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const fetchWorkflows = async () => {
    try {
      setLoadingWorkflows(true)
      const response = await api.get('/workflows')
      setWorkflows(response.data.data || [])
    } catch (error: any) {
      toast.error('Failed to load workflows')
      console.error(error)
    } finally {
      setLoadingWorkflows(false)
    }
  }

  const handleNext = () => {
    // Validation
    if (currentStep === 1 && !formData.name) {
      toast.error('Campaign name is required')
      return
    }
    if (currentStep === 2) {
      if (formData.leadSelectionType === 'batches' && formData.batchIds.length === 0) {
        toast.error('Select at least one batch')
        return
      }
      if (formData.leadSelectionType === 'individual' && formData.leadIds.length === 0) {
        toast.error('Select at least one lead')
        return
      }
    }
    if (currentStep === 3) {
      if (formData.emailStrategy === 'template' && !formData.emailTemplateId) {
        toast.error('Select an email template')
        return
      }
      if (formData.emailStrategy === 'workflow' && !formData.workflowId) {
        toast.error('Select a workflow')
        return
      }
    }
    if (currentStep === 4 && formData.startType === 'scheduled' && !formData.scheduledStartAt) {
      toast.error('Please set a start date and time')
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

      const payload = {
        campaignType: 'outreach',
        name: formData.name,
        batchIds: formData.leadSelectionType === 'batches' ? formData.batchIds : null,
        leadIds: formData.leadSelectionType === 'individual' ? formData.leadIds : null,
        useWorkflow: formData.emailStrategy === 'workflow',
        workflowId: formData.emailStrategy === 'workflow' ? formData.workflowId : null,
        emailTemplateId: formData.emailStrategy === 'template' ? formData.emailTemplateId : null,
        startType: formData.startType,
        scheduledStartAt: formData.startType === 'scheduled' ? formData.scheduledStartAt : null,
        status: 'draft', // Created as draft
      }

      await api.post('/campaigns', payload)
      toast.success('Outreach Campaign created successfully!')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create campaign')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleBatch = (batchId: string) => {
    setFormData(prev => ({
      ...prev,
      batchIds: prev.batchIds.includes(batchId)
        ? prev.batchIds.filter(id => id !== batchId)
        : [...prev.batchIds, batchId]
    }))
  }

  const getTotalLeadsSelected = () => {
    if (formData.leadSelectionType === 'batches') {
      return batches
        .filter(b => formData.batchIds.includes(b.id))
        .reduce((sum, b) => sum + (b.totalLeads || 0), 0)
    }
    return formData.leadIds.length
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-600" />
              Create Outreach Campaign
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Send emails to existing leads - No lead generation
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {['Basic Info', 'Select Leads', 'Email Strategy', 'Schedule'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center ${index > 0 ? 'ml-2' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep > index + 1 ? 'bg-green-500 text-white' :
                    currentStep === index + 1 ? 'bg-green-600 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > index + 1 ? '✓' : index + 1}
                  </div>
                  <span className={`ml-2 text-sm font-medium hidden sm:inline ${
                    currentStep === index + 1 ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step}
                  </span>
                </div>
                {index < 3 && (
                  <div className={`w-12 sm:w-16 h-0.5 mx-2 ${
                    currentStep > index + 1 ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Spa Outreach - Batch #123"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 2: Select Leads */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Lead Source
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFormData({ ...formData, leadSelectionType: 'batches', leadIds: [] })}
                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                      formData.leadSelectionType === 'batches'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Users className="w-5 h-5 mx-auto mb-2 text-green-600" />
                    <div className="text-sm font-medium">Select Batches</div>
                    <div className="text-xs text-gray-500 mt-1">Choose from existing lead batches</div>
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, leadSelectionType: 'individual', batchIds: [] })}
                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                      formData.leadSelectionType === 'individual'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Users className="w-5 h-5 mx-auto mb-2 text-green-600" />
                    <div className="text-sm font-medium">Individual Leads</div>
                    <div className="text-xs text-gray-500 mt-1">Select specific leads manually</div>
                  </button>
                </div>
              </div>

              {formData.leadSelectionType === 'batches' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Batches * (choose at least one)
                  </label>
                  {loadingBatches ? (
                    <div className="text-center py-8 text-gray-500">Loading batches...</div>
                  ) : batches.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No batches available. Generate leads first.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {batches.map((batch) => (
                        <div
                          key={batch.id}
                          onClick={() => toggleBatch(batch.id)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            formData.batchIds.includes(batch.id)
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start">
                              <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center ${
                                formData.batchIds.includes(batch.id)
                                  ? 'border-green-500 bg-green-500'
                                  : 'border-gray-300'
                              }`}>
                                {formData.batchIds.includes(batch.id) && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="ml-3">
                                <h4 className="text-sm font-medium text-gray-900">{batch.name}</h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {batch.totalLeads} leads • {batch.industry} • {new Date(batch.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {formData.leadSelectionType === 'individual' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900">
                    <strong>Individual Lead Selection:</strong> This feature allows you to manually select specific leads.
                    Coming in next update - for now, please use batch selection.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Email Strategy */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Email Strategy
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFormData({ ...formData, emailStrategy: 'template', workflowId: '' })}
                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                      formData.emailStrategy === 'template'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Mail className="w-5 h-5 mx-auto mb-2 text-green-600" />
                    <div className="text-sm font-medium">Single Email</div>
                    <div className="text-xs text-gray-500 mt-1">One email per lead</div>
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, emailStrategy: 'workflow', emailTemplateId: '' })}
                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                      formData.emailStrategy === 'workflow'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Zap className="w-5 h-5 mx-auto mb-2 text-green-600" />
                    <div className="text-sm font-medium">Multi-Step Workflow</div>
                    <div className="text-xs text-gray-500 mt-1">Automated follow-up sequence</div>
                  </button>
                </div>
              </div>

              {formData.emailStrategy === 'template' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Email Template *
                  </label>
                  {loadingTemplates ? (
                    <div className="text-center py-4 text-gray-500">Loading templates...</div>
                  ) : (
                    <select
                      value={formData.emailTemplateId}
                      onChange={(e) => setFormData({ ...formData, emailTemplateId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Choose a template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} {template.category && `(${template.category})`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {formData.emailStrategy === 'workflow' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Workflow *
                  </label>
                  {loadingWorkflows ? (
                    <div className="text-center py-4 text-gray-500">Loading workflows...</div>
                  ) : workflows.length === 0 ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-900">
                        No workflows available. Create a workflow first in the Workflows section.
                      </p>
                    </div>
                  ) : (
                    <select
                      value={formData.workflowId}
                      onChange={(e) => setFormData({ ...formData, workflowId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Choose a workflow</option>
                      {workflows.map((workflow) => (
                        <option key={workflow.id} value={workflow.id}>
                          {workflow.name} {workflow.stepsCount && `(${workflow.stepsCount} steps)`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Schedule */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  When to Start
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFormData({ ...formData, startType: 'manual', scheduledStartAt: '' })}
                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                      formData.startType === 'manual'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium">Start Manually</div>
                    <div className="text-xs text-gray-500 mt-1">I'll start it when ready</div>
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, startType: 'scheduled' })}
                    className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                      formData.startType === 'scheduled'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Calendar className="w-5 h-5 mx-auto mb-2 text-green-600" />
                    <div className="text-sm font-medium">Schedule Start</div>
                    <div className="text-xs text-gray-500 mt-1">Set a specific date & time</div>
                  </button>
                </div>
              </div>

              {formData.startType === 'scheduled' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledStartAt}
                    onChange={(e) => setFormData({ ...formData, scheduledStartAt: e.target.value })}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Campaign Summary</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Name:</dt>
                    <dd className="font-medium text-gray-900">{formData.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Total Leads:</dt>
                    <dd className="font-medium text-gray-900">{getTotalLeadsSelected()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Batches:</dt>
                    <dd className="font-medium text-gray-900">{formData.batchIds.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Strategy:</dt>
                    <dd className="font-medium text-gray-900">
                      {formData.emailStrategy === 'template' ? 'Single Email' : 'Multi-Step Workflow'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Start:</dt>
                    <dd className="font-medium text-gray-900">
                      {formData.startType === 'manual' ? 'Manual' : new Date(formData.scheduledStartAt).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                ← Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Campaign'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
