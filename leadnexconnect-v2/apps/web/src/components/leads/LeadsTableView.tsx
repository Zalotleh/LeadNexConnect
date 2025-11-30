import React from 'react';
import { Users, Zap } from 'lucide-react';

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
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-gray-500">Loading leads...</div>
        </div>
      </div>
    );
  }

  if (filteredLeads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <Users className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || filters.industry !== 'all' || filters.source !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by importing or generating your first leads'}
          </p>
          <button 
            onClick={onGenerateClick}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Generate Leads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{filteredLeads.length}</span> of <span className="font-medium">{leads.length}</span> leads
        </p>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                onChange={onSelectAll}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Company
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Industry
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tier
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Score
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredLeads.map((lead) => {
            const score = lead.qualityScore || lead.score || 0;
            const tierBadge = getTierBadge(score);
            return (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedLeads.has(lead.id)}
                    onChange={() => onSelectLead(lead.id)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{lead.companyName}</div>
                  <div className="text-sm text-gray-500">{lead.website || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{lead.contactName}</div>
                  <div className="text-sm text-gray-500">{lead.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {lead.industry || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      lead.status
                    )}`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${tierBadge.className}`}
                  >
                    {tierBadge.label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-medium text-gray-900">{score}/100</div>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          score >= 80 ? 'bg-red-500' : score >= 60 ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button 
                    onClick={() => onViewLead(lead)}
                    className="text-primary-600 hover:text-primary-900 mr-3"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => onEditLead(lead)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
