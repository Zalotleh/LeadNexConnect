import { useState } from 'react';
import { X, Eye, EyeOff, ExternalLink, TestTube } from 'lucide-react';
import { configService, SmtpConfig } from '@/services/config.service';
import toast from 'react-hot-toast';
import InlineError from './InlineError';

interface SmtpConfigDialogProps {
  config: SmtpConfig | null;
  onClose: (saved: boolean) => void;
}

export default function SmtpConfigDialog({ config, onClose }: SmtpConfigDialogProps) {
  const isEditing = !!config;
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ provider?: string; host?: string; port?: string; fromEmail?: string }>({});

  const [formData, setFormData] = useState({
    provider: config?.provider || '',
    providerName: config?.providerName || '',
    host: config?.host || '',
    port: config?.port || 587,
    secure: config?.secure !== undefined ? config.secure : false,
    username: config?.username || '',
    password: config?.password || '',
    fromEmail: config?.fromEmail || '',
    fromName: config?.fromName || '',
    dailyLimit: config?.dailyLimit || 0,
    hourlyLimit: config?.hourlyLimit || 0,
    isActive: config?.isActive !== undefined ? config.isActive : true,
    isPrimary: config?.isPrimary !== undefined ? config.isPrimary : false,
    priority: config?.priority || 0,
    setupNotes: config?.setupNotes || '',
  });

  const providerOptions = [
    { value: 'gmail', label: 'Gmail', docUrl: 'https://support.google.com/mail/answer/7126229' },
    { value: 'outlook', label: 'Outlook', docUrl: 'https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings' },
    { value: 'sendgrid', label: 'SendGrid', docUrl: 'https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api' },
    { value: 'mailgun', label: 'Mailgun', docUrl: 'https://documentation.mailgun.com/en/latest/user_manual.html#smtp' },
    { value: 'aws_ses', label: 'AWS SES', docUrl: 'https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html' },
    { value: 'custom', label: 'Custom SMTP', docUrl: '' },
  ];

  const selectedProvider = providerOptions.find(opt => opt.value === formData.provider);

  const validateForm = () => {
    const newErrors: { provider?: string; host?: string; port?: string; fromEmail?: string } = {};
    
    if (!formData.provider) {
      newErrors.provider = 'Please select a provider';
    }
    
    if (!formData.host) {
      newErrors.host = 'SMTP host is required';
    }
    
    if (!formData.port) {
      newErrors.port = 'SMTP port is required';
    }
    
    if (!formData.fromEmail) {
      newErrors.fromEmail = 'From email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.fromEmail)) {
      newErrors.fromEmail = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    // Only validate host and port for connection test
    const testErrors: { host?: string; port?: string } = {};
    
    if (!formData.host) {
      testErrors.host = 'SMTP host is required for testing';
    }
    
    if (!formData.port) {
      testErrors.port = 'SMTP port is required for testing';
    }
    
    if (Object.keys(testErrors).length > 0) {
      setErrors({ ...errors, ...testErrors });
      return;
    }

    setTesting(true);
    try {
      const result = await configService.testSmtpConnection({
        host: formData.host,
        port: formData.port,
        secure: formData.secure,
        username: formData.username || undefined,
        password: formData.password || undefined,
      });

      if (result.success) {
        toast.success('SMTP connection successful!');
      } else {
        toast.error('SMTP connection failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Connection test failed');
      console.error(error);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (isEditing && config) {
        await configService.updateSmtpConfig(config.id, {
          provider: formData.provider,
          providerName: formData.providerName || undefined,
          host: formData.host,
          port: formData.port,
          secure: formData.secure,
          username: formData.username || undefined,
          password: formData.password || undefined,
          fromEmail: formData.fromEmail,
          fromName: formData.fromName || undefined,
          dailyLimit: formData.dailyLimit || 0,
          hourlyLimit: formData.hourlyLimit || 0,
          isActive: formData.isActive,
          isPrimary: formData.isPrimary,
          priority: formData.priority || 0,
          setupNotes: formData.setupNotes || undefined,
        });
      } else {
        await configService.createSmtpConfig({
          provider: formData.provider,
          providerName: formData.providerName || formData.provider,
          host: formData.host,
          port: formData.port,
          secure: formData.secure,
          username: formData.username || undefined,
          password: formData.password || undefined,
          fromEmail: formData.fromEmail,
          fromName: formData.fromName || undefined,
          dailyLimit: formData.dailyLimit || 0,
          hourlyLimit: formData.hourlyLimit || 0,
          isActive: formData.isActive,
          isPrimary: formData.isPrimary,
          priority: formData.priority || 0,
          setupNotes: formData.setupNotes || undefined,
        });
      }

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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-full md:max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit SMTP Configuration' : 'Add SMTP Configuration'}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider *
              </label>
              <select
                value={formData.provider}
                onChange={(e) => {
                  setFormData({ ...formData, provider: e.target.value });
                  setErrors({ ...errors, provider: undefined });
                }}
                className={`w-full px-4 py-2 border ${errors.provider ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500`}
                required
              >
                <option value="">Select a provider</option>
                {providerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <InlineError message={errors.provider || ''} visible={!!errors.provider} />
              {selectedProvider && selectedProvider.docUrl && (
                <a
                  href={selectedProvider.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Setup Documentation
                </a>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider Name
              </label>
              <input
                type="text"
                value={formData.providerName}
                onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., My Gmail Account"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Host *
              </label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => {
                  setFormData({ ...formData, host: e.target.value });
                  setErrors({ ...errors, host: undefined });
                }}
                className={`w-full px-4 py-2 border ${errors.host ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500`}
                placeholder="smtp.example.com"
                required
              />
              <InlineError message={errors.host || ''} visible={!!errors.host} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Port *
              </label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => {
                  setFormData({ ...formData, port: parseInt(e.target.value) || 587 });
                  setErrors({ ...errors, port: undefined });
                }}
                className={`w-full px-4 py-2 border ${errors.port ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500`}
                placeholder="587"
                min="1"
                max="65535"
                required
              />
              <InlineError message={errors.port || ''} visible={!!errors.port} />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.secure}
                onChange={(e) => setFormData({ ...formData, secure: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Use SSL/TLS (Port 465)</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Enable for port 465, disable for port 587 (STARTTLS)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="username@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !formData.host || !formData.port}
              className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Email *
              </label>
              <input
                type="email"
                value={formData.fromEmail}
                onChange={(e) => {
                  setFormData({ ...formData, fromEmail: e.target.value });
                  setErrors({ ...errors, fromEmail: undefined });
                }}
                className={`w-full px-4 py-2 border ${errors.fromEmail ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500`}
                placeholder="noreply@example.com"
                required
              />
              <InlineError message={errors.fromEmail || ''} visible={!!errors.fromEmail} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Name
              </label>
              <input
                type="text"
                value={formData.fromName}
                onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Your Company"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daily Limit
              </label>
              <input
                type="number"
                value={formData.dailyLimit}
                onChange={(e) => setFormData({ ...formData, dailyLimit: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Limit
              </label>
              <input
                type="number"
                value={formData.hourlyLimit}
                onChange={(e) => setFormData({ ...formData, hourlyLimit: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="50"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
                min="0"
                max="10"
              />
              <p className="text-xs text-gray-500 mt-1">Higher = used first</p>
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isPrimary}
                onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Primary Provider</span>
            </label>
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
