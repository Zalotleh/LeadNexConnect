import Layout from '@/components/Layout'
import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Filter,
  X,
  FileText,
  Mail,
  Users,
  Calendar,
  Briefcase,
  UserPlus,
  Package,
  MoreHorizontal
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import EnhancedEmailEditor from '@/components/EmailEditor/EnhancedEmailEditor'

interface Template {
  id: number
  name: string
  description: string
  category: string
  subject: string
  bodyHtml: string
  bodyText: string
  industry: string | null
  followUpStage: number | null
  variables: string[]
  isActive: boolean
  isDefault: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

const categoryIcons: Record<string, any> = {
  initial_outreach: Mail,
  follow_up: Calendar,
  meeting_request: Users,
  introduction: UserPlus,
  product_demo: Package,
  partnership: Briefcase,
  general: FileText,
  other: MoreHorizontal,
}

const categoryColors: Record<string, string> = {
  initial_outreach: 'bg-blue-100 text-blue-800',
  follow_up: 'bg-green-100 text-green-800',
  meeting_request: 'bg-purple-100 text-purple-800',
  introduction: 'bg-yellow-100 text-yellow-800',
  product_demo: 'bg-pink-100 text-pink-800',
  partnership: 'bg-indigo-100 text-indigo-800',
  general: 'bg-gray-100 text-gray-800',
  other: 'bg-orange-100 text-orange-800',
}

const categoryLabels: Record<string, string> = {
  initial_outreach: 'Initial Outreach',
  follow_up: 'Follow Up',
  meeting_request: 'Meeting Request',
  introduction: 'Introduction',
  product_demo: 'Product Demo',
  partnership: 'Partnership',
  general: 'General',
  other: 'Other',
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: 'general',
    subject: '',
    bodyHtml: '',
    bodyText: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [searchQuery, selectedCategory])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (selectedCategory) params.append('category', selectedCategory)
      
      const response = await api.get(`/templates?${params.toString()}`)
      if (response.data.success) {
        setTemplates(response.data.data)
      }
    } catch (error) {
      console.error('Failed to load templates', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template)
    setEditForm({
      name: template.name,
      description: template.description,
      category: template.category,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText,
    })
    setShowEditModal(true)
  }

  const handleCreateTemplate = () => {
    setSelectedTemplate(null)
    setEditForm({
      name: '',
      description: '',
      category: 'general',
      subject: '',
      bodyHtml: '',
      bodyText: '',
    })
    setShowEditModal(true)
  }

  const handleSaveTemplate = async () => {
    if (!editForm.name.trim()) {
      toast.error('Template name is required')
      return
    }
    if (!editForm.subject.trim()) {
      toast.error('Subject is required')
      return
    }

    try {
      setSaving(true)
      
      // Extract variables from content
      const variables = extractVariables(editForm.bodyHtml || editForm.bodyText)
      
      const templateData = {
        ...editForm,
        variables,
        isActive: true,
      }

      if (selectedTemplate) {
        // Update existing template
        const response = await api.put(`/templates/${selectedTemplate.id}`, templateData)
        if (response.data.success) {
          toast.success('Template updated successfully')
          loadTemplates()
          setShowEditModal(false)
        }
      } else {
        // Create new template
        const response = await api.post('/templates', templateData)
        if (response.data.success) {
          toast.success('Template created successfully')
          loadTemplates()
          setShowEditModal(false)
        }
      }
    } catch (error: any) {
      console.error('Failed to save template', error)
      toast.error(error.response?.data?.error || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return

    try {
      const response = await api.delete(`/templates/${selectedTemplate.id}`)
      if (response.data.success) {
        toast.success('Template deleted successfully')
        loadTemplates()
        setShowDeleteConfirm(false)
        setSelectedTemplate(null)
      }
    } catch (error) {
      console.error('Failed to delete template', error)
      toast.error('Failed to delete template')
    }
  }

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const variables = extractVariables(template.bodyHtml || template.bodyText)
      
      const newTemplate = {
        name: `${template.name} (Copy)`,
        description: template.description,
        category: template.category,
        subject: template.subject,
        bodyHtml: template.bodyHtml,
        bodyText: template.bodyText,
        variables,
        isActive: true,
      }

      const response = await api.post('/templates', newTemplate)
      if (response.data.success) {
        toast.success('Template duplicated successfully')
        loadTemplates()
      }
    } catch (error) {
      console.error('Failed to duplicate template', error)
      toast.error('Failed to duplicate template')
    }
  }

  const handlePreviewTemplate = (template: Template) => {
    setSelectedTemplate(template)
    setShowPreviewModal(true)
  }

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g
    const matches = content.match(regex) || []
    return [...new Set(matches)]
  }

  const filteredTemplates = templates

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create and manage reusable email templates for your outreach campaigns
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search templates by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors ${
                  selectedCategory ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>
                  {selectedCategory ? categoryLabels[selectedCategory] : 'All Categories'}
                </span>
                {selectedCategory && (
                  <X
                    className="w-4 h-4 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedCategory('')
                    }}
                  />
                )}
              </button>

              {/* Category Dropdown */}
              {showCategoryFilter && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    {Object.entries(categoryLabels).map(([key, label]) => {
                      const Icon = categoryIcons[key]
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setSelectedCategory(key)
                            setShowCategoryFilter(false)
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Icon className="w-4 h-4" />
                          <span>{label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleCreateTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Template</span>
            </button>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedCategory
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first email template'}
            </p>
            {!searchQuery && !selectedCategory && (
              <button
                onClick={handleCreateTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Template
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const Icon = categoryIcons[template.category] || FileText
              return (
                <div
                  key={template.id}
                  className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
                >
                  <div className="p-6">
                    {/* Category Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          categoryColors[template.category]
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {categoryLabels[template.category]}
                      </span>
                      <span className="text-xs text-gray-500">
                        Used {template.usageCount} {template.usageCount === 1 ? 'time' : 'times'}
                      </span>
                    </div>

                    {/* Template Info */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {template.description}
                    </p>
                    <p className="text-sm text-gray-700 font-medium mb-4 line-clamp-1">
                      Subject: {template.subject}
                    </p>

                    {/* Variables */}
                    {template.variables && template.variables.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">Variables:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.slice(0, 3).map((variable, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {variable}
                            </span>
                          ))}
                          {template.variables.length > 3 && (
                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                              +{template.variables.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handlePreviewTemplate(template)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicateTemplate(template)}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTemplate(template)
                          setShowDeleteConfirm(true)
                        }}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Edit/Create Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedTemplate ? 'Edit Template' : 'Create Template'}
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="e.g., Initial Outreach to SaaS Companies"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Describe when to use this template..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Line *
                  </label>
                  <input
                    type="text"
                    value={editForm.subject}
                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    placeholder="e.g., Quick question about {{companyName}}"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Email Editor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Content *
                  </label>
                  <EnhancedEmailEditor
                    label=""
                    value={editForm.bodyHtml || editForm.bodyText}
                    onChange={(content) => {
                      // Detect if content is HTML or plain text
                      if (content.includes('<')) {
                        setEditForm({ ...editForm, bodyHtml: content, bodyText: '' })
                      } else {
                        setEditForm({ ...editForm, bodyText: content, bodyHtml: '' })
                      }
                    }}
                    enableAI={true}
                    enableTemplates={false}
                  />
                </div>

                {/* Variable Helper */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Available Variables:</strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '{{contactName}}',
                      '{{firstName}}',
                      '{{lastName}}',
                      '{{companyName}}',
                      '{{title}}',
                      '{{industry}}',
                      '{{location}}',
                      '{{email}}',
                    ].map((variable) => (
                      <button
                        key={variable}
                        onClick={() => {
                          const textarea = document.querySelector('textarea')
                          if (textarea) {
                            const start = textarea.selectionStart
                            const end = textarea.selectionEnd
                            const text = editForm.bodyText
                            const newText = text.substring(0, start) + variable + text.substring(end)
                            setEditForm({ ...editForm, bodyText: newText })
                          }
                        }}
                        className="px-2 py-1 bg-white border border-blue-300 text-blue-700 text-xs rounded hover:bg-blue-100 transition-colors"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : selectedTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Delete Template</h2>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete "{selectedTemplate.name}"? This action cannot be
                  undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setSelectedTemplate(null)
                    }}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteTemplate}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Preview: {selectedTemplate.name}</h2>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Subject:</strong> {selectedTemplate.subject}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Category:</strong> {categoryLabels[selectedTemplate.category]}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: selectedTemplate.bodyHtml || selectedTemplate.bodyText.replace(/\n/g, '<br>')
                    }}
                  />
                </div>

                {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 mb-2">
                      <strong>Note:</strong> This template uses the following variables:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables.map((variable, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
