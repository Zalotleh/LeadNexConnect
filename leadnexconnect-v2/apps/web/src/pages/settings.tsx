import SettingsLayout from '@/components/SettingsLayout'
import { Save, TestTube, Eye, EyeOff, Settings as SettingsIcon, Server, Mail } from 'lucide-react'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import ApiConfigTab from '@/components/ApiConfigTab'
import SmtpConfigTab from '@/components/SmtpConfigTab'

type TabType = 'general' | 'api' | 'smtp';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('general');
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
    
    // Email Settings
    emailsPerHour: 50,
    dailyEmailLimit: 500,
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
          emailsPerHour: loadedSettings.emailsPerHour || 50,
          dailyEmailLimit: loadedSettings.dailyEmailLimit || 500,
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
                                    'awsRegion', 'emailsPerHour', 'dailyEmailLimit']
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-2">Manage your application settings and integrations</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'general'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              General Settings
            </button>
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
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && (
          <GeneralSettingsTab
            settings={settings}
            showKeys={showKeys}
            loading={loading}
            saving={saving}
            testing={testing}
            modifiedFields={modifiedFields}
            onFieldChange={handleFieldChange}
            onToggleKeyVisibility={toggleKeyVisibility}
            onSave={handleSave}
            onTestSMTP={handleTestSMTP}
          />
        )}

        {activeTab === 'api' && <ApiConfigTab />}

        {activeTab === 'smtp' && <SmtpConfigTab />}
      </div>
    </SettingsLayout>
  )
}

// Extract General Settings Tab as separate component
function GeneralSettingsTab({
  settings,
  showKeys,
  loading,
  saving,
  testing,
  modifiedFields,
  onFieldChange,
  onToggleKeyVisibility,
  onSave,
  onTestSMTP,
}: any) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">AI API Keys</h2>
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
              <p className="text-xs text-gray-500 mt-1">Used for AI-powered email generation</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Lead Generation APIs</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apollo.io API Key
              </label>
              <div className="relative">
                <input
                  type={showKeys.apolloApiKey ? "text" : "password"}
                  value={settings.apolloApiKey}
                  onChange={(e) => onFieldChange('apolloApiKey', e.target.value)}
                  placeholder="Enter your Apollo.io API key"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => onToggleKeyVisibility('apolloApiKey')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys.apolloApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">B2B contact database (100 leads/day free tier)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hunter.io API Key
              </label>
              <div className="relative">
                <input
                  type={showKeys.hunterApiKey ? "text" : "password"}
                  value={settings.hunterApiKey}
                  onChange={(e) => onFieldChange('hunterApiKey', e.target.value)}
                  placeholder="Enter your Hunter.io API key"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => onToggleKeyVisibility('hunterApiKey')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys.hunterApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Email verification and finding</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                People Data Labs API Key
              </label>
              <div className="relative">
                <input
                  type={showKeys.peopleDataLabsApiKey ? "text" : "password"}
                  value={settings.peopleDataLabsApiKey}
                  onChange={(e) => onFieldChange('peopleDataLabsApiKey', e.target.value)}
                  placeholder="Enter your PDL API key"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => onToggleKeyVisibility('peopleDataLabsApiKey')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys.peopleDataLabsApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Contact enrichment (1000 credits/month free tier)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Places API Key
              </label>
              <div className="relative">
                <input
                  type={showKeys.googlePlacesApiKey ? "text" : "password"}
                  value={settings.googlePlacesApiKey}
                  onChange={(e) => onFieldChange('googlePlacesApiKey', e.target.value)}
                  placeholder="Enter your Google Places API key"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => onToggleKeyVisibility('googlePlacesApiKey')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys.googlePlacesApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Local business database</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Custom Search API Key
              </label>
              <div className="relative">
                <input
                  type={showKeys.googleCustomSearchApiKey ? "text" : "password"}
                  value={settings.googleCustomSearchApiKey}
                  onChange={(e) => onFieldChange('googleCustomSearchApiKey', e.target.value)}
                  placeholder="Enter your Google Custom Search API key"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => onToggleKeyVisibility('googleCustomSearchApiKey')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys.googleCustomSearchApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">For email finding (100 searches/day free tier)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Custom Search Engine ID
              </label>
              <div className="relative">
                <input
                  type={showKeys.googleCustomSearchEngineId ? "text" : "password"}
                  value={settings.googleCustomSearchEngineId}
                  onChange={(e) => onFieldChange('googleCustomSearchEngineId', e.target.value)}
                  placeholder="Enter your Custom Search Engine ID"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => onToggleKeyVisibility('googleCustomSearchEngineId')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys.googleCustomSearchEngineId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Get from <a href="https://programmablesearchengine.google.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">programmablesearchengine.google.com</a></p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Email Configuration</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Provider
              </label>
              <select
                value={settings.smtpProvider}
                onChange={(e) => onFieldChange('smtpProvider', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="smtp2go">SMTP2GO</option>
                <option value="sendgrid">SendGrid</option>
                <option value="gmail">Gmail</option>
                <option value="aws-ses">AWS SES</option>
                <option value="generic">Generic SMTP</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={settings.smtpHost}
                  onChange={(e) => onFieldChange('smtpHost', e.target.value)}
                  placeholder="mail-eu.smtp2go.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={settings.smtpPort}
                  onChange={(e) => onFieldChange('smtpPort', e.target.value)}
                  placeholder="2525"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Username
              </label>
              <input
                type="text"
                value={settings.smtpUser}
                onChange={(e) => onFieldChange('smtpUser', e.target.value)}
                placeholder="your-smtp-username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Password
              </label>
              <div className="relative">
                <input
                  type={showKeys.smtpPass ? "text" : "password"}
                  value={settings.smtpPass}
                  onChange={(e) => onFieldChange('smtpPass', e.target.value)}
                  placeholder="Enter your SMTP password"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => onToggleKeyVisibility('smtpPass')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys.smtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Name
                </label>
                <input
                  type="text"
                  value={settings.fromName}
                  onChange={(e) => onFieldChange('fromName', e.target.value)}
                  placeholder="Your Company Name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Email
                </label>
                <input
                  type="email"
                  value={settings.fromEmail}
                  onChange={(e) => onFieldChange('fromEmail', e.target.value)}
                  placeholder="noreply@yourcompany.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <button
                onClick={onTestSMTP}
                disabled={testing || !settings.smtpHost || !settings.smtpPort}
                className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TestTube className="w-4 h-4 inline mr-2" />
                {testing ? 'Testing...' : 'Test SMTP Connection'}
              </button>
            </div>
          </div>
        </div>

        {/* AWS SES Configuration */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">AWS SES Configuration</h2>
            <p className="text-sm text-gray-500 mt-1">Alternative to SMTP - Use Amazon Simple Email Service</p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AWS Access Key ID
              </label>
              <div className="relative">
                <input
                  type={showKeys.awsAccessKeyId ? "text" : "password"}
                  value={settings.awsAccessKeyId}
                  onChange={(e) => onFieldChange('awsAccessKeyId', e.target.value)}
                  placeholder="AKIA..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => onToggleKeyVisibility('awsAccessKeyId')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys.awsAccessKeyId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Your AWS IAM access key with SES permissions</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AWS Secret Access Key
              </label>
              <div className="relative">
                <input
                  type={showKeys.awsSecretAccessKey ? "text" : "password"}
                  value={settings.awsSecretAccessKey}
                  onChange={(e) => onFieldChange('awsSecretAccessKey', e.target.value)}
                  placeholder="Enter your AWS secret access key"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => onToggleKeyVisibility('awsSecretAccessKey')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys.awsSecretAccessKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Your AWS secret key (kept secure)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AWS Region
              </label>
              <select
                value={settings.awsRegion}
                onChange={(e) => onFieldChange('awsRegion', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="us-east-1">US East (N. Virginia) - us-east-1</option>
                <option value="us-east-2">US East (Ohio) - us-east-2</option>
                <option value="us-west-1">US West (N. California) - us-west-1</option>
                <option value="us-west-2">US West (Oregon) - us-west-2</option>
                <option value="eu-west-1">EU (Ireland) - eu-west-1</option>
                <option value="eu-west-2">EU (London) - eu-west-2</option>
                <option value="eu-central-1">EU (Frankfurt) - eu-central-1</option>
                <option value="ap-south-1">Asia Pacific (Mumbai) - ap-south-1</option>
                <option value="ap-northeast-1">Asia Pacific (Tokyo) - ap-northeast-1</option>
                <option value="ap-northeast-2">Asia Pacific (Seoul) - ap-northeast-2</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore) - ap-southeast-1</option>
                <option value="ap-southeast-2">Asia Pacific (Sydney) - ap-southeast-2</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">The AWS region where your SES is configured</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> To use AWS SES, you need to:
              </p>
              <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Verify your sender email address or domain in AWS SES</li>
                <li>Request production access (by default SES is in sandbox mode)</li>
                <li>Create IAM credentials with SES send permissions</li>
                <li>Set SMTP Provider to "AWS SES" above</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Email Sending Limits</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emails Per Hour
              </label>
              <input
                type="number"
                value={settings.emailsPerHour}
                onChange={(e) => onFieldChange('emailsPerHour', parseInt(e.target.value))}
                min="1"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended: 50 emails/hour to avoid spam filters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daily Email Limit
              </label>
              <input
                type="number"
                value={settings.dailyEmailLimit}
                onChange={(e) => onFieldChange('dailyEmailLimit', parseInt(e.target.value))}
                min="1"
                max="5000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended: 500 emails/day for new accounts</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            onClick={onSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 inline mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
  )
}
