import React from 'react';
import { Users, Zap, Trash2, ExternalLink } from 'lucide-react';

interface Lead {
  id: string;
  companyName: string;
  website?: string;
  contactName?: string;
  email: string;
  industry?: string;
  status: string;
  qualityScore?: number;
  score?: number;
  createdAt?: string;
}

interface LeadsTableViewProps {
  leads: Lead[];
  filteredLeads: Lead[];
  selectedLeads: Set<string>;
  isLoading: boolean;
  searchQuery: string;
  filters: {
    industry: string;
    source: string;
  };
  onSelectAll: () => void;
  onSelectLead: (id: string) => void;
  onViewLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteSelected?: () => void;
  onGenerateClick: () => void;
  getStatusColor: (status: string) => string;
  getTierBadge: (score: number) => { label: string; className: string };
}

export const LeadsTableView: React.FC<LeadsTableViewProps> = ({
  leads,
  filteredLeads,
  selectedLeads,
  isLoading,
  searchQuery,
  filters,
  onSelectAll,
  onSelectLead,
  onViewLead,
  onEditLead,
  onGenerateClick,
  getStatusColor,
  getTierBadge,
  onDeleteSelected,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-center h-72">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading leads…</p>
          </div>
        </div>
      </div>
    );
  }

  if (filteredLeads.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-col items-center justify-center h-72 text-center px-6">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No leads found</h3>
          <p className="text-sm text-gray-500 mb-5 max-w-xs">
            {searchQuery || filters.industry !== 'all' || filters.source !== 'all'
              ? 'Try adjusting your filters or search query'
              : 'Get started by generating or importing your first leads'}
          </p>
          <button
            onClick={onGenerateClick}
            className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Add Leads
          </button>
        </div>
      </div>
    );
  }

  const getHeatBorder = (score: number) => {
    if (score >= 80) return 'border-l-red-400';
    if (score >= 60) return 'border-l-yellow-400';
    return 'border-l-blue-400';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Table Header Row */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Showing <span className="font-semibold text-gray-700">{filteredLeads.length}</span> of <span className="font-semibold text-gray-700">{leads.length}</span> leads
        </p>
        {selectedLeads.size > 0 && onDeleteSelected && (
          <button
            onClick={onDeleteSelected}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete {selectedLeads.size} selected
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="pl-4 pr-2 py-3 w-8">
                <input
                  type="checkbox"
                  checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                  onChange={onSelectAll}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Industry</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quality</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLeads.map((lead) => {
              const score = lead.qualityScore || lead.score || 0;
              const tierBadge = getTierBadge(score);
              const isSelected = selectedLeads.has(lead.id);
              return (
                <tr
                  key={lead.id}
                  className={`border-l-4 ${getHeatBorder(score)} hover:bg-gray-50 transition-colors ${isSelected ? 'bg-primary-50' : ''}`}
                >
                  <td className="pl-3 pr-2 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectLead(lead.id)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900">{lead.companyName}</div>
                    {lead.website && (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                        {lead.website.replace(/^https?:\/\//, '').split('/')[0]}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-800">{lead.contactName || <span className="text-gray-400 italic text-xs">No contact</span>}</div>
                    <div className="text-xs text-gray-500">{lead.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.industry || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${tierBadge.className}`}>
                        {tierBadge.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-14 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${score >= 80 ? 'bg-red-500' : score >= 60 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums">{score}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => onViewLead(lead)} className="text-xs font-medium text-primary-600 hover:text-primary-800">View</button>
                      <button onClick={() => onEditLead(lead)} className="text-xs font-medium text-gray-500 hover:text-gray-800">Edit</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
