import React from 'react';
import { X, Plus, Loader } from 'lucide-react';

// Lead interface
interface Lead {
  id: string;
  companyName: string;
  contactName?: string;
  email: string;
  phone?: string;
  website?: string;
  industry?: string;
  city?: string;
  country?: string;
  jobTitle?: string;
  companySize?: string;
  status: string;
  source?: string;
  sourceType?: string;
  qualityScore?: number;
  createdAt?: string;
}

// Interface for lead form data
interface LeadFormData {
  companyName: string;
  contactName?: string;
  email: string;
  phone?: string;
  website?: string;
  industry?: string;
  city?: string;
  country?: string;
  jobTitle?: string;
  companySize?: string;
  status?: string;
}

interface LeadModalsProps {
  // View Modal
  showViewModal: boolean;
  selectedLead: Lead | null;
  onCloseView: () => void;
  onEditFromView: (lead: Lead) => void;
  getStatusColor: (status: string) => string;

  // Edit Modal
  showEditModal: boolean;
  editForm: Partial<LeadFormData>;
  onCloseEdit: () => void;
  onEditFormChange: (form: Partial<LeadFormData>) => void;
  onSaveEdit: () => void;

  // Create Modal
  showCreateModal: boolean;
  createForm: LeadFormData;
  isCreating: boolean;
  onCloseCreate: () => void;
  onCreateFormChange: (form: LeadFormData) => void;
  onCreateLead: () => void;
  
  // Industry data
  industriesByCategory: Record<string, Array<{ value: string; label: string }>>;
}

export const LeadModals: React.FC<LeadModalsProps> = ({
  showViewModal,
  selectedLead,
  onCloseView,
  onEditFromView,
  getStatusColor,
  showEditModal,
  editForm,
  onCloseEdit,
  onEditFormChange,
  onSaveEdit,
  showCreateModal,
  createForm,
  isCreating,
  onCloseCreate,
  onCreateFormChange,
  onCreateLead,
  industriesByCategory,
}) => {
  return (
    <>
      {/* View Lead Modal */}
      {showViewModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Lead Details</h2>
              <button
                onClick={onCloseView}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Company Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Company Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLead.companyName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Industry</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLead.industry || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Website</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLead.website ? (
                        <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                          {selectedLead.website}
                        </a>
                      ) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Company Size</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLead.companySize || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Contact Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLead.contactName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Job Title</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLead.jobTitle || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLead.email || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLead.phone || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">City</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLead.city || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Country</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLead.country || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Lead Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Quality Score</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLead.qualityScore || 0}/100</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <p className="mt-1">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedLead.status)}`}>
                        {selectedLead.status?.toUpperCase()}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Source</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLead.source || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Source Type</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLead.sourceType === 'manual_import' ? 'Imported' : 'Generated'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-6 border-t space-x-3">
              <button
                onClick={() => onEditFromView(selectedLead)}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Edit Lead
              </button>
              <button
                onClick={onCloseView}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Edit Lead</h2>
              <button
                onClick={onCloseEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Company Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={editForm.companyName || ''}
                      onChange={(e) => onEditFormChange({ ...editForm, companyName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <input
                      type="text"
                      value={editForm.industry || ''}
                      onChange={(e) => onEditFormChange({ ...editForm, industry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={editForm.website || ''}
                      onChange={(e) => onEditFormChange({ ...editForm, website: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                    <select
                      value={editForm.companySize || ''}
                      onChange={(e) => onEditFormChange({ ...editForm, companySize: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10</option>
                      <option value="11-50">11-50</option>
                      <option value="51-200">51-200</option>
                      <option value="201-500">201-500</option>
                      <option value="501-1000">501-1000</option>
                      <option value="1000+">1000+</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={editForm.contactName || ''}
                      onChange={(e) => onEditFormChange({ ...editForm, contactName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={editForm.jobTitle || ''}
                      onChange={(e) => onEditFormChange({ ...editForm, jobTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => onEditFormChange({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => onEditFormChange({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={editForm.city || ''}
                      onChange={(e) => onEditFormChange({ ...editForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={editForm.country || ''}
                      onChange={(e) => onEditFormChange({ ...editForm, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editForm.status || ''}
                      onChange={(e) => onEditFormChange({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="unqualified">Unqualified</option>
                      <option value="responded">Responded</option>
                      <option value="interested">Interested</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-6 border-t space-x-3">
              <button
                onClick={onCloseEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={onSaveEdit}
                disabled={!editForm.companyName}
                className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">Create New Lead</h2>
              <button
                onClick={onCloseCreate}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Company Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={createForm.companyName}
                      onChange={(e) => onCreateFormChange({ ...createForm, companyName: e.target.value })}
                      placeholder="e.g., Acme Corporation"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <select
                      value={createForm.industry}
                      onChange={(e) => onCreateFormChange({ ...createForm, industry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Industry</option>
                      {Object.entries(industriesByCategory).map(([category, items]) => (
                        <optgroup key={category} label={category}>
                          {items.map((industry) => (
                            <option key={industry.value} value={industry.value}>
                              {industry.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                    <select
                      value={createForm.companySize}
                      onChange={(e) => onCreateFormChange({ ...createForm, companySize: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="501+">501+ employees</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={createForm.website}
                      onChange={(e) => onCreateFormChange({ ...createForm, website: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={createForm.contactName}
                      onChange={(e) => onCreateFormChange({ ...createForm, contactName: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={createForm.jobTitle}
                      onChange={(e) => onCreateFormChange({ ...createForm, jobTitle: e.target.value })}
                      placeholder="CEO"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => onCreateFormChange({ ...createForm, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={createForm.phone}
                      onChange={(e) => onCreateFormChange({ ...createForm, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={createForm.city}
                      onChange={(e) => onCreateFormChange({ ...createForm, city: e.target.value })}
                      placeholder="New York"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={createForm.country}
                      onChange={(e) => onCreateFormChange({ ...createForm, country: e.target.value })}
                      placeholder="United States"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Use this to create test leads for email campaigns. Make sure to use a real email address you have access to for testing.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-6 border-t space-x-3">
              <button
                onClick={onCloseCreate}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={onCreateLead}
                disabled={!createForm.companyName || !createForm.email || isCreating}
                className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Lead
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
