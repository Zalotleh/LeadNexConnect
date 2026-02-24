import React, { useState, useRef } from 'react'
import { ChevronDown, Copy, Check } from 'lucide-react'

interface EmailVariable {
  key: string
  label: string
  value: string
  category: 'lead' | 'sender' | 'company' | 'link'
}

export const EMAIL_VARIABLES: EmailVariable[] = [
  // Lead — resolved from the lead record
  { key: 'companyName',  label: 'Company Name',  value: '{{companyName}}',  category: 'lead' },
  { key: 'contactName',  label: 'Contact Name',  value: '{{contactName}}',  category: 'lead' },
  { key: 'email',        label: 'Email',         value: '{{email}}',        category: 'lead' },
  { key: 'website',      label: 'Website',       value: '{{website}}',      category: 'lead' },
  { key: 'industry',     label: 'Industry',      value: '{{industry}}',     category: 'lead' },
  { key: 'city',         label: 'City',          value: '{{city}}',         category: 'lead' },
  { key: 'country',      label: 'Country',       value: '{{country}}',      category: 'lead' },
  { key: 'jobTitle',     label: 'Job Title',     value: '{{jobTitle}}',     category: 'lead' },
  { key: 'companySize',  label: 'Company Size',  value: '{{companySize}}',  category: 'lead' },

  // Sender — resolved from Sender Settings page
  { key: 'sender_name',  label: 'Sender Name',   value: '{{sender_name}}',  category: 'sender' },
  { key: 'sender_email', label: 'Sender Email',  value: '{{sender_email}}', category: 'sender' },
  { key: 'signature',    label: 'Email Signature', value: '{{signature}}',  category: 'sender' },

  // Company — resolved from Company Profile page
  { key: 'ourCompanyName', label: 'Company Name',  value: '{{ourCompanyName}}', category: 'company' },
  { key: 'product_name',   label: 'Product Name',  value: '{{product_name}}',   category: 'company' },
  { key: 'ourWebsite',     label: 'Website URL',   value: '{{ourWebsite}}',     category: 'company' },
  { key: 'support_email',  label: 'Support Email', value: '{{support_email}}',  category: 'company' },

  // Links — resolved from Company Profile page (rendered as <a> tags when sent)
  { key: 'signUpLink',       label: 'Sign Up Link',       value: '{{signUpLink}}',       category: 'link' },
  { key: 'featuresLink',     label: 'Features Link',      value: '{{featuresLink}}',     category: 'link' },
  { key: 'pricingLink',      label: 'Pricing Link',       value: '{{pricingLink}}',      category: 'link' },
  { key: 'demoLink',         label: 'Demo Link',          value: '{{demoLink}}',         category: 'link' },
  { key: 'integrationsLink', label: 'Integrations Link',  value: '{{integrationsLink}}', category: 'link' },
  { key: 'websiteLink',      label: 'Website Link',       value: '{{websiteLink}}',      category: 'link' },
]

interface EmailEditorProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  required?: boolean
}

export default function EmailEditor({
  label,
  value,
  onChange,
  placeholder,
  rows = 10,
  required = false,
}: EmailEditorProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [copiedVar, setCopiedVar] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertVariable = (variable: EmailVariable) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const textBefore = value.substring(0, start)
    const textAfter = value.substring(end)
    
    const newValue = textBefore + variable.value + textAfter
    onChange(newValue)

    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + variable.value.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)

    setShowDropdown(false)
  }

  const copyVariable = (variable: EmailVariable) => {
    navigator.clipboard.writeText(variable.value)
    setCopiedVar(variable.key)
    setTimeout(() => setCopiedVar(null), 2000)
  }

  const groupedVariables = {
    lead:    EMAIL_VARIABLES.filter(v => v.category === 'lead'),
    sender:  EMAIL_VARIABLES.filter(v => v.category === 'sender'),
    company: EMAIL_VARIABLES.filter(v => v.category === 'company'),
    link:    EMAIL_VARIABLES.filter(v => v.category === 'link'),
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            Insert Variable
            <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              
              {/* Dropdown */}
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-y-auto">
                {/* Lead Variables */}
                <div className="p-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Lead Information
                  </div>
                  {groupedVariables.lead.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors group"
                    >
                      <div className="flex-1 text-left">
                        <div className="font-medium">{variable.label}</div>
                        <div className="text-xs text-gray-500 font-mono">{variable.value}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copyVariable(variable)
                        }}
                        className="ml-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-opacity"
                        title="Copy variable"
                      >
                        {copiedVar === variable.key ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </button>
                  ))}
                </div>

                {/* Sender */}
                <div className="p-2 border-t">
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Sender Identity
                  </div>
                  {groupedVariables.sender.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors group"
                    >
                      <div className="flex-1 text-left">
                        <div className="font-medium">{variable.label}</div>
                        <div className="text-xs text-gray-500 font-mono">{variable.value}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyVariable(variable) }}
                        className="ml-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-opacity"
                        title="Copy variable"
                      >
                        {copiedVar === variable.key ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </button>
                  ))}
                </div>

                {/* Company Info */}
                <div className="p-2 border-t">
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Company Profile
                  </div>
                  {groupedVariables.company.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors group"
                    >
                      <div className="flex-1 text-left">
                        <div className="font-medium">{variable.label}</div>
                        <div className="text-xs text-gray-500 font-mono">{variable.value}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyVariable(variable) }}
                        className="ml-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-opacity"
                        title="Copy variable"
                      >
                        {copiedVar === variable.key ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </button>
                  ))}
                </div>

                {/* Company Links */}
                <div className="p-2 border-t">
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Company Links
                  </div>
                  {groupedVariables.link.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors group"
                    >
                      <div className="flex-1 text-left">
                        <div className="font-medium">{variable.label}</div>
                        <div className="text-xs text-gray-500 font-mono">{variable.value}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyVariable(variable) }}
                        className="ml-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-opacity"
                        title="Copy variable"
                      >
                        {copiedVar === variable.key ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </button>
                  ))}
                </div>

                <div className="p-3 border-t bg-gray-50">
                  <p className="text-xs text-gray-600">
                    💡 <strong>Tip:</strong> Link variables like <code>{'{{signUpLink}}'}</code> become clickable <code>&lt;a&gt;</code> tags when the email is sent.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
      />
      
      <div className="mt-2 text-xs text-gray-500">
        Variables like <code className="bg-gray-100 px-1 py-0.5 rounded">{'{{companyName}}'}</code> will be replaced with actual lead data when sent.
      </div>
    </div>
  )
}
