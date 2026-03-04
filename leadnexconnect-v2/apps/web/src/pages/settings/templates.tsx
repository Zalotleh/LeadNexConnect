import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Eye,
  X,
  FileText,
  Mail,
  Users,
  Calendar,
  Briefcase,
  UserPlus,
  Package,
  MoreHorizontal,
  Sparkles,
  PenLine,
  ChevronRight,
  Loader,
  Zap,
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

interface CustomVariable {
  id: string
  key: string
  label: string
  value: string
  category: string
  description: string | null
  isActive: boolean
}

const BUILTIN_VARIABLES = [
  // Lead — resolved from the lead record
  { value: '{{contactName}}',   label: 'Contact Name',     category: 'lead' },
  { value: '{{firstName}}',     label: 'First Name',       category: 'lead' },
  { value: '{{lastName}}',      label: 'Last Name',        category: 'lead' },
  { value: '{{email}}',         label: 'Email',            category: 'lead' },
  { value: '{{companyName}}',   label: 'Company Name',     category: 'lead' },
  { value: '{{industry}}',      label: 'Industry',         category: 'lead' },
  { value: '{{city}}',          label: 'City',             category: 'lead' },
  { value: '{{country}}',       label: 'Country',          category: 'lead' },
  { value: '{{website}}',       label: 'Website',          category: 'lead' },
  { value: '{{jobTitle}}',      label: 'Job Title',        category: 'lead' },
  { value: '{{companySize}}',   label: 'Company Size',     category: 'lead' },
  // Sender — resolved from Sender Settings page
  { value: '{{sender_name}}',   label: 'Sender Name',      category: 'sender' },
  { value: '{{sender_email}}',  label: 'Sender Email',     category: 'sender' },
  { value: '{{signature}}',     label: 'Email Signature',  category: 'sender' },
  // Company — resolved from Company Profile page
  { value: '{{ourCompanyName}}', label: 'Our Company Name',  category: 'company' },
  { value: '{{product_name}}',   label: 'Product Name',      category: 'company' },
  { value: '{{support_email}}',  label: 'Support Email',     category: 'company' },
  { value: '{{ourWebsite}}',     label: 'Website URL',       category: 'company' },
  // Links — resolved from Company Profile page (rendered as clickable <a> tags)
  { value: '{{signUpLink}}',      label: 'Sign Up Link',       category: 'link' },
  { value: '{{featuresLink}}',    label: 'Features Link',      category: 'link' },
  { value: '{{pricingLink}}',     label: 'Pricing Link',       category: 'link' },
  { value: '{{demoLink}}',        label: 'Demo Link',          category: 'link' },
  { value: '{{integrationsLink}}', label: 'Integrations Link', category: 'link' },
  { value: '{{websiteLink}}',     label: 'Website Link',       category: 'link' },
]

const VAR_CATEGORY_COLORS: Record<string, string> = {
  lead:    'bg-blue-50 border-blue-200 text-blue-700',
  sender:  'bg-indigo-50 border-indigo-200 text-indigo-700',
  company: 'bg-green-50 border-green-200 text-green-700',
  link:    'bg-purple-50 border-purple-200 text-purple-700',
  custom:  'bg-orange-50 border-orange-200 text-orange-700',
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [customVars, setCustomVars] = useState<CustomVariable[]>([])

  // Modal states
  const [showTypePickerModal, setShowTypePickerModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: 'general',
    subject: '',
    bodyHtml: '',
  })
  const [saving, setSaving] = useState(false)

  // AI generation state
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiForm, setAiForm] = useState({
    industry: '',
    companyName: 'Example Company',
    contactName: 'John',
    category: 'initial_outreach',
    additionalInstructions: '',
  })
  const [generatedContent, setGeneratedContent] = useState<{ subject: string; bodyHtml: string } | null>(null)

  useEffect(() => {
    loadCustomVars()
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [searchQuery, selectedCategory])

  const loadCustomVars = async () => {
    try {
      const response = await api.get('/custom-variables?isActive=true')
      if (response.data.success) setCustomVars(response.data.data)
    } catch {
      // non-critical, silently fail
    }
  }

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory)
      const response = await api.get(`/templates?${params.toString()}`)
      if (response.data.success) {
        // Normalize variables: if null/empty but bodyHtml has {{vars}}, extract them
        const normalized = response.data.data.map((t: Template) => ({
          ...t,
          variables: (
            Array.isArray(t.variables) && t.variables.length > 0
              ? t.variables
              : extractVariablesFromContent(t.bodyHtml || t.bodyText || '')
          ),
        }))
        setTemplates(normalized)
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
      bodyHtml: template.bodyHtml || template.bodyText || '',
    })
    setShowEditModal(true)
  }

  const openManualCreate = () => {
    setShowTypePickerModal(false)
    setSelectedTemplate(null)
    setEditForm({ name: '', description: '', category: 'general', subject: '', bodyHtml: '' })
    setShowEditModal(true)
  }

  const openAICreate = () => {
    setShowTypePickerModal(false)
    setAiForm({ industry: '', companyName: 'Example Company', contactName: 'John', category: 'initial_outreach', additionalInstructions: '' })
    setGeneratedContent(null)
    setShowAIModal(true)
  }

  // Ensure bodyHtml is always set (wrap plain text in <p> tags if needed)
  const buildBodyHtml = (html: string) => {
    if (!html || !html.trim()) return ''
    if (html.includes('<')) return html
    return html.split(/\n{2,}/).filter(p => p.trim()).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
  }

  const handleSaveTemplate = async () => {
    if (!editForm.name.trim()) { toast.error('Template name is required'); return }
    if (!editForm.subject.trim()) { toast.error('Subject is required'); return }
    if (!editForm.bodyHtml.trim()) { toast.error('Email content is required'); return }
    try {
      setSaving(true)
      const bodyHtml = buildBodyHtml(editForm.bodyHtml)
      const bodyText = bodyHtml.replace(/<[^>]*>/g, '')
      const variables = extractVariables(bodyHtml)
      const templateData = { name: editForm.name, description: editForm.description, category: editForm.category, subject: editForm.subject, bodyHtml, bodyText, variables, isActive: true }
      if (selectedTemplate) {
        const response = await api.put(`/templates/${selectedTemplate.id}`, templateData)
        if (response.data.success) { toast.success('Template updated'); loadTemplates(); setShowEditModal(false) }
      } else {
        const response = await api.post('/templates', templateData)
        if (response.data.success) { toast.success('Template created'); loadTemplates(); setShowEditModal(false) }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateWithAI = async () => {
    if (!aiForm.industry.trim()) { toast.error('Industry is required'); return }
    try {
      setAiGenerating(true)
      const response = await api.post('/ai/generate-email', {
        industry: aiForm.industry,
        companyName: aiForm.companyName || 'Example Company',
        contactName: aiForm.contactName || 'there',
        followUpStage: aiForm.category === 'follow_up' ? 1 : 0,
        additionalInstructions: aiForm.additionalInstructions,
      })
      if (response.data.success && response.data.data) {
        setGeneratedContent({ subject: response.data.data.subject || `Reaching out — ${aiForm.industry}`, bodyHtml: response.data.data.bodyHtml || response.data.data.body || '' })
        toast.success('Template generated!')
      } else {
        toast.error('AI generation failed')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate template')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleSaveAITemplate = () => {
    if (!generatedContent) return
    setSelectedTemplate(null)
    setEditForm({
      name: aiForm.industry ? `${categoryLabels[aiForm.category]} — ${aiForm.industry}` : categoryLabels[aiForm.category],
      description: aiForm.additionalInstructions || 'AI-generated template',
      category: aiForm.category,
      subject: generatedContent.subject,
      bodyHtml: generatedContent.bodyHtml,
    })
    setShowAIModal(false)
    setShowEditModal(true)
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return
    try {
      const response = await api.delete(`/templates/${selectedTemplate.id}`)
      if (response.data.success) {
        toast.success('Template deleted')
        loadTemplates()
        setShowDeleteConfirm(false)
        setSelectedTemplate(null)
      }
    } catch (error) {
      toast.error('Failed to delete template')
    }
  }

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const bodyHtml = buildBodyHtml(template.bodyHtml || template.bodyText)
      const variables = extractVariables(bodyHtml)
      const response = await api.post('/templates', {
        name: `${template.name} (Copy)`,
        description: template.description,
        category: template.category,
        subject: template.subject,
        bodyHtml,
        bodyText: bodyHtml.replace(/<[^>]*>/g, ''),
        variables,
        isActive: true,
      })
      if (response.data.success) { toast.success('Template duplicated'); loadTemplates() }
    } catch (error) {
      toast.error('Failed to duplicate template')
    }
  }

  const extractVariables = (content: string): string[] => extractVariablesFromContent(content)

function extractVariablesFromContent(content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g
    const matches = content.match(regex) || []
    return [...new Set(matches)]
  }

  const filteredTemplates = templates.filter(t => {
    if (selectedCategory && selectedCategory !== 'all' && t.category !== selectedCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q) || (t.subject || '').toLowerCase().includes(q)
    }
    return true
  })


  return (
    <ProtectedRoute>
    <Layout>
      <div className="space-y-5 max-w-full overflow-x-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
            <p className="text-gray-500 mt-1 text-sm">Create and manage reusable email templates for your campaigns</p>
          </div>
          <button
            onClick={() => setShowTypePickerModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>

        {/* ── Category Filter Strip ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              selectedCategory === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
            }`}
          >
            <FileText className="w-4 h-4" />
            All
            <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {templates.length}
            </span>
          </button>
          {Object.entries(categoryLabels).map(([key, label]) => {
            const Icon = categoryIcons[key]
            const count = templates.filter(t => t.category === key).length
            if (count === 0) return null
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(selectedCategory === key ? 'all' : key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  selectedCategory === key ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                <span className={`ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ${selectedCategory === key ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-600'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Toolbar ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates by name, subject…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
            />
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">{filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}</span>
        </div>

        {/* ── Templates Grid ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center h-48">
            <Loader className="w-7 h-7 animate-spin text-primary-600" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center h-64 text-center px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No templates found</h3>
            <p className="text-sm text-gray-500 mb-5">
              {searchQuery || selectedCategory !== 'all' ? 'Try adjusting your search or filter' : 'Create your first template to get started'}
            </p>
            {!searchQuery && selectedCategory === 'all' && (
              <button onClick={() => setShowTypePickerModal(true)} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2">
                <Plus className="w-4 h-4" /> New Template
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((template) => {
              const Icon = categoryIcons[template.category] || FileText
              return (
                <div key={template.id} className="bg-white rounded-xl border-2 border-gray-200 hover:border-primary-300 hover:shadow-md transition-all flex flex-col">
                  <div className="p-5 flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColors[template.category]}`}>
                        <Icon className="w-3 h-3" />
                        {categoryLabels[template.category]}
                      </span>
                      <span className="text-[10px] text-gray-400">Used {template.usageCount}×</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{template.name}</h3>
                      {template.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{template.description}</p>}
                    </div>
                    <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 line-clamp-1">
                      <span className="font-medium text-gray-400 mr-1">Subject:</span>{template.subject}
                    </div>
                    {template.variables && template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.variables.slice(0, 4).map((v, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded font-mono">{v}</span>
                        ))}
                        {template.variables.length > 4 && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">+{template.variables.length - 4}</span>}
                      </div>
                    )}
                  </div>
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl flex items-center gap-1.5">
                    <button onClick={() => { setSelectedTemplate(template); setShowPreviewModal(true) }} className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                    <button onClick={() => handleEditTemplate(template)} className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary-600 bg-white border border-primary-100 rounded-lg hover:bg-primary-50">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDuplicateTemplate(template)} className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-600 bg-white border border-green-100 rounded-lg hover:bg-green-50">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { setSelectedTemplate(template); setShowDeleteConfirm(true) }} className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-100 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Type Picker Modal ──────────────────────────────────────────────── */}
        {showTypePickerModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-8 pt-8 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">New Template</h2>
                  <p className="text-gray-500 mt-1 text-sm">How do you want to create your template?</p>
                </div>
                <button onClick={() => setShowTypePickerModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-8 pb-8 grid gap-3">
                <button onClick={openManualCreate} className="flex items-center gap-5 p-5 rounded-xl border-2 border-gray-100 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100">
                    <PenLine className="w-6 h-6 text-gray-600 group-hover:text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900">Write Manually</h3>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500" />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">Start from scratch and write your own email content.</p>
                  </div>
                </button>
                <button onClick={openAICreate} className="flex items-center gap-5 p-5 rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition-all text-left group relative">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900">Generate with AI</h3>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500" />
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">Let AI write a tailored template based on your industry and goals.</p>
                  </div>
                  <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Recommended</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── AI Generation Modal ────────────────────────────────────────────── */}
        {showAIModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Generate with AI</h2>
                </div>
                <button onClick={() => setShowAIModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-7 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Industry *</label>
                    <input type="text" value={aiForm.industry} onChange={(e) => setAiForm({ ...aiForm, industry: e.target.value })} placeholder="e.g., SaaS, Restaurant, Law" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                    <select value={aiForm.category} onChange={(e) => setAiForm({ ...aiForm, category: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                      {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Additional instructions (optional)</label>
                  <textarea value={aiForm.additionalInstructions} onChange={(e) => setAiForm({ ...aiForm, additionalInstructions: e.target.value })} placeholder="e.g., Keep it short and casual, mention a specific pain point…" rows={3} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none" />
                </div>
                {generatedContent && (
                  <div className="border border-purple-200 rounded-xl overflow-hidden">
                    <div className="bg-purple-50 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-purple-700">Generated Preview</span>
                      <button onClick={handleGenerateWithAI} disabled={aiGenerating} className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Regenerate
                      </button>
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-xs font-medium text-gray-600"><span className="text-gray-400">Subject: </span>{generatedContent.subject}</p>
                      <div className="text-xs text-gray-700 prose prose-sm max-w-none line-clamp-6" dangerouslySetInnerHTML={{ __html: generatedContent.bodyHtml }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="px-7 pb-7 flex justify-end gap-3">
                <button onClick={() => setShowAIModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                {!generatedContent ? (
                  <button onClick={handleGenerateWithAI} disabled={aiGenerating || !aiForm.industry.trim()} className="px-5 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                    {aiGenerating ? <><Loader className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate</>}
                  </button>
                ) : (
                  <button onClick={handleSaveAITemplate} className="px-5 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2">
                    <ChevronRight className="w-4 h-4" /> Use This Template
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Edit / Create Modal ────────────────────────────────────────────── */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">{selectedTemplate ? 'Edit Template' : 'Create Template'}</h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="overflow-y-auto flex-1 p-7 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Template Name *</label>
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="e.g., SaaS Initial Outreach" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
                    <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                      {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                  <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="When to use this template…" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Subject Line *</label>
                  <input type="text" value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} placeholder="e.g., Quick question about {{companyName}}" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Content *</label>
                  <EnhancedEmailEditor
                    label=""
                    value={editForm.bodyHtml}
                    onChange={(content) => setEditForm({ ...editForm, bodyHtml: content })}
                    enableAI={true}
                    enableTemplates={false}
                  />
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-700">Available Variables <span className="text-gray-400 font-normal">(click to select all, then copy)</span></p>
                  {/* Built-in variables grouped by category */}
                  {(['lead', 'sender', 'company', 'link'] as const).map(cat => {
                    const vars = BUILTIN_VARIABLES.filter(v => v.category === cat)
                    return (
                      <div key={cat}>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">{cat}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {vars.map(v => (
                            <span key={v.value} title={v.label} className={`text-[10px] font-mono px-2 py-1 border rounded cursor-default select-all ${VAR_CATEGORY_COLORS[cat]}`}>{v.value}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {/* Custom variables from DB, grouped by category */}
                  {customVars.length > 0 && (() => {
                    const grouped = customVars.reduce((acc, v) => {
                      const cat = v.category || 'custom'
                      if (!acc[cat]) acc[cat] = []
                      acc[cat].push(v)
                      return acc
                    }, {} as Record<string, CustomVariable[]>)
                    return Object.entries(grouped).map(([cat, vars]) => (
                      <div key={cat}>
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">{cat}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {vars.map(v => (
                            <span key={v.id} title={v.description || v.label} className={`text-[10px] font-mono px-2 py-1 border rounded cursor-default select-all ${VAR_CATEGORY_COLORS[cat] || VAR_CATEGORY_COLORS.custom}`}>{v.value}</span>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
              <div className="px-7 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSaveTemplate} disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <><Loader className="w-4 h-4 animate-spin" /> Saving…</> : selectedTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Confirmation ────────────────────────────────────────────── */}
        {showDeleteConfirm && selectedTemplate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Template</h2>
              <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <span className="font-medium text-gray-800">"{selectedTemplate.name}"</span>? This cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setSelectedTemplate(null) }} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleDeleteTemplate} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Preview Modal ──────────────────────────────────────────────────── */}
        {showPreviewModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="overflow-y-auto flex-1 p-7 space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span><span className="font-medium text-gray-400">Category: </span>{categoryLabels[selectedTemplate.category]}</span>
                  <span><span className="font-medium text-gray-400">Used: </span>{selectedTemplate.usageCount}×</span>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
                  <span className="text-gray-400 font-medium mr-1">Subject:</span>
                  <span className="text-gray-800">{selectedTemplate.subject}</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="prose prose-sm max-w-none text-gray-900" dangerouslySetInnerHTML={{ __html: selectedTemplate.bodyHtml || selectedTemplate.bodyText.replace(/\n/g, '<br>') }} />
                </div>
                {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-yellow-800 mb-2">Variables used in this template</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTemplate.variables.map((v, i) => <span key={i} className="text-xs font-mono px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">{v}</span>)}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-7 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={() => setShowPreviewModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
                <button onClick={() => { setShowPreviewModal(false); handleEditTemplate(selectedTemplate) }} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2">
                  <Edit2 className="w-4 h-4" /> Edit Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
    </ProtectedRoute>
  )
}
