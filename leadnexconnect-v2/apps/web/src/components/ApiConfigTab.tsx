import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ExternalLink, Power, PowerOff } from 'lucide-react';
import { configService, ApiConfig } from '@/services/config.service';
import toast from 'react-hot-toast';
import ApiConfigDialog from './ApiConfigDialog';
import ConfirmDialog from './ConfirmDialog';

export default function ApiConfigTab() {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await configService.getAllApiConfigs();
      setConfigs(data);
    } catch (error: any) {
      toast.error('Failed to load API configurations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingConfig(null);
    setDialogOpen(true);
  };

  const handleEdit = async (apiSource: string) => {
    try {
      const config = await configService.getApiConfig(apiSource, true);
      setEditingConfig(config);
      setDialogOpen(true);
    } catch (error: any) {
      toast.error('Failed to load configuration');
      console.error(error);
    }
  };

  const handleDelete = (apiSource: string) => {
    setConfigToDelete(apiSource);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!configToDelete) return;

    try {
      await configService.deleteApiConfig(configToDelete);
      toast.success('API configuration deleted successfully');
      loadConfigs();
    } catch (error: any) {
      toast.error('Failed to delete configuration');
      console.error(error);
    } finally {
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    }
  };

  const handleDialogClose = (saved: boolean) => {
    setDialogOpen(false);
    setEditingConfig(null);
    if (saved) {
      loadConfigs();
    }
  };

  const getApiSourceLabel = (source: string): string => {
    const labels: Record<string, string> = {
      apollo: 'Apollo.io',
      hunter: 'Hunter.io',
      google_places: 'Google Places',
      peopledatalabs: 'PeopleDataLabs',
      google_custom_search: 'Google Custom Search',
    };
    return labels[source] || source;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">API Configurations</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure your lead generation API providers and their limits
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add API Configuration
        </button>
      </div>

      {configs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No API configurations yet. Add your first configuration to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {configs.map((config) => (
            <div
              key={config.id}
              className={`bg-white rounded-lg shadow-sm border-2 ${
                config.isActive ? 'border-green-200' : 'border-gray-200'
              } hover:shadow-md transition-shadow`}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {getApiSourceLabel(config.apiSource)}
                      {config.isActive ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                          <Power className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full">
                          <PowerOff className="w-3 h-3 mr-1" />
                          Inactive
                        </span>
                      )}
                    </h3>
                    {config.planName && (
                      <p className="text-sm text-gray-500 mt-1">{config.planName}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(config.apiSource)}
                      className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(config.apiSource)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Monthly Limit:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {config.monthlyLimit?.toLocaleString() || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Cost per Lead:</span>
                    <span className="text-sm font-medium text-gray-900">
                      ${config.costPerLead || '0.00'}
                    </span>
                  </div>
                  {config.costPerAPICall && parseFloat(config.costPerAPICall) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cost per API Call:</span>
                      <span className="text-sm font-medium text-gray-900">
                        ${config.costPerAPICall}
                      </span>
                    </div>
                  )}
                  {config.apiKey && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">API Key:</span>
                      <span className="text-sm font-mono text-gray-500">{config.apiKey}</span>
                    </div>
                  )}
                  {config.apiSecret && config.apiSource === 'google_custom_search' && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Search Engine ID:</span>
                      <span className="text-sm font-mono text-gray-500">{config.apiSecret}</span>
                    </div>
                  )}
                  {config.apiSecret && config.apiSource !== 'google_custom_search' && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">API Secret:</span>
                      <span className="text-sm font-mono text-gray-500">{config.apiSecret}</span>
                    </div>
                  )}
                </div>

                {config.documentationUrl && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <a
                      href={config.documentationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                      API Documentation
                    </a>
                  </div>
                )}

                {config.setupNotes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">{config.setupNotes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <ApiConfigDialog
          config={editingConfig}
          onClose={handleDialogClose}
        />
      )}

      {deleteDialogOpen && (
        <ConfirmDialog
          isOpen={deleteDialogOpen}
          title="Delete API Configuration"
          message={`Are you sure you want to delete the ${configToDelete ? getApiSourceLabel(configToDelete) : ''} configuration? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          onConfirm={confirmDelete}
          onClose={() => {
            setDeleteDialogOpen(false);
            setConfigToDelete(null);
          }}
        />
      )}
    </div>
  );
}
