import Layout from '@/components/Layout';
import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  X, 
  Save,
  AlertCircle,
  Tag,
  Hash,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { emailVariableManager } from '@/lib/emailVariables';

interface CustomVariable {
  id: string;
  key: string;
  label: string;
  value: string;
  category: string;
  description: string | null;
  usageCount: number;
  isActive: boolean;
  defaultValue: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function VariablesPage() {
  const [variables, setVariables] = useState<CustomVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<CustomVariable | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    key: '',
    label: '',
    category: 'custom',
    description: '',
    defaultValue: '',
    isActive: true,
  });
  
  // Test state
  const [testValue, setTestValue] = useState('');

  useEffect(() => {
    loadVariables();
  }, [searchTerm, categoryFilter]);

  const loadVariables = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('category', categoryFilter);
      
      const url = params.toString() 
        ? `/api/custom-variables?${params}` 
        : '/api/custom-variables';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load variables');
      
      const data = await response.json();
      setVariables(data);
    } catch (error: any) {
      console.error('Load variables error:', error);
      toast.error('Failed to load variables');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariable = async () => {
    if (!form.key || !form.label) {
      toast.error('Key and Label are required');
      return;
    }

    // Validate key format
    if (!/^[a-zA-Z0-9_]+$/.test(form.key)) {
      toast.error('Key must contain only letters, numbers, and underscores');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/custom-variables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: form.key,
          label: form.label,
          value: `{{${form.key}}}`,
          category: form.category,
          description: form.description || null,
          defaultValue: form.defaultValue || null,
          isActive: form.isActive,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create variable');
      }

      toast.success('Variable created successfully');
      setShowAddModal(false);
      resetForm();
      loadVariables();
      
      // Reload email variable manager for TinyMCE
      emailVariableManager.reloadCustomVariables();
    } catch (error: any) {
      console.error('Create variable error:', error);
      toast.error(error.message || 'Failed to create variable');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVariable = async () => {
    if (!selectedVariable || !form.label) {
      toast.error('Label is required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/custom-variables/${selectedVariable.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label,
          category: form.category,
          description: form.description || null,
          defaultValue: form.defaultValue || null,
          isActive: form.isActive,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update variable');
      }

      toast.success('Variable updated successfully');
      setShowEditModal(false);
      setSelectedVariable(null);
      resetForm();
      loadVariables();
      
      // Reload email variable manager for TinyMCE
      emailVariableManager.reloadCustomVariables();
    } catch (error: any) {
      console.error('Update variable error:', error);
      toast.error(error.message || 'Failed to update variable');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariable = async () => {
    if (!selectedVariable) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/custom-variables/${selectedVariable.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete variable');
      }

      toast.success('Variable deleted successfully');
      setShowDeleteModal(false);
      setSelectedVariable(null);
      loadVariables();
      
      // Reload email variable manager for TinyMCE
      emailVariableManager.reloadCustomVariables();
    } catch (error: any) {
      console.error('Delete variable error:', error);
      toast.error(error.message || 'Failed to delete variable');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (variable: CustomVariable) => {
    setSelectedVariable(variable);
    setForm({
      key: variable.key,
      label: variable.label,
      category: variable.category,
      description: variable.description || '',
      defaultValue: variable.defaultValue || '',
      isActive: variable.isActive,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (variable: CustomVariable) => {
    setSelectedVariable(variable);
    setShowDeleteModal(true);
  };

  const openTestModal = (variable: CustomVariable) => {
    setSelectedVariable(variable);
    setTestValue(variable.defaultValue || '');
    setShowTestModal(true);
  };

  const resetForm = () => {
    setForm({
      key: '',
      label: '',
      category: 'custom',
      description: '',
      defaultValue: '',
      isActive: true,
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-blue-100 text-blue-700',
      company: 'bg-purple-100 text-purple-700',
      link: 'bg-green-100 text-green-700',
      custom: 'bg-gray-100 text-gray-700',
    };
    return colors[category] || colors.custom;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'lead':
        return <Tag className="w-3 h-3" />;
      case 'company':
        return <Hash className="w-3 h-3" />;
      case 'link':
        return <FileText className="w-3 h-3" />;
      default:
        return <Tag className="w-3 h-3" />;
    }
  };

  const filteredVariables = variables;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Custom Variables
          </h1>
          <p className="text-gray-600">
            Manage custom email variables for personalized outreach
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search variables by key, label, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              <option value="lead">Lead</option>
              <option value="company">Company</option>
              <option value="link">Link</option>
              <option value="custom">Custom</option>
            </select>

            {/* Add Button */}
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Add Variable
            </button>
          </div>
        </div>

        {/* Variables List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredVariables.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No variables found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || categoryFilter
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first custom variable'}
            </p>
            {!searchTerm && !categoryFilter && (
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Variable
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVariables.map((variable) => (
              <div
                key={variable.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {variable.label}
                      </h3>
                      {variable.isActive ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <code className="text-sm text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                      {variable.value}
                    </code>
                  </div>
                  <span
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getCategoryColor(
                      variable.category
                    )}`}
                  >
                    {getCategoryIcon(variable.category)}
                    {variable.category}
                  </span>
                </div>

                {/* Description */}
                {variable.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {variable.description}
                  </p>
                )}

                {/* Default Value */}
                {variable.defaultValue && (
                  <div className="mb-4 p-2 bg-gray-50 rounded border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Default Value:</p>
                    <p className="text-sm text-gray-700">{variable.defaultValue}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>Used {variable.usageCount} times</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openTestModal(variable)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Test
                  </button>
                  <button
                    onClick={() => openEditModal(variable)}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(variable)}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Variable Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  Add Custom Variable
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.key}
                    onChange={(e) =>
                      setForm({ ...form, key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })
                    }
                    placeholder="e.g., companyRevenue"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Letters, numbers, and underscores only. Will become{' '}
                    <code className="text-primary-600">{`{{${form.key || 'key'}}}`}</code>
                  </p>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="e.g., Company Revenue"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="custom">Custom</option>
                    <option value="lead">Lead</option>
                    <option value="company">Company</option>
                    <option value="link">Link</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Explain what this variable represents..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Default Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Value (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.defaultValue}
                    onChange={(e) => setForm({ ...form, defaultValue: e.target.value })}
                    placeholder="Fallback value if not populated"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Active (available in email editor)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddVariable}
                  disabled={saving || !form.key || !form.label}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Create Variable
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Variable Modal */}
        {showEditModal && selectedVariable && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit Variable
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedVariable(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Key (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Key (Cannot be changed)
                  </label>
                  <input
                    type="text"
                    value={selectedVariable.key}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>

                {/* Label */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="custom">Custom</option>
                    <option value="lead">Lead</option>
                    <option value="company">Company</option>
                    <option value="link">Link</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Default Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Value
                  </label>
                  <input
                    type="text"
                    value={form.defaultValue}
                    onChange={(e) => setForm({ ...form, defaultValue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="editIsActive" className="text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>

                {/* Usage Count Info */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    This variable is currently used in {selectedVariable.usageCount} places
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedVariable(null);
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateVariable}
                  disabled={saving || !form.label}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedVariable && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Delete Variable
                </h3>
                <p className="text-gray-600 text-center mb-6">
                  Are you sure you want to delete <strong>{selectedVariable.label}</strong>?
                  {selectedVariable.usageCount > 0 && (
                    <span className="text-red-600">
                      {' '}
                      This variable is used in {selectedVariable.usageCount} places and emails may
                      break.
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedVariable(null);
                    }}
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteVariable}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Variable Modal */}
        {showTestModal && selectedVariable && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  Test Variable
                </h2>
                <button
                  onClick={() => {
                    setShowTestModal(false);
                    setSelectedVariable(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variable
                  </label>
                  <code className="block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-primary-600">
                    {selectedVariable.value}
                  </code>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Value
                  </label>
                  <input
                    type="text"
                    value={testValue}
                    onChange={(e) => setTestValue(e.target.value)}
                    placeholder="Enter a test value..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Preview:</p>
                  <p className="text-base text-gray-900">
                    {testValue || selectedVariable.defaultValue || '[No value]'}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-1">
                    <strong>Example in email:</strong>
                  </p>
                  <p className="text-sm text-blue-900">
                    Hi {testValue || selectedVariable.defaultValue || selectedVariable.value}, welcome to our platform!
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowTestModal(false);
                    setSelectedVariable(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
