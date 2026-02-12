import SettingsLayout from '@/components/SettingsLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Save, Eye, EyeOff, Settings as SettingsIcon, Server, Mail } from 'lucide-react'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import ApiConfigTab from '@/components/ApiConfigTab'
import SmtpConfigTab from '@/components/SmtpConfigTab'

type TabType = 'api' | 'smtp' | 'ai';

function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('api');
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showKeys, setShowKeys] = useState({
    anthropicApiKey: false,
    apolloApiKey: false,
    hunterApiKey: false,
    peopleDataLabsApiKey: false,
    googlePlacesApiKey: false,
    googleCustomSearchApiKey: false,
    googleCustomSearchEngineId: false,
    smtpPass: false,
    awsAccessKeyId: false,
    awsSecretAccessKey: false,
  })
  
  // Track which fields have been modified
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())
  
  // Store original masked values from server
  const [originalMaskedValues, setOriginalMaskedValues] = useState<Record<string, string>>({})
  
  // Store unmasked values when revealed
  const [unmaskedValues, setUnmaskedValues] = useState<Record<string, string>>({})
  
  const [settings, setSettings] = useState({
    // AI Keys
    anthropicApiKey: '',

    // Lead Generation Keys
    apolloApiKey: '',
    hunterApiKey: '',
    peopleDataLabsApiKey: '',
    googlePlacesApiKey: '',
    googleCustomSearchApiKey: '',
    googleCustomSearchEngineId: '',

    // SMTP Config
    smtpProvider: 'smtp2go',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    smtpSecure: 'false',
    fromName: '',
    fromEmail: '',

    // AWS SES Config
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    awsRegion: 'us-east-1',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const toggleKeyVisibility = async (field: keyof typeof showKeys) => {
    const isCurrentlyShown = showKeys[field]
    
    // If we're about to show the field and haven't fetched the unmasked value yet
    if (!isCurrentlyShown && !unmaskedValues[field]) {
      try {
        const response = await api.get(`/settings/unmasked/${field}`)
        if (response.data.success) {
          const unmaskedValue = response.data.data.value || ''
          setUnmaskedValues(prev => ({ ...prev, [field]: unmaskedValue }))
          setSettings(prev => ({ ...prev, [field]: unmaskedValue }))
        }
      } catch (error) {
        console.error('Failed to fetch unmasked value', error)
        toast.error('Failed to reveal value')
        return
      }
    } else if (!isCurrentlyShown && unmaskedValues[field]) {
      // If we already have the unmasked value, just use it
      setSettings(prev => ({ ...prev, [field]: unmaskedValues[field] }))
    } else {
      // If we're hiding the field, restore the masked value
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
        const loadedSettings = response.data.data
        
        // Store the masked values separately
        const maskedValues: Record<string, string> = {
          anthropicApiKey: loadedSettings.anthropicApiKey || '',
          apolloApiKey: loadedSettings.apolloApiKey || '',
          hunterApiKey: loadedSettings.hunterApiKey || '',
          peopleDataLabsApiKey: loadedSettings.peopleDataLabsApiKey || '',
          googlePlacesApiKey: loadedSettings.googlePlacesApiKey || '',
          googleCustomSearchApiKey: loadedSettings.googleCustomSearchApiKey || '',
          googleCustomSearchEngineId: loadedSettings.googleCustomSearchEngineId || '',
          smtpPass: loadedSettings.smtpPass || '',
          awsAccessKeyId: loadedSettings.awsAccessKeyId || '',
          awsSecretAccessKey: loadedSettings.awsSecretAccessKey || '',
        }
        setOriginalMaskedValues(maskedValues)
        
        // Set the settings with masked values
        setSettings({
          anthropicApiKey: loadedSettings.anthropicApiKey || '',
          apolloApiKey: loadedSettings.apolloApiKey || '',
          hunterApiKey: loadedSettings.hunterApiKey || '',
          peopleDataLabsApiKey: loadedSettings.peopleDataLabsApiKey || '',
          googlePlacesApiKey: loadedSettings.googlePlacesApiKey || '',
          googleCustomSearchApiKey: loadedSettings.googleCustomSearchApiKey || '',
          googleCustomSearchEngineId: loadedSettings.googleCustomSearchEngineId || '',
          smtpProvider: loadedSettings.smtpProvider || 'smtp2go',
          smtpHost: loadedSettings.smtpHost || '',
          smtpPort: loadedSettings.smtpPort || '',
          smtpUser: loadedSettings.smtpUser || '',
          smtpPass: loadedSettings.smtpPass || '',
          smtpSecure: loadedSettings.smtpSecure || 'false',
          fromName: loadedSettings.fromName || '',
          fromEmail: loadedSettings.fromEmail || '',
          awsAccessKeyId: loadedSettings.awsAccessKeyId || '',
          awsSecretAccessKey: loadedSettings.awsSecretAccessKey || '',
          awsRegion: loadedSettings.awsRegion || 'us-east-1',
        })
        
        // Reset modified fields and unmasked values
        setModifiedFields(new Set())
        setUnmaskedValues({})
      }
    } catch (error: any) {
      toast.error('Failed to load settings')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Only send fields that have been modified
      const dataToSend: Record<string, any> = {}
      
      modifiedFields.forEach(fieldName => {
        const value = (settings as any)[fieldName]
        // Only include if the value is not empty and not a masked value
        if (value && !value.includes('••••••••')) {
          dataToSend[fieldName] = value
        }
      })
      
      // Always include non-sensitive fields
      const alwaysIncludeFields = ['googleCustomSearchEngineId', 'smtpProvider', 'smtpHost', 'smtpPort',
                                    'smtpUser', 'smtpSecure', 'fromName', 'fromEmail',
                                    'awsRegion']
      alwaysIncludeFields.forEach(field => {
        if (modifiedFields.has(field)) {
          dataToSend[field] = (settings as any)[field]
        }
      })
      
      if (Object.keys(dataToSend).length === 0) {
        toast.error('No changes to save')
        setSaving(false)
        return
      }
      
      const response = await api.put('/settings', dataToSend)
      if (response.data.success) {
        toast.success('Settings saved successfully!')
        loadSettings() // Reload to get fresh masked values
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestSMTP = async () => {
    setTesting(true)
    try {
      const response = await api.post('/settings/test-smtp', {
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPass: settings.smtpPass,
      })
      if (response.data.success) {
        toast.success('SMTP connection successful!')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'SMTP connection failed')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <SettingsLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading settings...</div>
        </div>
      </SettingsLayout>
    )
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('api')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'api'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Server className="w-4 h-4" />
              API Configuration
            </button>
            <button
              onClick={() => setActiveTab('smtp')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'smtp'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Mail className="w-4 h-4" />
              SMTP Configuration
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'ai'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              AI Configuration
            </button>
          </nav>
        </div>

        {/* Tab Content */}
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
    </SettingsLayout>
  )
}

// AI Configuration Tab
function AIConfigTab({
  settings,
  showKeys,
  loading,
  saving,
  modifiedFields,
  onFieldChange,
  onToggleKeyVisibility,
  onSave,
}: any) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* AI Configuration */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">AI Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">Configure AI services for email generation and content personalization</p>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anthropic API Key (Claude)
            </label>
            <div className="relative">
              <input
                type={showKeys.anthropicApiKey ? "text" : "password"}
                value={settings.anthropicApiKey}
                onChange={(e) => onFieldChange('anthropicApiKey', e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={() => onToggleKeyVisibility('anthropicApiKey')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKeys.anthropicApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Used for AI-powered email generation and content personalization.
              Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Anthropic Console</a>
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || modifiedFields.size === 0}
          className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
            saving || modifiedFields.size === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
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
