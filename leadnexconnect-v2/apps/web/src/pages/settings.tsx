// @ts-nocheck
import SettingsLayout from '@/components/SettingsLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import {
  Save, Eye, EyeOff, Settings as SettingsIcon, Server, Mail,
  Cpu, ChevronRight, Key, Zap, AlertCircle, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import ApiConfigTab from '@/components/ApiConfigTab'
import SmtpConfigTab from '@/components/SmtpConfigTab'

type TabType = 'api' | 'smtp' | 'ai'

const NAV_ITEMS: { id: TabType; icon: any; label: string; description: string; color: string; bg: string }[] = [
  {
    id: 'api',
    icon: Server,
    label: 'API Keys',
    description: 'Lead generation API providers',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    id: 'smtp',
    icon: Mail,
    label: 'Email / SMTP',
    description: 'Outreach email providers',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    id: 'ai',
    icon: Cpu,
    label: 'AI Configuration',
    description: 'Claude & AI models',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
]

function Settings() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('api')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showKeys, setShowKeys] = useState({ anthropicApiKey: false })
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())
  const [originalMaskedValues, setOriginalMaskedValues] = useState<Record<string, string>>({})
  const [unmaskedValues, setUnmaskedValues] = useState<Record<string, string>>({})
  const [settings, setSettings] = useState({ anthropicApiKey: '' })

  useEffect(() => {
    if (user && !isAdmin) {
      toast.error('Access denied. Settings page is admin-only.')
      router.push('/dashboard')
    }
  }, [user, isAdmin, router])

  useEffect(() => { loadSettings() }, [])

  const toggleKeyVisibility = async (field: string) => {
    const isCurrentlyShown = showKeys[field]
    if (!isCurrentlyShown && !unmaskedValues[field]) {
      try {
        const response = await api.get(`/settings/unmasked/${field}`)
        if (response.data.success) {
          const unmaskedValue = response.data.data.value || ''
          setUnmaskedValues(prev => ({ ...prev, [field]: unmaskedValue }))
          setSettings(prev => ({ ...prev, [field]: unmaskedValue }))
        }
      } catch {
        toast.error('Failed to reveal value')
        return
      }
    } else if (!isCurrentlyShown && unmaskedValues[field]) {
      setSettings(prev => ({ ...prev, [field]: unmaskedValues[field] }))
    } else {
      setSettings(prev => ({ ...prev, [field]: originalMaskedValues[field] || '' }))
    }
    setShowKeys(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setSettings(prev => ({ ...prev, [fieldName]: value }))
    setModifiedFields(prev => new Set(prev).add(fieldName))
  }

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/settings')
      if (response.data.success) {
        const s = response.data.data
        setOriginalMaskedValues({ anthropicApiKey: s.anthropicApiKey || '' })
        setSettings({ anthropicApiKey: s.anthropicApiKey || '' })
        setModifiedFields(new Set())
        setUnmaskedValues({})
      }
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const dataToSend: Record<string, any> = {}
      modifiedFields.forEach(field => {
        const value = (settings as any)[field]
        if (value && !value.includes('••••••••')) {
          dataToSend[field] = value
        }
      })
      if (Object.keys(dataToSend).length === 0) {
        toast.error('No changes to save')
        setSaving(false)
        return
      }
      const response = await api.put('/settings', dataToSend)
      if (response.data.success) {
        toast.success('Settings saved!')
        loadSettings()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const activeNav = NAV_ITEMS.find(n => n.id === activeTab)!

  return (
    <SettingsLayout>
      <div className="space-y-6">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="w-7 h-7 text-primary-600" />
            Settings
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Manage API keys, email providers, and AI configuration.</p>
        </div>

        {/* ── Main Layout ───────────────────────────────────────────────── */}
        <div className="flex gap-6 items-start">

          {/* ── Sidebar Nav ───────────────────────────────────────────── */}
          <div className="w-64 flex-shrink-0 space-y-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              const active = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group
                    ${active
                      ? 'bg-white border border-gray-200 shadow-sm'
                      : 'hover:bg-white hover:border hover:border-gray-200 border border-transparent'
                    }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? item.bg : 'bg-gray-100 group-hover:' + item.bg}`}>
                    <Icon className={`w-4 h-4 ${active ? item.color : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold truncate ${active ? 'text-gray-900' : 'text-gray-600'}`}>
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{item.description}</div>
                  </div>
                  {active && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>
              )
            })}

            {/* Info Card */}
            <div className="mt-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl">
              <div className="flex items-start gap-2">
                <Key className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-indigo-800">API Keys Security</p>
                  <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">Keys are stored encrypted. Reveal only when needed.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Content Area ──────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Section Header */}
            <div className={`flex items-center gap-3 mb-5 p-4 rounded-xl border ${activeNav.bg} border-opacity-50`}
              style={{ borderColor: 'transparent', background: '' }}
            >
              <div className={`w-10 h-10 ${activeNav.bg} rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-white`}>
                {(() => { const Icon = activeNav.icon; return <Icon className={`w-5 h-5 ${activeNav.color}`} /> })()}
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">{activeNav.label}</h2>
                <p className="text-xs text-gray-500">{activeNav.description}</p>
              </div>
            </div>

            {activeTab === 'api' && <ApiConfigTab />}
            {activeTab === 'smtp' && <SmtpConfigTab />}
            {activeTab === 'ai' && (
              <AIConfigTab
                settings={settings}
                showKeys={showKeys}
                loading={loading}
                saving={saving}
                modifiedFields={modifiedFields}
                onFieldChange={handleFieldChange}
                onToggleKeyVisibility={toggleKeyVisibility}
                onSave={handleSave}
              />
            )}
          </div>
        </div>
      </div>
    </SettingsLayout>
  )
}

// ── AI Config Tab ─────────────────────────────────────────────────────────────
function AIConfigTab({ settings, showKeys, loading, saving, modifiedFields, onFieldChange, onToggleKeyVisibility, onSave }: any) {
  const isDirty = modifiedFields.size > 0
  const hasValue = settings.anthropicApiKey && settings.anthropicApiKey !== ''

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Anthropic Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Anthropic (Claude)</h3>
              <p className="text-xs text-gray-400">AI email generation &amp; content personalization</p>
            </div>
          </div>
          {hasValue ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              Configured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
              <AlertCircle className="w-3 h-3" />
              Not set
            </span>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* API Key Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-gray-400" />
                API Key
                {isDirty && modifiedFields.has('anthropicApiKey') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" title="Unsaved change" />
                )}
              </label>
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:underline"
              >
                Get API key ↗
              </a>
            </div>
            <div className="relative">
              <input
                type={showKeys.anthropicApiKey ? 'text' : 'password'}
                value={settings.anthropicApiKey}
                onChange={(e) => onFieldChange('anthropicApiKey', e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono bg-gray-50 placeholder:font-sans placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => onToggleKeyVisibility('anthropicApiKey')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showKeys.anthropicApiKey
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Used to power AI email generation and smart content personalization.
            </p>
          </div>

          {/* How it's used */}
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-purple-800 mb-2">How Claude AI is used</p>
            <ul className="space-y-1">
              {[
                'Generating personalized cold emails',
                'Writing follow-up sequences',
                'Adapting tone per lead profile',
              ].map(item => (
                <li key={item} className="flex items-center gap-2 text-xs text-purple-700">
                  <span className="w-1 h-1 rounded-full bg-purple-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Save Row */}
      <div className="flex items-center justify-between py-3 px-5 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="text-xs text-gray-400">
          {isDirty
            ? <span className="text-amber-600 font-medium">You have unsaved changes</span>
            : 'All changes saved'}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !isDirty}
          className={`flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl transition-colors
            ${saving || !isDirty
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

function SettingsWithProtection() {
  return (
    <ProtectedRoute>
      <Settings />
    </ProtectedRoute>
  )
}

export default SettingsWithProtection
