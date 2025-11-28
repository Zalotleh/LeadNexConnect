import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import leadsService, { Lead } from '@/services/leads.service'
import { leadsAPI } from '@/services/api'
import { Plus, Filter, Download, Upload, Users, Zap, X, Search, Loader, TrendingUp, Target } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

export default function Leads() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    industry: 'all',
    minScore: 0,
    maxScore: 100,
    verificationStatus: 'all',
    source: 'all',
  })
  
  const [generateForm, setGenerateForm] = useState({
    source: 'apollo' as 'apollo' | 'google_places' | 'peopledatalabs' | 'linkedin',
    industry: '',
    country: 'United States',
    city: '',
    maxResults: 50,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leads', statusFilter, filters, searchQuery],
    queryFn: async () => {
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (filters.industry !== 'all') params.industry = filters.industry
      if (filters.source !== 'all') params.source = filters.source
      if (searchQuery) params.search = searchQuery
      return await leadsService.getAll(params)
    },
  })

  const leads: Lead[] = data?.data || []

  // Client-side filtering for score and tier
  const filteredLeads = leads.filter(lead => {
    const score = lead.qualityScore || lead.score || 0
    
    // Score range filter
    if (score < filters.minScore || score > filters.maxScore) return false
    
    // Tier filter
    if (tierFilter !== 'all') {
      if (tierFilter === 'hot' && score < 80) return false
      if (tierFilter === 'warm' && (score < 60 || score >= 80)) return false
      if (tierFilter === 'cold' && score >= 60) return false
    }
    
    return true
  })

  const getTierBadge = (score: number) => {
    if (score >= 80) return { label: 'HOT', className: 'bg-red-100 text-red-800' }
    if (score >= 60) return { label: 'WARM', className: 'bg-yellow-100 text-yellow-800' }
    return { label: 'COLD', className: 'bg-blue-100 text-blue-800' }
  }

  const industries = [
    'Restaurant', 'Hotel', 'Retail', 'Healthcare', 'Technology',
    'Construction', 'Real Estate', 'Education', 'Finance', 'Manufacturing',
    'Legal', 'Consulting', 'Marketing', 'Transportation', 'Other'
  ]

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 
    'Germany', 'France', 'Spain', 'Italy', 'Other'
  ]

  const handleGenerateLeads = async () => {
    if (!generateForm.industry) {
      toast.error('Please select an industry')
      return
    }

    try {
      setGenerating(true)
      setGenerationProgress(`Generating leads from ${generateForm.source}...`)

      // Use the new unified generation endpoint
      const response = await leadsAPI.generateLeads({
        industry: generateForm.industry,
        country: generateForm.country,
        city: generateForm.city,
        sources: [generateForm.source],
        maxResults: generateForm.maxResults,
      })

      setGenerationProgress('Analyzing websites and scoring leads...')
      
      // Wait for analysis to complete
      await new Promise(resolve => setTimeout(resolve, 1500))

      const data = response.data.data
      const savedCount = data?.saved || data?.count || 0
      const duplicatesCount = data?.duplicates || 0
      const byTier = data?.byTier || { hot: 0, warm: 0, cold: 0 }
      
      let message = `✅ Generated ${savedCount} leads!`
      if (byTier.hot > 0 || byTier.warm > 0 || byTier.cold > 0) {
        message += `\n🔥 ${byTier.hot} hot | ⚡ ${byTier.warm} warm | ❄️ ${byTier.cold} cold`
      }
      if (duplicatesCount > 0) {
        message += `\n(${duplicatesCount} duplicates skipped)`
      }

      toast.success(message, { duration: 5000 })
      setShowGenerateModal(false)
      refetch()
      
      // Reset form
      setGenerateForm({
        source: 'apollo',
        industry: '',
        country: 'United States',
        city: '',
        maxResults: 50,
      })
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to generate leads')
      console.error(error)
    } finally {
      setGenerating(false)
      setGenerationProgress('')
    }
  }

  const handleExport = async () => {
    try {
      // Build query params from current filters
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (filters.industry !== 'all') params.append('industry', filters.industry);
      if (filters.source !== 'all') params.append('source', filters.source);
      if (filters.minScore > 0) params.append('minScore', filters.minScore.toString());
      if (filters.maxScore < 100) params.append('maxScore', filters.maxScore.toString());

      const queryString = params.toString();
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/leads/export${queryString ? '?' + queryString : ''}`;
      
      // Download file
      window.location.href = url;
      toast.success('Exporting leads...');
    } catch (error) {
      toast.error('Failed to export leads');
    }
  }

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const csvData = event.target?.result as string;
          
          toast.loading('Importing leads...');
          
          const response = await api.post('/leads/import', {
            csvData,
            industry: 'Other', // Can be enhanced with a modal to select industry
            enrichEmail: true,
          });

          if (response.data.success) {
            toast.dismiss();
            toast.success(`Imported ${response.data.data.imported} leads successfully!`);
            refetch();
          }
        };
        reader.readAsText(file);
      } catch (error: any) {
        toast.dismiss();
        toast.error(error.response?.data?.error?.message || 'Failed to import leads');
      }
    };
    input.click();
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-green-100 text-green-800',
      unqualified: 'bg-gray-100 text-gray-800',
      responded: 'bg-purple-100 text-purple-800',
      interested: 'bg-teal-100 text-teal-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-600 mt-2">Manage and track your leads</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              <Zap className="w-4 h-4 inline mr-2" />
              Generate Leads
            </button>
            <button 
              onClick={handleImport}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Import CSV
            </button>
            <button 
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div 
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setTierFilter(tierFilter === 'hot' ? 'all' : 'hot')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hot Leads</p>
                <p className="text-2xl font-bold text-red-600">
                  {leads.filter(l => (l.qualityScore || l.score || 0) >= 80).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Score 80+</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setTierFilter(tierFilter === 'warm' ? 'all' : 'warm')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Warm Leads</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {leads.filter(l => {
                    const score = l.qualityScore || l.score || 0
                    return score >= 60 && score < 80
                  }).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Score 60-79</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setTierFilter(tierFilter === 'cold' ? 'all' : 'cold')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cold Leads</p>
                <p className="text-2xl font-bold text-blue-600">
                  {leads.filter(l => (l.qualityScore || l.score || 0) < 60).length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Score &lt;60</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Qualified</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leads.filter(l => l.status === 'qualified' || l.status === 'interested').length}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-bold">Q</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          {/* Search Bar and Status Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by company name, email, or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                showAdvancedFilters
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              Advanced Filters
            </button>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 mr-2">Status:</span>
            {['all', 'new', 'contacted', 'qualified', 'responded', 'interested', 'unqualified'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <select
                  value={filters.industry}
                  onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Industries</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lead Source
                </label>
                <select
                  value={filters.source}
                  onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Sources</option>
                  <option value="apollo">Apollo.io</option>
                  <option value="google_places">Google Places</option>
                  <option value="peopledatalabs">People Data Labs</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="manual_import">Manual Import</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Score ({filters.minScore})
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.minScore}
                  onChange={(e) => setFilters({ ...filters, minScore: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Score ({filters.maxScore})
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.maxScore}
                  onChange={(e) => setFilters({ ...filters, maxScore: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="md:col-span-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setFilters({
                      industry: 'all',
                      minScore: 0,
                      maxScore: 100,
                      verificationStatus: 'all',
                      source: 'all',
                    })
                    setSearchQuery('')
                    setStatusFilter('all')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-lg text-gray-500">Loading leads...</div>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Users className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filters.industry !== 'all' || filters.source !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by importing or generating your first leads'}
              </p>
              <button 
                onClick={() => setShowGenerateModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <Zap className="w-4 h-4 inline mr-2" />
                Generate Leads
              </button>
            </div>
          ) : (
            <>
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{filteredLeads.length}</span> of <span className="font-medium">{leads.length}</span> leads
                </p>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                  const score = lead.qualityScore || lead.score || 0
                  const tierBadge = getTierBadge(score)
                  return (
                  <tr key={lead.id} className="hover:bg-gray-50">
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
                      <button className="text-primary-600 hover:text-primary-900 mr-3">View</button>
                      <button className="text-gray-600 hover:text-gray-900">Edit</button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
            </>
          )}
        </div>

        {/* Lead Generation Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Generate Leads</h2>
                  <p className="text-sm text-gray-600 mt-1">Select source and configure filters</p>
                </div>
                <button 
                  onClick={() => setShowGenerateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={generating}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Source Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Lead Source *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      generateForm.source === 'apollo' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                    }`}>
                      <input
                        type="radio"
                        checked={generateForm.source === 'apollo'}
                        onChange={() => setGenerateForm({ ...generateForm, source: 'apollo' })}
                        className="mt-1"
                        disabled={generating}
                      />
                      <div>
                        <p className="font-medium text-gray-900">Apollo.io</p>
                        <p className="text-sm text-gray-600">B2B contact database</p>
                        <p className="text-xs text-gray-500 mt-1">100 leads/day limit</p>
                      </div>
                    </label>

                    <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      generateForm.source === 'google_places' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                    }`}>
                      <input
                        type="radio"
                        checked={generateForm.source === 'google_places'}
                        onChange={() => setGenerateForm({ ...generateForm, source: 'google_places' })}
                        className="mt-1"
                        disabled={generating}
                      />
                      <div>
                        <p className="font-medium text-gray-900">Google Places</p>
                        <p className="text-sm text-gray-600">Local businesses</p>
                        <p className="text-xs text-gray-500 mt-1">Unlimited</p>
                      </div>
                    </label>

                    <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      generateForm.source === 'peopledatalabs' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                    }`}>
                      <input
                        type="radio"
                        checked={generateForm.source === 'peopledatalabs'}
                        onChange={() => setGenerateForm({ ...generateForm, source: 'peopledatalabs' })}
                        className="mt-1"
                        disabled={generating}
                      />
                      <div>
                        <p className="font-medium text-gray-900">People Data Labs</p>
                        <p className="text-sm text-gray-600">Contact enrichment</p>
                        <p className="text-xs text-gray-500 mt-1">1,000 credits/month</p>
                      </div>
                    </label>

                    <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      generateForm.source === 'linkedin' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                    }`}>
                      <input
                        type="radio"
                        checked={generateForm.source === 'linkedin'}
                        onChange={() => setGenerateForm({ ...generateForm, source: 'linkedin' })}
                        className="mt-1"
                        disabled={generating}
                      />
                      <div>
                        <p className="font-medium text-gray-900">LinkedIn CSV</p>
                        <p className="text-sm text-gray-600">Sales Navigator</p>
                        <p className="text-xs text-gray-500 mt-1">Manual upload</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Industry Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry *
                  </label>
                  <select
                    value={generateForm.industry}
                    onChange={(e) => setGenerateForm({ ...generateForm, industry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={generating}
                  >
                    <option value="">Select industry</option>
                    {industries.map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                {/* Location Filters */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <select
                      value={generateForm.country}
                      onChange={(e) => setGenerateForm({ ...generateForm, country: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={generating}
                    >
                      {countries.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City (Optional)
                    </label>
                    <input
                      type="text"
                      value={generateForm.city}
                      onChange={(e) => setGenerateForm({ ...generateForm, city: e.target.value })}
                      placeholder="e.g., New York"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={generating}
                    />
                  </div>
                </div>

                {/* Max Results */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Results
                  </label>
                  <input
                    type="number"
                    value={generateForm.maxResults}
                    onChange={(e) => setGenerateForm({ ...generateForm, maxResults: parseInt(e.target.value) || 0 })}
                    min="1"
                    max="500"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={generating}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Note: Actual results may be lower based on API limits and data availability
                  </p>
                </div>

                {/* Progress Indicator */}
                {generating && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Generating leads...</p>
                        <p className="text-xs text-blue-700 mt-1">{generationProgress}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-6 border-t">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={generating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateLeads}
                  disabled={generating || !generateForm.industry}
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader className="w-4 h-4 inline mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 inline mr-2" />
                      Generate Leads
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
