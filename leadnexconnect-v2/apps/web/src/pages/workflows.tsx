import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import api from '@/services/api'
import { toast } from 'react-hot-toast'
import { 
  Plus, 
  Workflow, 
  Calendar, 
  Globe, 
  Briefcase, 
  Trash2, 
  Edit, 
  Play,
  Sparkles,
  Loader,
  X,
  Search,
} from 'lucide-react'

interface WorkflowStep {
  id: string
  workflowId: string
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
  steps?: WorkflowStep[]
}

export default function Workflows() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    stepsCount: 3,
    daysBetween: 3,
    industry: '',
    country: '',
    aiInstructions: '',
  })

  // Fetch workflows
  const { data: workflowsData, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => await api.get('/workflows'),
  })

  const workflows: Workflow[] = workflowsData?.data?.data || []

  // Filter workflows based on search query
  const filteredWorkflows = workflows.filter((workflow) => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    const matchesName = workflow.name?.toLowerCase().includes(query)
    const matchesDescription = workflow.description?.toLowerCase().includes(query)
    const matchesIndustry = workflow.industry?.toLowerCase().includes(query)
    
    return matchesName || matchesDescription || matchesIndustry
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await api.delete(`/workflows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast.success('Workflow deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete workflow')
    },
  })

  const handleGenerateWorkflow = async () => {
    if (!createForm.name.trim()) {
      toast.error('Please enter a workflow name')
      return
    }

    if (createForm.stepsCount < 1 || createForm.stepsCount > 10) {
      toast.error('Steps count must be between 1 and 10')
      return
    }

    try {
      setAiGenerating(true)
      toast.loading('Generating email sequence with AI...')

      // Call AI generation endpoint
      const response = await api.post('/workflows/generate', {
        name: createForm.name,
        description: createForm.description,
        stepsCount: createForm.stepsCount,
        daysBetween: createForm.daysBetween,
        industry: createForm.industry || undefined,
        country: createForm.country || undefined,
        aiInstructions: createForm.aiInstructions || undefined,
      })

      toast.dismiss()
      toast.success(`Workflow "${createForm.name}" created with ${createForm.stepsCount} steps!`)
      
      setShowCreateModal(false)
      setCreateForm({
        name: '',
        description: '',
        stepsCount: 3,
        daysBetween: 3,
        industry: '',
        country: '',
        aiInstructions: '',
      })
      
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.response?.data?.error?.message || 'Failed to generate workflow')
    } finally {
      setAiGenerating(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
            <p className="text-gray-600 mt-2">
              Create AI-powered email sequences for your campaigns
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = '/workflows/manual'}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit className="w-5 h-5" />
              Manual Workflow
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              AI Workflow
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {workflows.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search workflows by name, description, or industry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Workflows Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Workflow className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No workflows yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first email sequence workflow with AI
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Your First Workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.length === 0 ? (
              <div className="col-span-full bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600">No workflows match your search criteria</p>
              </div>
            ) : (
              filteredWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                onClick={() => window.location.href = `/workflows/${workflow.id}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 cursor-pointer"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {workflow.name}
                      </h3>
                      {workflow.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {workflow.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(workflow.id);
                        }}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{workflow.stepsCount} email steps</span>
                    </div>
                    {workflow.industry && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase className="w-4 h-4" />
                        <span>{workflow.industry}</span>
                      </div>
                    )}
                    {workflow.country && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Globe className="w-4 h-4" />
                        <span>{workflow.country}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Play className="w-4 h-4" />
                      <span>Used in {workflow.usageCount} campaigns</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="pt-4 border-t">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        workflow.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {workflow.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        )}

        {/* Create Workflow Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Create AI Workflow</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Generate a multi-step email sequence with AI
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workflow Name *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g., SaaS Product Introduction Sequence"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Describe the purpose of this workflow..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Sequence Configuration */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sequence Configuration</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Email Steps *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={createForm.stepsCount}
                        onChange={(e) => setCreateForm({ ...createForm, stepsCount: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">1-10 emails in sequence</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Days Between Each Step *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={createForm.daysBetween}
                        onChange={(e) => setCreateForm({ ...createForm, daysBetween: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Wait time between emails</p>
                    </div>
                  </div>
                </div>

                {/* Targeting */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Targeting (Optional)</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Industry
                      </label>
                      <input
                        type="text"
                        value={createForm.industry}
                        onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
                        placeholder="e.g., SaaS, E-commerce"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Country
                      </label>
                      <input
                        type="text"
                        value={createForm.country}
                        onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })}
                        placeholder="e.g., United States"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* AI Instructions */}
                <div className="border-t pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Extra Instructions for AI (Optional)
                  </label>
                  <textarea
                    value={createForm.aiInstructions}
                    onChange={(e) => setCreateForm({ ...createForm, aiInstructions: e.target.value })}
                    placeholder="e.g., Focus on pain points, include case studies, use friendly tone..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Provide specific instructions to customize the AI-generated emails
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">AI-Powered Generation</h4>
                      <p className="text-sm text-blue-800">
                        Our AI will create a complete email sequence with personalized subject lines and body content for each step, 
                        optimized for your target audience.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-6 border-t">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={aiGenerating}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateWorkflow}
                  disabled={!createForm.name || aiGenerating}
                  className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {aiGenerating ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Workflow
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
