import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { Search, Workflow, X, Calendar, Briefcase, Globe } from 'lucide-react'

interface WorkflowStep {
  id: string
  workflowId: string
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
  industry: string | null
  country: string | null
  aiInstructions: string | null
  isActive: boolean
  usageCount: number
  steps?: WorkflowStep[]
}

interface WorkflowSelectorProps {
  selectedWorkflowId: string | null
  onSelect: (workflowId: string | null) => void
  label?: string
  placeholder?: string
  required?: boolean
}

export default function WorkflowSelector({
  selectedWorkflowId,
  onSelect,
  label = 'Email Workflow',
  placeholder = 'Search workflows...',
  required = false,
}: WorkflowSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Fetch workflows
  const { data: workflowsData } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => await api.get('/workflows'),
  })

  const workflows: Workflow[] = workflowsData?.data?.data || []
  const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId)

  // Filter workflows based on search
  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workflow.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workflow.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workflow.country?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.workflow-selector')) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="workflow-selector relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Selected Workflow Display or Search Input */}
      <div
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 cursor-pointer bg-white"
        onClick={() => setIsOpen(true)}
      >
        {selectedWorkflow ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Workflow className="w-4 h-4 text-primary-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{selectedWorkflow.name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {selectedWorkflow.stepsCount} steps
                  </span>
                  {selectedWorkflow.industry && (
                    <span className="flex items-center gap-1 truncate">
                      <Briefcase className="w-3 h-3" />
                      {selectedWorkflow.industry}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelect(null)
              }}
              className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <Search className="w-4 h-4" />
            <span>{placeholder}</span>
          </div>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search workflows..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Workflows List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredWorkflows.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Workflow className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium mb-1">No workflows found</p>
                <p className="text-sm">
                  {searchTerm ? 'Try a different search term' : 'Create a workflow first'}
                </p>
              </div>
            ) : (
              <div className="p-2">
                {filteredWorkflows.map((workflow) => (
                  <button
                    key={workflow.id}
                    type="button"
                    onClick={() => {
                      onSelect(workflow.id)
                      setIsOpen(false)
                      setSearchTerm('')
                    }}
                    className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedWorkflowId === workflow.id ? 'bg-primary-50 border border-primary-200' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Workflow className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        selectedWorkflowId === workflow.id ? 'text-primary-600' : 'text-gray-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 mb-1">{workflow.name}</p>
                        {workflow.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {workflow.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {workflow.stepsCount} step{workflow.stepsCount !== 1 ? 's' : ''}
                          </span>
                          {workflow.industry && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              {workflow.industry}
                            </span>
                          )}
                          {workflow.country && (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {workflow.country}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hint Text */}
      {!selectedWorkflow && (
        <p className="text-xs text-gray-500 mt-2">
          Select a pre-built email sequence workflow or create one in the Workflows page
        </p>
      )}
    </div>
  )
}
