import { useState } from 'react'
import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import { leadsAPI } from '@/services/api'
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MapPin,
  User,
  Briefcase,
  Calendar,
  TrendingUp,
  Target,
  Package,
  Edit,
  Trash2,
  Loader,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  MessageSquare,
  Clock,
  BarChart3,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function LeadDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const queryClient = useQueryClient()

  const [showEditModal, setShowEditModal] = useState(false)

  // Fetch lead details
  const { data: leadData, isLoading, refetch } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const result = await leadsAPI.getLeadById(id as string)
      return result.data?.data
    },
    enabled: !!id,
  })

  const lead = leadData

  const getTierBadge = (score: number) => {
    if (score >= 80)
      return { label: 'HOT LEAD', className: 'bg-red-100 text-red-800 border-red-300', icon: TrendingUp }
    if (score >= 60)
      return { label: 'WARM LEAD', className: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Target }
    return { label: 'COLD LEAD', className: 'bg-blue-100 text-blue-800 border-blue-300', icon: Package }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: any = {
      new: { label: 'New', className: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      contacted: { label: 'Contacted', className: 'bg-yellow-100 text-yellow-800', icon: Mail },
      qualified: { label: 'Qualified', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      responded: { label: 'Responded', className: 'bg-purple-100 text-purple-800', icon: MessageSquare },
      interested: { label: 'Interested', className: 'bg-indigo-100 text-indigo-800', icon: Star },
      unqualified: { label: 'Unqualified', className: 'bg-gray-100 text-gray-800', icon: XCircle },
    }
    return statusMap[status] || statusMap.new
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead?')) return

    try {
      await leadsAPI.deleteLead(id as string)
      toast.success('Lead deleted successfully')
      router.push('/leads')
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete lead')
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader className="w-12 h-12 animate-spin text-primary-600" />
        </div>
      </Layout>
    )
  }

  if (!lead) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-screen">
          <User className="w-16 h-16 text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lead Not Found</h2>
          <button
            onClick={() => router.push('/leads')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Leads
          </button>
        </div>
      </Layout>
    )
  }

  const tier = getTierBadge(lead.qualityScore || 0)
  const status = getStatusBadge(lead.status)
  const TierIcon = tier.icon
  const StatusIcon = status.icon

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{lead.companyName}</h1>
                <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full border-2 ${tier.className}`}>
                  <TierIcon className="w-4 h-4" />
                  {tier.label}
                </span>
                <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full ${status.className}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {status.label}
                </span>
              </div>
              {lead.industry && (
                <p className="text-gray-600 text-lg">{lead.industry}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lead.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <a href={`mailto:${lead.email}`} className="text-primary-600 hover:underline">
                        {lead.email}
                      </a>
                    </div>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <a href={`tel:${lead.phone}`} className="text-primary-600 hover:underline">
                        {lead.phone}
                      </a>
                    </div>
                  </div>
                )}
                {lead.website && (
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Website</p>
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                        {lead.website}
                      </a>
                    </div>
                  </div>
                )}
                {(lead.city || lead.country) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="text-gray-900">
                        {[lead.city, lead.country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {lead.address && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-1">Full Address</p>
                  <p className="text-gray-900">{lead.address}</p>
                </div>
              )}
            </div>

            {/* Contact Person */}
            {(lead.contactName || lead.jobTitle) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Person</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lead.contactName && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="text-gray-900">{lead.contactName}</p>
                      </div>
                    </div>
                  )}
                  {lead.jobTitle && (
                    <div className="flex items-start gap-3">
                      <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Job Title</p>
                        <p className="text-gray-900">{lead.jobTitle}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {lead.notes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Notes</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quality Score */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quality Score</h3>
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke={lead.qualityScore >= 80 ? '#EF4444' : lead.qualityScore >= 60 ? '#F59E0B' : '#3B82F6'}
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(lead.qualityScore / 100) * 351.86} 351.86`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{lead.qualityScore || 0}</span>
                    <span className="text-xs text-gray-600">out of 100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Engagement Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Engagement</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Emails Sent</span>
                  <span className="text-lg font-semibold text-gray-900">{lead.emailsSent || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Emails Opened</span>
                  <span className="text-lg font-semibold text-gray-900">{lead.emailsOpened || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Emails Clicked</span>
                  <span className="text-lg font-semibold text-gray-900">{lead.emailsClicked || 0}</span>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Metadata</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Source</p>
                  <p className="text-gray-900 capitalize">{lead.source || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Source Type</p>
                  <p className="text-gray-900 capitalize">{lead.sourceType || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-gray-900">
                    {new Date(lead.createdAt).toLocaleDateString()} at{' '}
                    {new Date(lead.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                {lead.lastContactedAt && (
                  <div>
                    <p className="text-sm text-gray-600">Last Contacted</p>
                    <p className="text-gray-900">
                      {new Date(lead.lastContactedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Fields */}
            {lead.customFields && Object.keys(lead.customFields).length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Additional Info</h3>
                <div className="space-y-2">
                  {lead.customFields.googleRating && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Google Rating</span>
                      <span className="text-gray-900">⭐ {lead.customFields.googleRating}</span>
                    </div>
                  )}
                  {lead.customFields.googleReviewCount && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Reviews</span>
                      <span className="text-gray-900">{lead.customFields.googleReviewCount}</span>
                    </div>
                  )}
                  {lead.customFields.hasOnlineBooking && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Online Booking</span>
                      <span className="text-green-600 font-medium">✓ Yes</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && (
          <EditLeadModal
            lead={lead}
            onClose={() => setShowEditModal(false)}
            onSuccess={() => {
              setShowEditModal(false)
              refetch()
            }}
          />
        )}
      </div>
    </Layout>
  )
}

// Edit Lead Modal Component
function EditLeadModal({
  lead,
  onClose,
  onSuccess,
}: {
  lead: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    companyName: lead.companyName || '',
    email: lead.email || '',
    phone: lead.phone || '',
    website: lead.website || '',
    contactName: lead.contactName || '',
    jobTitle: lead.jobTitle || '',
    city: lead.city || '',
    country: lead.country || '',
    industry: lead.industry || '',
    status: lead.status || 'new',
    notes: lead.notes || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!formData.companyName.trim()) {
      toast.error('Please enter a company name')
      return
    }

    try {
      setLoading(true)
      await leadsAPI.updateLead(lead.id, formData)
      toast.success('Lead updated successfully!')
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">Edit Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="responded">Responded</option>
                <option value="interested">Interested</option>
                <option value="unqualified">Unqualified</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.companyName.trim()}
            className="px-6 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                Update Lead
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
