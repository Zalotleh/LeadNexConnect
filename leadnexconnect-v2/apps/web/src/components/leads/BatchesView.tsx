import React from 'react';
import { Package, Loader, Zap, TrendingUp, Trash2, Upload, BarChart3, ArrowRight } from 'lucide-react';

interface Batch {
  id: number;
  name: string;
  leadCount: number;
  totalLeads?: number;
  successfulImports?: number;
  duplicatesSkipped?: number;
  source?: string;
  industry?: string;
  hotLeads?: number;
  warmLeads?: number;
  coldLeads?: number;
  createdAt: string;
}

interface BatchesViewProps {
  batches: Batch[];
  batchesLoading: boolean;
  generating: boolean;
  generateForm: { batchName: string };
  generationProgress: string;
  selectedBatches: Set<string | number>;
  onBatchClick: (batchId: number) => void;
  onStartCampaign: (batch: Batch) => void;
  onViewAnalytics: (batch: Batch) => void;
  onSelectBatch: (batchId: string | number) => void;
  onSelectAllBatches: () => void;
  onDeleteSelected: () => void;
}

const getSourceLabel = (source?: string) => {
  if (!source) return { label: 'Import', color: 'bg-blue-100 text-blue-700', icon: '📋' };
  if (source.includes('apollo')) return { label: 'Apollo.io', color: 'bg-purple-100 text-purple-700', icon: '🔮' };
  if (source.includes('google')) return { label: 'Google Places', color: 'bg-green-100 text-green-700', icon: '📍' };
  if (source.includes('people')) return { label: 'People Data Labs', color: 'bg-orange-100 text-orange-700', icon: '👥' };
  if (source.includes('linkedin')) return { label: 'LinkedIn', color: 'bg-blue-100 text-blue-700', icon: '💼' };
  return { label: 'Import', color: 'bg-gray-100 text-gray-700', icon: '📋' };
};

export const BatchesView: React.FC<BatchesViewProps> = ({
  batches,
  batchesLoading,
  generating,
  generateForm,
  generationProgress,
  selectedBatches,
  onBatchClick,
  onStartCampaign,
  onViewAnalytics,
  onSelectBatch,
  onSelectAllBatches,
  onDeleteSelected,
}) => {
  if (batchesLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk action bar */}
      {selectedBatches.size > 0 && (
        <div className="bg-primary-600 text-white rounded-xl px-5 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selectedBatches.size} batch{selectedBatches.size !== 1 ? 'es' : ''} selected</span>
          <div className="flex items-center gap-3">
            <button onClick={onSelectAllBatches} className="text-sm text-primary-100 hover:text-white">Clear</button>
            <button
              onClick={onDeleteSelected}
              className="px-4 py-1.5 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Select All + count */}
      {batches.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedBatches.size === batches.length && batches.length > 0}
              onChange={onSelectAllBatches}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600">Select all batches</span>
          </label>
          <span className="text-xs text-gray-400">• {batches.length} total</span>
        </div>
      )}

      {/* Generating card */}
      {generating && (
        <div className="bg-white rounded-xl border-2 border-primary-400 shadow-sm p-5 flex items-center gap-5">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Loader className="w-6 h-6 animate-spin text-primary-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-primary-900">{generateForm.batchName || 'Generating…'}</span>
              <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full animate-pulse">In Progress</span>
            </div>
            <p className="text-xs text-gray-500">{generationProgress || 'Searching for leads…'}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {batches.length === 0 && !generating && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No batches yet</h3>
          <p className="text-sm text-gray-500">Generate or import leads to create your first batch</p>
        </div>
      )}

      {/* Batch cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {batches.map((batch) => {
          const sourceInfo = getSourceLabel((batch as any).source || (batch as any).importSettings?.sources?.[0]);
          const total = batch.leadCount || 0;
          const hot = batch.hotLeads || 0;
          const warm = batch.warmLeads || 0;
          const cold = batch.coldLeads || (total - hot - warm);
          const hasHeat = total > 0;
          const hotPct = hasHeat ? (hot / total) * 100 : 0;
          const warmPct = hasHeat ? (warm / total) * 100 : 0;
          const coldPct = hasHeat ? Math.max(0, 100 - hotPct - warmPct) : 0;
          const isSelected = selectedBatches.has(batch.id);

          return (
            <div
              key={batch.id}
              className={`bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all flex flex-col ${
                isSelected ? 'border-primary-400' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelectBatch(batch.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 flex-shrink-0"
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onBatchClick(batch.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 hover:text-primary-700">{batch.name}</h3>
                    <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${sourceInfo.color}`}>
                      {sourceInfo.icon} {sourceInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(batch.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Lead count */}
              <div className="px-4 pb-3 cursor-pointer" onClick={() => onBatchClick(batch.id)}>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-gray-900">{total}</span>
                  <span className="text-sm text-gray-500 pb-1">leads</span>
                </div>

                {/* Tier distribution mini bar */}
                {hasHeat && (
                  <div className="mt-3">
                    <div className="flex rounded-full overflow-hidden h-2 bg-gray-100">
                      {hotPct > 0 && <div className="bg-red-400 transition-all" style={{ width: `${hotPct}%` }} title={`${hot} hot`} />}
                      {warmPct > 0 && <div className="bg-yellow-400 transition-all" style={{ width: `${warmPct}%` }} title={`${warm} warm`} />}
                      {coldPct > 0 && <div className="bg-blue-400 transition-all" style={{ width: `${coldPct}%` }} title={`${cold} cold`} />}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {hot > 0 && <span className="text-[10px] text-gray-500 flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full inline-block" />{hot} hot</span>}
                      {warm > 0 && <span className="text-[10px] text-gray-500 flex items-center gap-1"><span className="w-2 h-2 bg-yellow-400 rounded-full inline-block" />{warm} warm</span>}
                      {cold > 0 && <span className="text-[10px] text-gray-500 flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-full inline-block" />{cold} cold</span>}
                    </div>
                  </div>
                )}

                {/* Import stats — only show when duplicates were skipped (meaningful breakdown) */}
                {(batch.duplicatesSkipped || 0) > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-[10px] text-gray-500">
                      {(batch.successfulImports || 0) > 0 && (
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" />{batch.successfulImports} added</span>
                      )}
                      {(batch.duplicatesSkipped || 0) > 0 && (
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-400 rounded-full" />{batch.duplicatesSkipped} dupes</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="mt-auto px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-xl flex items-center gap-2">
                <button
                  onClick={() => onBatchClick(batch.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Package className="w-3.5 h-3.5" />
                  View Leads
                </button>
                <button
                  onClick={() => onViewAnalytics(batch)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onStartCampaign(batch)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Run Outreach
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
