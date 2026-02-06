import { X, Upload, Sparkles, Target } from 'lucide-react'
import { INDUSTRIES } from '@leadnex/shared'

interface ImportCSVDialogProps {
  show: boolean
  importFile: File | null
  importForm: {
    batchName: string
    industry: string
    enrichEmail: boolean
  }
  isImporting: boolean
  onClose: () => void
  onFormChange: (form: any) => void
  onSubmit: () => void
}

export default function ImportCSVDialog({
  show,
  importFile,
  importForm,
  isImporting,
  onClose,
  onFormChange,
  onSubmit
}: ImportCSVDialogProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Import Leads from CSV</h2>
            <p className="text-sm text-gray-600 mt-1">Configure your import settings</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
            <Upload className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900">Selected File</p>
              <p className="text-sm text-blue-700 truncate">{importFile?.name}</p>
              <p className="text-xs text-blue-600 mt-1">
                {importFile ? `${(importFile.size / 1024).toFixed(2)} KB` : ''}
              </p>
            </div>
          </div>

          {/* Batch Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={importForm.batchName}
              onChange={(e) => onFormChange({ ...importForm, batchName: e.target.value })}
              placeholder="e.g., Q4 Lead Import"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Give this import batch a descriptive name for easy identification</p>
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <select
              value={importForm.industry}
              onChange={(e) => onFormChange({ ...importForm, industry: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="Other">Other</option>
              {INDUSTRIES.map((industry) => (
                <option key={industry.value} value={industry.value}>
                  {industry.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Select the primary industry for these leads</p>
          </div>

          {/* Email Enrichment */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="enrichEmail"
                checked={importForm.enrichEmail}
                onChange={(e) => onFormChange({ ...importForm, enrichEmail: e.target.checked })}
                className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <div className="flex-1">
                <label htmlFor="enrichEmail" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center">
                  <Sparkles className="w-4 h-4 text-green-600 mr-2" />
                  Enable Email Enrichment
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Automatically find and add missing email addresses using Hunter.io. This may take a few extra seconds.
                </p>
              </div>
            </div>
          </div>

          {/* Import Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <Target className="w-4 h-4 mr-2 text-gray-600" />
              What happens during import?
            </h3>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>Duplicate leads (by email or company name) will be automatically skipped</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>Quality scores will be calculated based on data completeness</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>All leads will be grouped in a single batch for easy management</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>You can view the batch details in the "Batch View" tab after import</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isImporting || !importForm.batchName.trim()}
            className="px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isImporting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Leads
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
