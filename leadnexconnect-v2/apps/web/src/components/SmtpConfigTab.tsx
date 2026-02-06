import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ExternalLink, Power, PowerOff, Star, TestTube } from 'lucide-react';
import { configService, SmtpConfig } from '@/services/config.service';
import toast from 'react-hot-toast';
import SmtpConfigDialog from './SmtpConfigDialog';
import ConfirmDialog from './ConfirmDialog';

export default function SmtpConfigTab() {
  const [configs, setConfigs] = useState<SmtpConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SmtpConfig | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await configService.getAllSmtpConfigs();
      setConfigs(data);
    } catch (error: any) {
      toast.error('Failed to load SMTP configurations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingConfig(null);
    setDialogOpen(true);
  };

  const handleEdit = async (id: string) => {
    try {
      const config = await configService.getSmtpConfig(id, true);
      setEditingConfig(config);
      setDialogOpen(true);
    } catch (error: any) {
      toast.error('Failed to load configuration');
      console.error(error);
    }
  };

  const handleDelete = (id: string) => {
    setConfigToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!configToDelete) return;

    try {
      await configService.deleteSmtpConfig(configToDelete);
      toast.success('SMTP configuration deleted successfully');
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

  const getProviderLabel = (provider: string): string => {
    const labels: Record<string, string> = {
      gmail: 'Gmail',
      outlook: 'Outlook',
      sendgrid: 'SendGrid',
      mailgun: 'Mailgun',
      aws_ses: 'AWS SES',
    };
    return labels[provider] || provider;
  };

  const getUsageColor = (sent: number, limit: number): string => {
    if (limit === 0) return 'text-gray-500';
    const percentage = (sent / limit) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
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
          <h2 className="text-xl font-semibold text-gray-900">SMTP Configurations</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure your email providers with automatic failover support
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add SMTP Configuration
        </button>
      </div>

      {configs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No SMTP configurations yet. Add your first configuration to start sending emails.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {configs.map((config) => (
            <div
              key={config.id}
              className={`bg-white rounded-lg shadow-sm border-2 ${
                config.isActive ? 'border-green-200' : 'border-gray-200'
              } ${config.isPrimary ? 'ring-2 ring-primary-500' : ''} hover:shadow-md transition-shadow`}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                      {config.providerName || getProviderLabel(config.provider)}
                      {config.isPrimary && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          Primary
                        </span>
                      )}
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
                    <p className="text-sm text-gray-500 mt-1">{config.fromEmail}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(config.id)}
                      className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Host</span>
                      <p className="text-sm font-medium text-gray-900 truncate">{config.host}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Port</span>
                      <p className="text-sm font-medium text-gray-900">{config.port}</p>
                    </div>
                  </div>

                  {config.priority !== undefined && config.priority > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Priority:</span>
                      <span className="text-sm font-medium text-gray-900">Level {config.priority}</span>
                    </div>
                  )}

                  {config.dailyLimit && config.dailyLimit > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Daily Usage:</span>
                        <span className={`text-sm font-medium ${getUsageColor(config.emailsSentToday || 0, config.dailyLimit)}`}>
                          {config.emailsSentToday || 0} / {config.dailyLimit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            ((config.emailsSentToday || 0) / config.dailyLimit) * 100 >= 90
                              ? 'bg-red-600'
                              : ((config.emailsSentToday || 0) / config.dailyLimit) * 100 >= 70
                              ? 'bg-yellow-600'
                              : 'bg-green-600'
                          }`}
                          style={{ width: `${Math.min(((config.emailsSentToday || 0) / config.dailyLimit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {config.hourlyLimit && config.hourlyLimit > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Hourly Usage:</span>
                        <span className={`text-sm font-medium ${getUsageColor(config.emailsSentThisHour || 0, config.hourlyLimit)}`}>
                          {config.emailsSentThisHour || 0} / {config.hourlyLimit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            ((config.emailsSentThisHour || 0) / config.hourlyLimit) * 100 >= 90
                              ? 'bg-red-600'
                              : ((config.emailsSentThisHour || 0) / config.hourlyLimit) * 100 >= 70
                              ? 'bg-yellow-600'
                              : 'bg-green-600'
                          }`}
                          style={{ width: `${Math.min(((config.emailsSentThisHour || 0) / config.hourlyLimit) * 100, 100)}%` }}
                        />
                      </div>
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
                      Setup Documentation
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
        <SmtpConfigDialog
          config={editingConfig}
          onClose={handleDialogClose}
        />
      )}

      {deleteDialogOpen && (
        <ConfirmDialog
          isOpen={deleteDialogOpen}
          title="Delete SMTP Configuration"
          message="Are you sure you want to delete this SMTP configuration? This action cannot be undone."
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
