import React, { useState } from 'react';
import { X, Users, Target, Package, Loader, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { leadsAPI } from '@/services/api';
import toast from 'react-hot-toast';
import WorkflowSelector from '../WorkflowSelector';
import InlineError from '../InlineError';

interface Batch {
  id: number;
  name: string;
  leadCount: number;
  createdAt: string;
}

interface BatchAnalyticsModalProps {
  show: boolean;
  batch: Batch | null;
  onClose: () => void;
}

interface BatchCampaignModalProps {
  show: boolean;
  batch: Batch | null;
  onClose: () => void;
  onCreateCampaign: (data: { name: string; description?: string; batchId: number; workflowId?: string; startImmediately: boolean }) => Promise<void>;
}

interface BatchModalsProps {
  // Analytics Modal
  showAnalyticsModal: boolean;
  selectedBatchForAnalytics: Batch | null;
  onCloseAnalytics: () => void;

  // Campaign Modal
  showCampaignModal: boolean;
  selectedBatchForCampaign: Batch | null;
  onCloseCampaign: () => void;
  onCreateCampaign: (data: { name: string; description?: string; batchId: number; workflowId?: string; startImmediately: boolean }) => Promise<void>;
}

const BatchAnalyticsModal: React.FC<BatchAnalyticsModalProps> = ({ show, batch, onClose }) => {
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['batchAnalytics', batch?.id],
    queryFn: async () => {
      if (!batch) return null;
      const result = await leadsAPI.getBatchAnalytics(batch.id.toString());
      return result.data;
    },
    enabled: show && !!batch,
  });

  const analytics = analyticsData?.data;

  if (!show || !batch) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Batch Analytics</h2>
            <p className="text-sm text-gray-600 mt-1">{batch.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : analytics ? (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">Total Leads</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{analytics.metrics.totalLeads}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-medium text-green-900">Successful</p>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{analytics.metrics.successfulImports}</p>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-yellow-600" />
                    <p className="text-sm font-medium text-yellow-900">Duplicates</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-900">{analytics.metrics.duplicatesSkipped}</p>
                </div>

                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="w-4 h-4 text-red-600" />
                    <p className="text-sm font-medium text-red-900">Failed</p>
                  </div>
                  <p className="text-2xl font-bold text-red-900">{analytics.metrics.failedImports}</p>
                </div>
              </div>

              {/* Email Performance */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Emails Sent</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.metrics.emailsSent}</p>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Open Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.metrics.openRate}%</p>
                    <p className="text-xs text-gray-500 mt-1">{analytics.metrics.emailsOpened} opened</p>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Click Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.metrics.clickRate}%</p>
                    <p className="text-xs text-gray-500 mt-1">{analytics.metrics.emailsClicked} clicked</p>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Bounce Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.metrics.bounceRate}%</p>
                    <p className="text-xs text-gray-500 mt-1">{analytics.metrics.emailsBounced} bounced</p>
                  </div>
                </div>
              </div>

              {/* Lead Quality Breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Quality</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-900 mb-2">🔥 Hot Leads</p>
                    <p className="text-3xl font-bold text-red-900">{analytics.leadQuality.hot}</p>
                    <p className="text-xs text-red-700 mt-1">Score 80-100</p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-yellow-900 mb-2">⚡ Warm Leads</p>
                    <p className="text-3xl font-bold text-yellow-900">{analytics.leadQuality.warm}</p>
                    <p className="text-xs text-yellow-700 mt-1">Score 60-79</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-900 mb-2">❄️ Cold Leads</p>
                    <p className="text-3xl font-bold text-blue-900">{analytics.leadQuality.cold}</p>
                    <p className="text-xs text-blue-700 mt-1">Score 0-59</p>
                  </div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Status</h3>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {Object.entries(analytics.statusBreakdown).map(([status, count]: [string, any]) => (
                    <div key={status} className="border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1 capitalize">{status.replace('_', ' ')}</p>
                      <p className="text-xl font-bold text-gray-900">{count}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campaigns Using This Batch */}
              {analytics.campaigns && analytics.campaigns.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaigns Using This Batch</h3>
                  <div className="space-y-3">
                    {analytics.campaigns.map((campaign: any) => (
                      <div key={campaign.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{campaign.name}</h4>
                          <p className="text-sm text-gray-600">Status: <span className="capitalize">{campaign.status}</span></p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <p className="font-semibold text-gray-900">{campaign.emailsSent}</p>
                            <p className="text-xs text-gray-500">Sent</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-gray-900">{campaign.emailsOpened}</p>
                            <p className="text-xs text-gray-500">Opened</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-gray-900">{campaign.emailsClicked}</p>
                            <p className="text-xs text-gray-500">Clicked</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No analytics data available
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const BatchCampaignModal: React.FC<BatchCampaignModalProps> = ({ show, batch, onClose, onCreateCampaign }) => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string>('');
  
  if (!show || !batch) return null;

  const handleSubmit = async (startImmediately: boolean) => {
    const name = (document.getElementById('batchCampaignName') as HTMLInputElement).value;
    const description = (document.getElementById('batchCampaignDescription') as HTMLTextAreaElement).value;

    if (!name.trim()) {
      setNameError('Campaign name is required');
      return;
    }

    try {
      toast.loading(startImmediately ? 'Creating and starting campaign...' : 'Creating campaign...');
      await onCreateCampaign({
        name,
        description: description || undefined,
        batchId: batch.id,
        workflowId: selectedWorkflowId || undefined,
        startImmediately,
      });
      toast.dismiss();
      toast.success(startImmediately ? 'Campaign started successfully!' : 'Campaign created successfully!');
      onClose();
      window.location.href = '/campaigns';
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.response?.data?.error?.message || 'Failed to create campaign');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Start Campaign from Batch</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create a campaign for: <span className="font-semibold">{batch.name}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Batch Info</p>
                <p className="text-sm text-blue-700 mt-1">
                  {batch.leadCount} leads • 
                  Created {new Date(batch.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              defaultValue={`Campaign - ${batch.name}`}
              id="batchCampaignName"
              onChange={() => setNameError('')}
              className={`w-full px-4 py-2 border ${nameError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
              placeholder="e.g., NYC Hotels Outreach - March 2024"
            />
            <InlineError message={nameError} visible={!!nameError} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="batchCampaignDescription"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Describe your campaign objectives..."
            />
          </div>

          <div>
            <WorkflowSelector
              selectedWorkflowId={selectedWorkflowId}
              onSelect={setSelectedWorkflowId}
              label="Email Workflow (Optional)"
              placeholder="Select a workflow or send a single email"
              required={false}
            />
            <p className="text-xs text-gray-500 mt-1">
              Select a workflow to send multiple emails over time
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Emails will be personalized using AI based on each lead's information.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end p-6 border-t space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit(false)}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Create Campaign
          </button>
          <button
            onClick={() => handleSubmit(true)}
            className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Start Now
          </button>
        </div>
      </div>
    </div>
  );
};

export const BatchModals: React.FC<BatchModalsProps> = ({
  showAnalyticsModal,
  selectedBatchForAnalytics,
  onCloseAnalytics,
  showCampaignModal,
  selectedBatchForCampaign,
  onCloseCampaign,
  onCreateCampaign,
}) => {
  return (
    <>
      <BatchAnalyticsModal
        show={showAnalyticsModal}
        batch={selectedBatchForAnalytics}
        onClose={onCloseAnalytics}
      />
      <BatchCampaignModal
        show={showCampaignModal}
        batch={selectedBatchForCampaign}
        onClose={onCloseCampaign}
        onCreateCampaign={onCreateCampaign}
      />
    </>
  );
};
