import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import EnhancedEmailEditor from '@/components/EmailEditor/EnhancedEmailEditor'
import api from '@/services/api'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  Trash2,
  Workflow,
  Mail,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface WorkflowStep {
  id: string
  stepNumber: number
  daysAfterPrevious: number
  subject: string
  body: string
  createdAt: string
}

interface Workflow {
  id: string
  name: string
  description: string | null
  stepsCount: number
  industry: string | null
  country: string | null
  aiInstructions: string | null
  isActive: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
  steps: WorkflowStep[]
}

export default function WorkflowDetail() {
  const router = useRouter()
  const { id } = router.query
  const queryClient = useQueryClient()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    steps: [] as Array<{
      id: string
      stepNumber: number
      daysAfterPrevious: number
      subject: string
      body: string
    }>
  })
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  // Fetch workflow details
  const { data: workflowData, isLoading } = useQuery({
    queryKey: ['workflow', id],
    queryFn: async () => {
      const response = await api.get(`/workflows/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })

  const workflow: Workflow | undefined = workflowData

  // Initialize edit form when workflow loads
  useEffect(() => {
    if (workflow && !isEditing) {
      setEditForm({
        name: workflow.name,
        description: workflow.description || '',
        steps: workflow.steps.map(step => ({
          id: step.id,
          stepNumber: step.stepNumber,
          daysAfterPrevious: step.daysAfterPrevious,
          subject: step.subject,
          body: step.body,
        }))
      })
      // Expand all steps by default
      setExpandedSteps(new Set(workflow.steps.map((_, index) => index)))
    }
  }, [workflow, isEditing])

  // Update workflow mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.put(`/workflows/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] })
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow updated successfully')
      setIsEditing(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update workflow')
    },
  })

  // Delete workflow mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await api.delete(`/workflows/${id}`)
    },
    onSuccess: () => {
      toast.success('Workflow deleted')
      router.push('/workflows')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete workflow')
    },
  })

  const handleSave = () => {
    if (!editForm.name.trim()) {
      toast.error('Workflow name is required')
      return
    }

    // Validate steps
    for (const step of editForm.steps) {
      if (!step.subject.trim() || !step.body.trim()) {
        toast.error(`Step ${step.stepNumber}: Subject and body are required`)
        return
      }
    }

    updateMutation.mutate({
      name: editForm.name,
      description: editForm.description,
      steps: editForm.steps,
    })
  }

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSteps(newExpanded)
  }

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...editForm.steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setEditForm({ ...editForm, steps: newSteps })
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading workflow...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!workflow) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Workflow className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Workflow Not Found</h2>
          <p className="text-gray-600 mb-6">The workflow you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/workflows')}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back to Workflows
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
              onClick={() => router.push('/workflows')}
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
                <h1 className="text-3xl font-bold text-gray-900">{workflow.name}</h1>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded-full">
                  <Workflow className="w-4 h-4 mr-1" />
                  {workflow.stepsCount} steps
                </span>
                {workflow.industry && (
                  <span className="text-sm text-gray-600">
                    {workflow.industry}
                  </span>
                )}
                {workflow.country && (
                  <span className="text-sm text-gray-600">
                    • {workflow.country}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    // Reset form to current workflow data
                    if (workflow) {
                      setEditForm({
                        name: workflow.name,
                        description: workflow.description || '',
                        steps: workflow.steps.map(step => ({
                          id: step.id,
                          stepNumber: step.stepNumber,
                          daysAfterPrevious: step.daysAfterPrevious,
                          subject: step.subject,
                          body: step.body,
                        }))
                      })
                    }
                  }}
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
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4 inline mr-2" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
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

        {/* Workflow Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Workflow Details</h2>
          
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
                  placeholder="Workflow description..."
                />
              ) : (
                <p className="text-gray-600">{workflow.description || 'No description'}</p>
              )}
            </div>

            {workflow.aiInstructions && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Sparkles className="w-4 h-4 inline mr-1" />
                  AI Generation Instructions
                </label>
                <p className="text-sm text-gray-600 bg-purple-50 border border-purple-200 rounded-lg p-3">
                  {workflow.aiInstructions}
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usage Count
                </label>
                <p className="text-2xl font-bold text-gray-900">{workflow.usageCount}</p>
                <p className="text-sm text-gray-600">campaigns</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Created
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(workflow.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
                  workflow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {workflow.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Email Steps */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Email Sequence</h2>
          
          <div className="space-y-4">
            {(isEditing ? editForm.steps : workflow.steps).map((step, index) => (
              <div
                key={step.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Step Header */}
                <div
                  className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleStep(index)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary-600 text-white rounded-full font-bold text-sm">
                      {step.stepNumber}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {isEditing ? editForm.steps[index].subject : step.subject}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {step.stepNumber === 1
                          ? 'Initial email'
                          : `${step.daysAfterPrevious} days after previous`}
                      </p>
                    </div>
                  </div>
                  {expandedSteps.has(index) ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Step Content */}
                {expandedSteps.has(index) && (
                  <div className="p-4 space-y-4">
                    {/* Days After Previous (skip for first step) */}
                    {step.stepNumber > 1 && isEditing && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Days After Previous Email
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.steps[index].daysAfterPrevious}
                          onChange={(e) => updateStep(index, 'daysAfterPrevious', parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    )}

                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Subject
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.steps[index].subject}
                          onChange={(e) => updateStep(index, 'subject', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Email subject..."
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{step.subject}</p>
                      )}
                    </div>

                    {/* Body */}
                    <div>
                      {isEditing ? (
                        <EnhancedEmailEditor
                          label="Email Body"
                          value={editForm.steps[index].body}
                          onChange={(value: string) => updateStep(index, 'body', value)}
                          placeholder="Email body..."
                          rows={8}
                          enableVisualEditor={true}
                          enableAI={true}
                          enableTemplates={true}
                          defaultSubject={editForm.steps[index].subject}
                          aiContext={{
                            companyName: 'Example Company',
                            contactName: 'John',
                            industry: 'technology',
                            city: 'San Francisco',
                            country: 'USA',
                            followUpStage: index === 0 ? 'initial' : `follow_up_${index}`
                          }}
                        />
                      ) : (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Body
                          </label>
                          <div className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-sm">
                            {step.body}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Variables Info - Only show when not editing */}
                    {!isEditing && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800 font-medium mb-1">
                          <Mail className="w-4 h-4 inline mr-1" />
                          Available Variables
                        </p>
                        <p className="text-xs text-blue-700">
                          {'{companyName}'}, {'{contactName}'}, {'{industry}'}, {'{city}'}, {'{country}'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
