import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { configService, ApiConfig } from '@/services/config.service';
import toast from 'react-hot-toast';

interface ApiConfigDialogProps {
  config: ApiConfig | null;
  onClose: (saved: boolean) => void;
}

export default function ApiConfigDialog({ config, onClose }: ApiConfigDialogProps) {
  const isEditing = !!config;
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);

  const [formData, setFormData] = useState({
    apiSource: config?.apiSource || '',
    apiKey: config?.apiKey || '',
    apiSecret: config?.apiSecret || '',
    planName: config?.planName || '',
    monthlyLimit: config?.monthlyLimit || 0,
    costPerLead: config?.costPerLead || '',
    costPerAPICall: config?.costPerAPICall || '',
    isActive: config?.isActive !== undefined ? config.isActive : true,
    setupNotes: config?.setupNotes || '',
  });

  const apiSourceOptions = [
    { value: 'apollo', label: 'Apollo.io', docUrl: 'https://www.apollo.io/api' },
    { value: 'hunter', label: 'Hunter.io', docUrl: 'https://hunter.io/api-documentation' },
    { value: 'google_places', label: 'Google Places', docUrl: 'https://developers.google.com/maps/documentation/places/web-service' },
    { value: 'peopledatalabs', label: 'PeopleDataLabs', docUrl: 'https://docs.peopledatalabs.com/' },
  ];

  const selectedSource = apiSourceOptions.find(opt => opt.value === formData.apiSource);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.apiSource) {
      toast.error('Please select an API source');
      return;
    }

    setSaving(true);
    try {
      await configService.upsertApiConfig({
        apiSource: formData.apiSource,
        apiKey: formData.apiKey || undefined,
        apiSecret: formData.apiSecret || undefined,
        planName: formData.planName || undefined,
        monthlyLimit: formData.monthlyLimit || 0,
        costPerLead: formData.costPerLead || '0',
        costPerAPICall: formData.costPerAPICall || '0',
        isActive: formData.isActive,
        setupNotes: formData.setupNotes || undefined,
      });

      toast.success(isEditing ? 'Configuration updated successfully' : 'Configuration created successfully');
      onClose(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to save configuration');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit API Configuration' : 'Add API Configuration'}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Source *
            </label>
            <select
              value={formData.apiSource}
              onChange={(e) => setFormData({ ...formData, apiSource: e.target.value })}
              disabled={isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
              required
            >
              <option value="">Select an API source</option>
              {apiSourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedSource && (
              <a
                href={selectedSource.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2"
              >
                <ExternalLink className="w-3 h-3" />
                View API Documentation
              </a>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your API key"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Secret (if required)
            </label>
            <div className="relative">
              <input
                type={showApiSecret ? 'text' : 'password'}
                value={formData.apiSecret}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your API secret"
              />
              <button
                type="button"
                onClick={() => setShowApiSecret(!showApiSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan Name
              </label>
              <input
                type="text"
                value={formData.planName}
                onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Professional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Limit
              </label>
              <input
                type="number"
                value={formData.monthlyLimit}
                onChange={(e) => setFormData({ ...formData, monthlyLimit: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost per Lead ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.costPerLead}
                onChange={(e) => setFormData({ ...formData, costPerLead: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost per API Call ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.costPerAPICall}
                onChange={(e) => setFormData({ ...formData, costPerAPICall: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Enable this API source for lead generation
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Setup Notes (Optional)
            </label>
            <textarea
              value={formData.setupNotes}
              onChange={(e) => setFormData({ ...formData, setupNotes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Add any notes about this configuration..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
