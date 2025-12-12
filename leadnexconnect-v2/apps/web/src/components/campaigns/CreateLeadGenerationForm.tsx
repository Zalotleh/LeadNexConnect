import { useState } from 'react'
import { X, Database, MapPin, Globe, Calendar, RefreshCw } from 'lucide-react'
import { INDUSTRIES, getIndustriesByCategory } from '@leadnex/shared'
import toast from 'react-hot-toast'
import api from '@/services/api'

interface CreateLeadGenerationFormProps {
  onClose: () => void
  onSuccess: () => void
}

interface LeadGenFormData {
  name: string
  industry: string
  country: string
  city: string
  leadSources: string[]
  maxResultsPerRun: number
  isRecurring: boolean
  recurringInterval: 'daily' | 'every_2_days' | 'every_3_days' | 'weekly' | ''
  endDate: string
  startImmediately: boolean
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

export default function CreateLeadGenerationForm({ onClose, onSuccess }: CreateLeadGenerationFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<LeadGenFormData>({
    name: '',
    industry: '',
    country: '',
    city: '',
    leadSources: ['apollo', 'google_places'],
    maxResultsPerRun: 100,
    isRecurring: false,
    recurringInterval: '',
    endDate: '',
    startImmediately: false,
  })

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
    if (currentStep === 3 && formData.leadSources.length === 0) {
      toast.error('Select at least one lead source')
      return
    }
    if (currentStep === 4 && formData.isRecurring && !formData.recurringInterval) {
      toast.error('Please select a recurring interval')
      return
    }
    if (currentStep === 4 && formData.isRecurring && !formData.endDate) {
      toast.error('End date is required for recurring campaigns')
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
        campaignType: 'lead_generation',
        name: formData.name,
        industry: formData.industry,
        targetCountries: [formData.country],
        targetCities: formData.city ? [formData.city] : [],
        leadSources: formData.leadSources,
        maxResultsPerRun: formData.maxResultsPerRun,
        isRecurring: formData.isRecurring,
        recurringInterval: formData.isRecurring ? formData.recurringInterval : null,
        endDate: formData.isRecurring ? formData.endDate : null,
        status: formData.startImmediately ? 'active' : 'draft',
      }

      await api.post('/campaigns', payload)
      toast.success(formData.startImmediately 
        ? 'Campaign created and started successfully!' 
        : 'Campaign created as draft. You can start it later.')
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Create Lead Generation Campaign
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Generate leads and save them to batches - No emails sent
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
            {['Basic Info', 'Target Market', 'Lead Sources', 'Schedule'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center ${index > 0 ? 'ml-2' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep > index + 1 ? 'bg-green-500 text-white' :
                    currentStep === index + 1 ? 'bg-blue-600 text-white' :
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
                  placeholder="e.g., Spa Leads - New York"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Choose a descriptive name to easily identify this campaign
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Additional details about this campaign..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 2: Target Market */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Industry *
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Country *
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to target entire country
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Lead Sources */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Lead Sources * (choose at least one)
                </label>
                <div className="space-y-3">
                  {LEAD_SOURCES.map((source) => (
                    <div
                      key={source.id}
                      onClick={() => toggleLeadSource(source.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.leadSources.includes(source.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          formData.leadSources.includes(source.id)
                            ? 'border-blue-500 bg-blue-500'
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
                  max="500"
                  value={formData.maxResultsPerRun}
                  onChange={(e) => setFormData({ ...formData, maxResultsPerRun: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum number of leads to generate in each run (10-500)
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Schedule */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    <RefreshCw className="w-4 h-4 inline mr-1" />
                    Make this a recurring campaign
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Campaign will run automatically on a schedule until end date
                </p>
              </div>

              {formData.isRecurring && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency *
                    </label>
                    <select
                      value={formData.recurringInterval}
                      onChange={(e) => setFormData({ ...formData, recurringInterval: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <Calendar className="w-4 h-4 inline mr-1" />
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Campaign will stop running after this date
                    </p>
                  </div>
                </>
              )}

              {!formData.isRecurring && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>One-time campaign:</strong> This campaign will run once when you start it. 
                    Leads will be generated and saved to a batch.
                  </p>
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
                    <dt className="text-gray-600">Target:</dt>
                    <dd className="font-medium text-gray-900">
                      {formData.industry} in {formData.city ? `${formData.city}, ` : ''}{formData.country}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Sources:</dt>
                    <dd className="font-medium text-gray-900">{formData.leadSources.length} selected</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Max leads/run:</dt>
                    <dd className="font-medium text-gray-900">{formData.maxResultsPerRun}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Schedule:</dt>
                    <dd className="font-medium text-gray-900">
                      {formData.isRecurring ? `${formData.recurringInterval} until ${formData.endDate}` : 'One-time'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Start Option */}
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="startImmediately"
                    checked={formData.startImmediately}
                    onChange={(e) => setFormData(prev => ({ ...prev, startImmediately: e.target.checked }))}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="startImmediately" className="flex-1 cursor-pointer">
                    <div className="text-sm font-medium text-gray-900">
                      Start campaign immediately
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {formData.startImmediately 
                        ? 'Campaign will begin generating leads right after creation'
                        : 'Campaign will be saved as draft. You can start it manually later'}
                    </div>
                  </label>
                </div>
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
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting 
                  ? 'Creating...' 
                  : formData.startImmediately 
                    ? 'Create & Start Campaign' 
                    : 'Create Campaign (Draft)'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
