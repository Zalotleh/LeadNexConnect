import React from 'react';
import { X, Loader, Zap } from 'lucide-react';

interface GenerateLeadsForm {
  source: 'apollo' | 'google_places' | 'peopledatalabs' | 'linkedin';
  batchName: string;
  industry: string;
  country: string;
  city: string;
  maxResults: number;
}

interface GenerateLeadsModalProps {
  show: boolean;
  generateForm: GenerateLeadsForm;
  generating: boolean;
  generationProgress: string;
  industriesByCategory: Record<string, Array<{ value: string; label: string }>>;
  countries: string[];
  onClose: () => void;
  onFormChange: (form: GenerateLeadsForm) => void;
  onSubmit: () => void;
}

export const GenerateLeadsModal: React.FC<GenerateLeadsModalProps> = ({
  show,
  generateForm,
  generating,
  generationProgress,
  industriesByCategory,
  countries,
  onClose,
  onFormChange,
  onSubmit,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Generate Leads</h2>
            <p className="text-sm text-gray-600 mt-1">Select source and configure filters</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={generating}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Source Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Lead Source *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                generateForm.source === 'apollo' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
              }`}>
                <input
                  type="radio"
                  checked={generateForm.source === 'apollo'}
                  onChange={() => onFormChange({ ...generateForm, source: 'apollo' })}
                  className="mt-1"
                  disabled={generating}
                />
                <div>
                  <p className="font-medium text-gray-900">Apollo.io</p>
                  <p className="text-sm text-gray-600">B2B contact database</p>
                  <p className="text-xs text-gray-500 mt-1">100 leads/day limit</p>
                </div>
              </label>

              <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                generateForm.source === 'google_places' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
              }`}>
                <input
                  type="radio"
                  checked={generateForm.source === 'google_places'}
                  onChange={() => onFormChange({ ...generateForm, source: 'google_places' })}
                  className="mt-1"
                  disabled={generating}
                />
                <div>
                  <p className="font-medium text-gray-900">Google Places</p>
                  <p className="text-sm text-gray-600">Local businesses</p>
                  <p className="text-xs text-gray-500 mt-1">Unlimited</p>
                </div>
              </label>

              <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                generateForm.source === 'peopledatalabs' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
              }`}>
                <input
                  type="radio"
                  checked={generateForm.source === 'peopledatalabs'}
                  onChange={() => onFormChange({ ...generateForm, source: 'peopledatalabs' })}
                  className="mt-1"
                  disabled={generating}
                />
                <div>
                  <p className="font-medium text-gray-900">People Data Labs</p>
                  <p className="text-sm text-gray-600">Contact enrichment</p>
                  <p className="text-xs text-gray-500 mt-1">1,000 credits/month</p>
                </div>
              </label>

              <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                generateForm.source === 'linkedin' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
              }`}>
                <input
                  type="radio"
                  checked={generateForm.source === 'linkedin'}
                  onChange={() => onFormChange({ ...generateForm, source: 'linkedin' })}
                  className="mt-1"
                  disabled={generating}
                />
                <div>
                  <p className="font-medium text-gray-900">LinkedIn CSV</p>
                  <p className="text-sm text-gray-600">Sales Navigator</p>
                  <p className="text-xs text-gray-500 mt-1">Manual upload</p>
                </div>
              </label>
            </div>
          </div>

          {/* Batch Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Name *
            </label>
            <input
              type="text"
              value={generateForm.batchName}
              onChange={(e) => onFormChange({ ...generateForm, batchName: e.target.value })}
              placeholder="e.g., NYC Hotels - March 2024"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={generating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Give this batch a descriptive name to organize your leads
            </p>
          </div>

          {/* Industry Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry *
            </label>
            <select
              value={generateForm.industry}
              onChange={(e) => onFormChange({ ...generateForm, industry: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={generating}
            >
              <option value="">Select industry...</option>
              {Object.entries(industriesByCategory).map(([category, items]) => (
                <optgroup key={category} label={category}>
                  {items.map((industry) => (
                    <option key={industry.value} value={industry.value}>
                      {industry.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose the specific business type for better targeting
            </p>
          </div>

          {/* Location Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                value={generateForm.country}
                onChange={(e) => onFormChange({ ...generateForm, country: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={generating}
              >
                {countries.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City (Optional)
              </label>
              <input
                type="text"
                value={generateForm.city}
                onChange={(e) => onFormChange({ ...generateForm, city: e.target.value })}
                placeholder="e.g., New York"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={generating}
              />
            </div>
          </div>

          {/* Max Results */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Results
            </label>
            <input
              type="number"
              value={generateForm.maxResults}
              onChange={(e) => onFormChange({ ...generateForm, maxResults: parseInt(e.target.value) || 0 })}
              min="1"
              max="500"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={generating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Note: Actual results may be lower based on API limits and data availability
            </p>
          </div>

          {/* Progress Indicator */}
          {generating && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Generating leads...</p>
                  <p className="text-xs text-blue-700 mt-1">{generationProgress}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            disabled={generating}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={generating || !generateForm.industry}
            className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader className="w-4 h-4 inline mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 inline mr-2" />
                Generate Leads
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
