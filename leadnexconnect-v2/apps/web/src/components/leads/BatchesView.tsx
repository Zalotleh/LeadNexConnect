import React from 'react';
import { Package, Loader, Zap, TrendingUp } from 'lucide-react';

interface Batch {
  id: number;
  name: string;
  leadCount: number;
  totalLeads?: number;
  successfulImports?: number;
  duplicatesSkipped?: number;
  createdAt: string;
}

interface BatchesViewProps {
  batches: Batch[];
  batchesLoading: boolean;
  generating: boolean;
  generateForm: {
    batchName: string;
  };
  generationProgress: string;
  onBatchClick: (batchId: number) => void;
  onStartCampaign: (batch: Batch) => void;
  onViewAnalytics: (batch: Batch) => void;
}

export const BatchesView: React.FC<BatchesViewProps> = ({
  batches,
  batchesLoading,
  generating,
  generateForm,
  generationProgress,
  onBatchClick,
  onStartCampaign,
  onViewAnalytics,
}) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6 space-y-4">
        {/* Loading Card - Show when generating */}
        {generating && (
          <div className="border-2 border-primary-500 rounded-lg overflow-hidden bg-primary-50 animate-pulse">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative">
                  <Loader className="w-8 h-8 animate-spin text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-primary-900 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Generating: {generateForm.batchName}
                  </h3>
                  <p className="text-sm text-primary-700 mt-1">
                    {generationProgress || 'Preparing to generate leads...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <Loader className="w-8 h-8 animate-spin text-primary-600" />
                  </div>
                  <p className="text-xs text-primary-700 mt-2">Processing...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {batchesLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : batches.length === 0 && !generating ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Batches Yet</h3>
            <p className="text-gray-600">Generate leads with batch names to see them organized here</p>
          </div>
        ) : (
          batches.map((batch: Batch) => {
            return (
              <div key={batch.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {/* Batch Header */}
                <div 
                  className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => onBatchClick(batch.id)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Package className="w-5 h-5 text-primary-600" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {batch.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Generated on {new Date(batch.createdAt).toLocaleDateString()} at {new Date(batch.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary-600">{batch.leadCount}</p>
                      <p className="text-xs text-gray-600">Total Leads</p>
                    </div>
                    {batch.totalLeads && (
                      <>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{batch.successfulImports || 0}</p>
                          <p className="text-xs text-gray-600">Imported</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-600">{batch.duplicatesSkipped || 0}</p>
                          <p className="text-xs text-gray-600">Duplicates</p>
                        </div>
                      </>
                    )}
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartCampaign(batch);
                        }}
                        className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                        title="Start Campaign"
                      >
                        <Zap className="w-4 h-4" />
                        Start Campaign
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewAnalytics(batch);
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                        title="View Analytics"
                      >
                        <TrendingUp className="w-4 h-4" />
                        Analytics
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Import Status Bar - Only show for imported batches with statistics */}
                {batch.totalLeads && batch.totalLeads > 0 && (
                  <div className="px-4 py-3 bg-white border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">Import Status</span>
                      <span className="text-xs text-gray-500">
                        {batch.totalLeads} total processed
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div className="h-full flex">
                        {/* Successful portion */}
                        {(batch.successfulImports || 0) > 0 && (
                          <div 
                            className="bg-green-500 flex items-center justify-center"
                            style={{ width: `${((batch.successfulImports || 0) / batch.totalLeads) * 100}%` }}
                            title={`${batch.successfulImports || 0} successfully imported`}
                          />
                        )}
                        {/* Duplicates portion */}
                        {(batch.duplicatesSkipped || 0) > 0 && (
                          <div 
                            className="bg-yellow-500 flex items-center justify-center"
                            style={{ width: `${((batch.duplicatesSkipped || 0) / batch.totalLeads) * 100}%` }}
                            title={`${batch.duplicatesSkipped || 0} duplicates skipped`}
                          />
                        )}
                        {/* Failed portion */}
                        {(() => {
                          const failed = batch.totalLeads - (batch.successfulImports || 0) - (batch.duplicatesSkipped || 0);
                          return failed > 0 ? (
                            <div 
                              className="bg-red-500 flex items-center justify-center"
                              style={{ width: `${(failed / batch.totalLeads) * 100}%` }}
                              title={`${failed} failed to import`}
                            />
                          ) : null;
                        })()}
                      </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      {(batch.successfulImports || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-gray-700">{batch.successfulImports} Added</span>
                        </div>
                      )}
                      {(batch.duplicatesSkipped || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-gray-700">{batch.duplicatesSkipped} Duplicates</span>
                        </div>
                      )}
                      {(() => {
                        const failed = batch.totalLeads - (batch.successfulImports || 0) - (batch.duplicatesSkipped || 0);
                        return failed > 0 ? (
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-gray-700">{failed} Failed</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    
                    {/* Warning message if all duplicates */}
                    {(batch.successfulImports || 0) === 0 && (batch.duplicatesSkipped || 0) > 0 && (
                      <div className="mt-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-xs text-yellow-800">
                          ⚠️ All leads in this batch were duplicates. No new leads were added to the system.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
