import { useState, useEffect } from 'react'
import { X, Zap, Database, Mail, Calendar, Clock } from 'lucide-react'
import { INDUSTRIES, getIndustriesByCategory } from '@leadnex/shared'
import toast from 'react-hot-toast'
import api from '@/services/api'

interface CreateFullyAutomatedFormProps {
  onClose: () => void
  onSuccess: () => void
}

interface AutomatedFormData {
  name: string
  // Lead Generation Settings
  industry: string
  country: string
  city: string
  leadSources: string[]
  maxResultsPerRun: number
  // Outreach Settings
  outreachDelayDays: number
  emailStrategy: 'template' | 'workflow'
  emailTemplateId: string
  workflowId: string
  // Automation Schedule
  recurringInterval: 'daily' | 'every_2_days' | 'every_3_days' | 'weekly' | ''
  startTime: string
  endDate: string
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

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Spain', 'Italy', 'Netherlands', 'Sweden', 'Norway',
  'Denmark', 'Switzerland', 'Belgium', 'Austria', 'Ireland',
  'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Singapore',
  'Hong Kong', 'Japan', 'South Korea', 'India', 'Brazil'
]

const LEAD_SOURCES = [
  { id: 'apollo', name: 'Apollo.io', description: 'B2B contact database' },
  { id: 'google_places', name: 'Google Places', description: 'Local business listings' },
  { id: 'hunter', name: 'Hunter.io', description: 'Email finder' },
  { id: 'peopledatalabs', name: 'People Data Labs', description: 'Person & company data' },
]

const RECURRING_INTERVALS = [
  { value: 'daily', label: 'Daily' },
  { value: 'every_2_days', label: 'Every 2 Days' },
  { value: 'every_3_days', label: 'Every 3 Days' },
  { value: 'weekly', label: 'Weekly' },
]

const DELAY_OPTIONS = [
  { value: 0, label: 'Immediately (no delay)' },
  { value: 1, label: '1 Day After' },
  { value: 2, label: '2 Days After' },
  { value: 3, label: '3 Days After' },
  { value: 5, label: '5 Days After' },
  { value: 7, label: '1 Week After' },
]

export default function CreateFullyAutomatedForm({ onClose, onSuccess }: CreateFullyAutomatedFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [loadingWorkflows, setLoadingWorkflows] = useState(false)
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  
  const [formData, setFormData] = useState<AutomatedFormData>({
    name: '',
    industry: '',
    country: '',
    city: '',
    leadSources: ['apollo', 'google_places'],
    maxResultsPerRun: 50,
    outreachDelayDays: 0,
    emailStrategy: 'workflow',
    emailTemplateId: '',
    workflowId: '',
    recurringInterval: 'daily',
    startTime: '09:00',
    endDate: '',
  })

  useEffect(() => {
    fetchTemplates()
    fetchWorkflows()
  }, [])

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
    if (currentStep === 2 && (!formData.industry || !formData.country)) {
      toast.error('Industry and country are required')
      return
    }
    if (currentStep === 2 && formData.leadSources.length === 0) {
      toast.error('Select at least one lead source')
      return
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
    if (currentStep === 4 && !formData.recurringInterval) {
      toast.error('Please select a recurring interval')
      return
    }
    if (currentStep === 4 && !formData.endDate) {
      toast.error('End date is required')
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
        campaignType: 'fully_automated',
        name: formData.name,
        // Lead Generation
        industry: formData.industry,
        targetCountries: [formData.country],
        targetCities: formData.city ? [formData.city] : [],
        leadSources: formData.leadSources,
        maxResultsPerRun: formData.maxResultsPerRun,
        // Outreach
        outreachDelayDays: formData.outreachDelayDays,
        useWorkflow: formData.emailStrategy === 'workflow',
        workflowId: formData.emailStrategy === 'workflow' ? formData.workflowId : null,
        emailTemplateId: formData.emailStrategy === 'template' ? formData.emailTemplateId : null,
        // Schedule
        isRecurring: true,
        recurringInterval: formData.recurringInterval,
        scheduleTime: formData.startTime,
        endDate: formData.endDate,
        status: 'draft',
      }

      await api.post('/campaigns', payload)
      toast.success('Fully Automated Campaign created successfully!')
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create campaign')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleLeadSource = (sourceId: string) => {
    setFormData(prev => ({
      ...prev,
      leadSources: prev.leadSources.includes(sourceId)
        ? prev.leadSources.filter(s => s !== sourceId)
        : [...prev.leadSources, sourceId]
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-blue-600">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Create Fully Automated Campaign
            </h2>
            <p className="text-sm text-purple-100 mt-1">
              Automated lead generation + outreach on schedule
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-purple-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {['Basic Info', 'Lead Generation', 'Outreach', 'Schedule'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center ${index > 0 ? 'ml-2' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep > index + 1 ? 'bg-green-500 text-white' :
                    currentStep === index + 1 ? 'bg-purple-600 text-white' :
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
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-purple-900">Fully Automated Campaign</h3>
                    <p className="text-xs text-purple-700 mt-1">
                      This campaign will automatically generate leads AND send emails on your schedule. 
                      Perfect for continuous lead generation and outreach.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Spa Full Auto - Daily Pipeline"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 2: Lead Generation */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-blue-600 mb-4">
                <Database className="w-5 h-5" />
                <h3 className="font-semibold">Lead Generation Settings</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry *
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select Industry</option>
                    {Object.entries(getIndustriesByCategory()).map(([category, industries]) => (
                      <optgroup key={category} label={category}>
                        {industries.map((industry) => (
                          <option key={industry.value} value={industry.value}>
                            {industry.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select Country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City (optional)
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g., New York"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Lead Sources * (select at least one)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {LEAD_SOURCES.map((source) => (
                    <div
                      key={source.id}
                      onClick={() => toggleLeadSource(source.id)}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.leadSources.includes(source.id)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          formData.leadSources.includes(source.id)
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-300'
                        }`}>
                          {formData.leadSources.includes(source.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="ml-3 flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{source.name}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{source.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Leads Per Run
                </label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={formData.maxResultsPerRun}
                  onChange={(e) => setFormData({ ...formData, maxResultsPerRun: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of leads to generate in each scheduled run (10-200)
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Outreach */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <Mail className="w-5 h-5" />
                <h3 className="font-semibold">Outreach Settings</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Outreach Delay
                </label>
                <select
                  value={formData.outreachDelayDays}
                  onChange={(e) => setFormData({ ...formData, outreachDelayDays: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {DELAY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How long to wait after generating leads before starting outreach
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Email Strategy
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData({ ...formData, emailStrategy: 'template', workflowId: '' })}
                    className={`p-4 border-2 rounded-lg transition-all text-left ${
                      formData.emailStrategy === 'template'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Mail className="w-5 h-5 text-purple-600 mb-2" />
                    <div className="text-sm font-medium">Single Email</div>
                    <div className="text-xs text-gray-500 mt-1">One email per lead</div>
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, emailStrategy: 'workflow', emailTemplateId: '' })}
                    className={`p-4 border-2 rounded-lg transition-all text-left ${
                      formData.emailStrategy === 'workflow'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Zap className="w-5 h-5 text-purple-600 mb-2" />
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              <div className="flex items-center gap-2 text-purple-600 mb-4">
                <Calendar className="w-5 h-5" />
                <h3 className="font-semibold">Automation Schedule</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Run Frequency *
                  </label>
                  <select
                    value={formData.recurringInterval}
                    onChange={(e) => setFormData({ ...formData, recurringInterval: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select Frequency</option>
                    {RECURRING_INTERVALS.map((interval) => (
                      <option key={interval.value} value={interval.value}>
                        {interval.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Campaign will stop running after this date
                </p>
              </div>

              {/* Timeline Preview */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-purple-900 mb-3">Expected Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                    <div>
                      <div className="font-medium text-gray-900">{formData.recurringInterval} at {formData.startTime}</div>
                      <div className="text-xs text-gray-600">Generate {formData.maxResultsPerRun} leads from {formData.leadSources.length} sources</div>
                    </div>
                  </div>
                  {formData.outreachDelayDays > 0 && (
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">⏳</div>
                      <div>
                        <div className="font-medium text-gray-900">Wait {formData.outreachDelayDays} day{formData.outreachDelayDays > 1 ? 's' : ''}</div>
                        <div className="text-xs text-gray-600">Leads are stored in batch</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                    <div>
                      <div className="font-medium text-gray-900">{formData.outreachDelayDays === 0 ? 'Same day' : `Day ${formData.outreachDelayDays + 1}`}</div>
                      <div className="text-xs text-gray-600">
                        Start {formData.emailStrategy === 'workflow' ? 'workflow sequence' : 'email outreach'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">♾️</div>
                    <div>
                      <div className="font-medium text-gray-900">Repeat until {formData.endDate || '(set end date)'}</div>
                      <div className="text-xs text-gray-600">Continuous automated pipeline</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Campaign Summary</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Name:</dt>
                    <dd className="font-medium text-gray-900">{formData.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Target:</dt>
                    <dd className="font-medium text-gray-900">
                      {formData.industry} in {formData.city ? `${formData.city}, ` : ''}{formData.country}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Leads/run:</dt>
                    <dd className="font-medium text-gray-900">{formData.maxResultsPerRun} from {formData.leadSources.length} sources</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Delay:</dt>
                    <dd className="font-medium text-gray-900">{formData.outreachDelayDays} day{formData.outreachDelayDays !== 1 ? 's' : ''}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Strategy:</dt>
                    <dd className="font-medium text-gray-900">
                      {formData.emailStrategy === 'template' ? 'Single Email' : 'Multi-Step Workflow'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Schedule:</dt>
                    <dd className="font-medium text-gray-900">
                      {formData.recurringInterval} at {formData.startTime} until {formData.endDate}
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
                className="px-6 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Automated Campaign'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
