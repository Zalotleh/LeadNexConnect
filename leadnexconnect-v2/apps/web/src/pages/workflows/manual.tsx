import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import api from '@/services/api'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Mail,
  Calendar,
  ArrowRight,
  MoveUp,
  MoveDown,
  AlertCircle,
} from 'lucide-react'

interface EmailTemplate {
  id: string
  name: string
  subject: string | null
  bodyText: string | null
  bodyHtml?: string | null
  category?: string
}

interface WorkflowStep {
  tempId: string // temporary ID for React keys
  stepNumber: number
  emailTemplateId: string
  daysAfterPrevious: number
}

export default function ManualWorkflowBuilder() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [industry, setIndustry] = useState('')
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      tempId: crypto.randomUUID(),
      stepNumber: 1,
      emailTemplateId: '',
      daysAfterPrevious: 0,
    }
  ])

  // Fetch email templates
  const { data: templatesData } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const response = await api.get('/templates')
      return response.data.data
    },
  })

  const templates: EmailTemplate[] = templatesData || []

  // Create workflow mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/workflows/manual', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow created successfully!')
      router.push('/workflows')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create workflow')
    },
  })

  const addStep = () => {
    const newStepNumber = steps.length + 1
    setSteps([
      ...steps,
      {
        tempId: crypto.randomUUID(),
        stepNumber: newStepNumber,
        emailTemplateId: '',
        daysAfterPrevious: 3, // Default 3 days
      }
    ])
  }

  const removeStep = (tempId: string) => {
    if (steps.length === 1) {
      toast.error('Workflow must have at least one step')
      return
    }

    const newSteps = steps.filter(s => s.tempId !== tempId)
    // Renumber steps
    newSteps.forEach((step, index) => {
      step.stepNumber = index + 1
    })
    setSteps(newSteps)
  }

  const updateStep = (tempId: string, field: keyof WorkflowStep, value: any) => {
    setSteps(steps.map(step =>
      step.tempId === tempId
        ? { ...step, [field]: value }
        : step
    ))
  }

  const moveStepUp = (tempId: string) => {
    const index = steps.findIndex(s => s.tempId === tempId)
    if (index === 0) return

    const newSteps = [...steps]
    ;[newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]]

    // Renumber
    newSteps.forEach((step, idx) => {
      step.stepNumber = idx + 1
    })

    setSteps(newSteps)
  }

  const moveStepDown = (tempId: string) => {
    const index = steps.findIndex(s => s.tempId === tempId)
    if (index === steps.length - 1) return

    const newSteps = [...steps]
    ;[newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]]

    // Renumber
    newSteps.forEach((step, idx) => {
      step.stepNumber = idx + 1
    })

    setSteps(newSteps)
  }

  const handleSave = () => {
    // Validation
    if (!workflowName.trim()) {
      toast.error('Please enter a workflow name')
      return
    }

    for (const step of steps) {
      if (!step.emailTemplateId) {
        toast.error(`Step ${step.stepNumber}: Please select an email template`)
        return
      }
    }

    const payload = {
      name: workflowName,
      description: workflowDescription,
      industry: industry || undefined,
      stepsCount: steps.length,
      steps: steps.map(step => ({
        stepNumber: step.stepNumber,
        emailTemplateId: step.emailTemplateId,
        daysAfterPrevious: step.daysAfterPrevious,
      })),
    }

    createMutation.mutate(payload)
  }

  const getTemplateName = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    return template ? template.name : 'Select template...'
  }

  const getTemplatePreview = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    return template
  }

  const calculateTotalDays = () => {
    return steps.reduce((total, step) => total + step.daysAfterPrevious, 0)
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/workflows')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manual Workflow Builder</h1>
              <p className="text-gray-600 mt-1">
                Create a custom email sequence by selecting existing templates
              </p>
            </div>
          </div>
        </div>

        {/* Workflow Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Workflow Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workflow Name *
              </label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="e.g., SaaS Outreach Sequence"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                placeholder="Brief description of this workflow..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Industry (Optional)
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., SaaS, E-commerce, Healthcare"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">{steps.length}</span> email steps
                {calculateTotalDays() > 0 && (
                  <span className="ml-3">
                    • Total duration: <span className="font-medium text-gray-900">{calculateTotalDays()}</span> days
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Email Steps */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Email Sequence</h2>
            <button
              onClick={addStep}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Step
            </button>
          </div>

          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.tempId}>
                {/* Step Connector */}
                {index > 0 && (
                  <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                    <div className="flex-1 border-t border-gray-300" />
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                      <ArrowRight className="w-4 h-4" />
                      <span className="font-medium">
                        {step.daysAfterPrevious} day{step.daysAfterPrevious !== 1 ? 's' : ''} later
                      </span>
                    </div>
                    <div className="flex-1 border-t border-gray-300" />
                  </div>
                )}

                {/* Step Card */}
                <div className="border-2 border-gray-200 rounded-lg p-5 hover:border-primary-300 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Step Number */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-lg">
                        {step.stepNumber}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 space-y-4">
                      {/* Days After Previous (skip for first step) */}
                      {step.stepNumber > 1 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Days after previous email
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={step.daysAfterPrevious}
                            onChange={(e) => updateStep(step.tempId, 'daysAfterPrevious', parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      )}

                      {/* Template Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Template *
                        </label>
                        <select
                          value={step.emailTemplateId}
                          onChange={(e) => updateStep(step.tempId, 'emailTemplateId', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select an email template...</option>
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name} {template.category && `(${template.category})`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Template Preview */}
                      {step.emailTemplateId && getTemplatePreview(step.emailTemplateId) && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start gap-2 mb-3">
                            <Mail className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-blue-900 mb-2">
                                <span className="font-semibold">Subject:</span> {getTemplatePreview(step.emailTemplateId)!.subject || 'No subject'}
                              </p>
                              <div className="text-sm text-blue-800 bg-white rounded p-3 border border-blue-100">
                                <p className="font-semibold mb-2 text-blue-900">Body:</p>
                                <div 
                                  className="whitespace-pre-wrap break-words"
                                  dangerouslySetInnerHTML={{ 
                                    __html: getTemplatePreview(step.emailTemplateId)!.bodyHtml || 
                                            (getTemplatePreview(step.emailTemplateId)!.bodyText || 'No content').replace(/\n/g, '<br>')
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* First Step Info */}
                      {step.stepNumber === 1 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-gray-600 mt-0.5" />
                          <p className="text-sm text-gray-700">
                            This email will be sent immediately when the campaign starts
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Step Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => moveStepUp(step.tempId)}
                        disabled={index === 0}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <MoveUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveStepDown(step.tempId)}
                        disabled={index === steps.length - 1}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <MoveDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeStep(step.tempId)}
                        disabled={steps.length === 1}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove step"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Step Button (bottom) */}
          <button
            onClick={addStep}
            className="w-full mt-6 px-4 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:text-primary-600 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Another Email Step
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow p-6">
          <button
            onClick={() => router.push('/workflows')}
            disabled={createMutation.isPending}
            className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!workflowName || createMutation.isPending}
            className="px-6 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {createMutation.isPending ? 'Creating...' : 'Create Workflow'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
