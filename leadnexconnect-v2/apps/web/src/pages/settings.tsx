import Layout from '@/components/Layout'
import { Save, TestTube, Eye, EyeOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'

export default function Settings() {
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
    smtpPass: false,
  })
  
  // Track which fields have been modified
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())
  
  // Store original masked values from server
  const [originalMaskedValues, setOriginalMaskedValues] = useState<Record<string, string>>({})
  
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
    
    // Email Settings
    emailsPerHour: 50,
    dailyEmailLimit: 500,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const toggleKeyVisibility = (field: keyof typeof showKeys) => {
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
          smtpPass: loadedSettings.smtpPass || '',
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
          emailsPerHour: loadedSettings.emailsPerHour || 50,
          dailyEmailLimit: loadedSettings.dailyEmailLimit || 500,
        })
        
        // Reset modified fields
        setModifiedFields(new Set())
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
                                    'emailsPerHour', 'dailyEmailLimit']
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
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading settings...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account and preferences</p>
        </div>

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
                  onChange={(e) => handleFieldChange('anthropicApiKey', e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => toggleKeyVisibility('anthropicApiKey')}
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
                  onChange={(e) => handleFieldChange('apolloApiKey', e.target.value)}
                  placeholder="Enter your Apollo.io API key"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => toggleKeyVisibility('apolloApiKey')}
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
                  onChange={(e) => handleFieldChange('hunterApiKey', e.target.value)}
                  placeholder="Enter your Hunter.io API key"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => toggleKeyVisibility('hunterApiKey')}
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
                  onChange={(e) => handleFieldChange('peopleDataLabsApiKey', e.target.value)}
                  placeholder="Enter your PDL API key"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => toggleKeyVisibility('peopleDataLabsApiKey')}
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
                  onChange={(e) => handleFieldChange('googlePlacesApiKey', e.target.value)}
                  placeholder="Enter your Google Places API key"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => toggleKeyVisibility('googlePlacesApiKey')}
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
                  onChange={(e) => handleFieldChange('googleCustomSearchApiKey', e.target.value)}
                  placeholder="Enter your Google Custom Search API key"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => toggleKeyVisibility('googleCustomSearchApiKey')}
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
              <input
                type="text"
                value={settings.googleCustomSearchEngineId}
                onChange={(e) => handleFieldChange('googleCustomSearchEngineId', e.target.value)}
                placeholder="Enter your Custom Search Engine ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
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
                onChange={(e) => handleFieldChange('smtpProvider', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="smtp2go">SMTP2GO</option>
                <option value="sendgrid">SendGrid</option>
                <option value="gmail">Gmail</option>
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
                  onChange={(e) => handleFieldChange('smtpHost', e.target.value)}
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
                  onChange={(e) => handleFieldChange('smtpPort', e.target.value)}
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
                onChange={(e) => handleFieldChange('smtpUser', e.target.value)}
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
                  onChange={(e) => handleFieldChange('smtpPass', e.target.value)}
                  placeholder="Enter your SMTP password"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => toggleKeyVisibility('smtpPass')}
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
                  onChange={(e) => handleFieldChange('fromName', e.target.value)}
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
                  onChange={(e) => handleFieldChange('fromEmail', e.target.value)}
                  placeholder="noreply@yourcompany.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <button
                onClick={handleTestSMTP}
                disabled={testing || !settings.smtpHost || !settings.smtpPort}
                className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TestTube className="w-4 h-4 inline mr-2" />
                {testing ? 'Testing...' : 'Test SMTP Connection'}
              </button>
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
                onChange={(e) => handleFieldChange('emailsPerHour', parseInt(e.target.value))}
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
                onChange={(e) => handleFieldChange('dailyEmailLimit', parseInt(e.target.value))}
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
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 inline mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
