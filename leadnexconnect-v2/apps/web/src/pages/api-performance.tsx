import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import { apiPerformanceAPI } from '@/services/api'
import { Activity, TrendingUp, DollarSign, Target, Zap, Users, BarChart3 } from 'lucide-react'

interface APISource {
  apiSource: string
  leadsGenerated: number
  apiCallsUsed: number
  quotaLimit: number
  quotaPercentage: number
  averageQuality: number
  demosBooked: number
  trialsStarted: number
  customersAcquired: number
}

interface ROISummary {
  totalLeadsGenerated: number
  totalFirstContact: number
  totalDemosBooked: number
  totalTrialsStarted: number
  totalCustomersAcquired: number
  totalMRR: number
  averageConversionRate: number
  averageCostPerLead: number
}

export default function APIPerformance() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const { data: monthlyReport, isLoading: reportLoading } = useQuery({
    queryKey: ['api-performance-report', selectedMonth, selectedYear],
    queryFn: async () => {
      const { data } = await apiPerformanceAPI.getMonthlyReport({
        month: selectedMonth,
        year: selectedYear,
      })
      return data.data as APISource[]
    },
  })

  const { data: roiSummary, isLoading: roiLoading } = useQuery({
    queryKey: ['roi-summary'],
    queryFn: async () => {
      const { data } = await apiPerformanceAPI.getROISummary()
      return data.data as ROISummary
    },
  })

  const sources = monthlyReport || []
  const totalLeads = sources.reduce((sum, s) => sum + s.leadsGenerated, 0)
  const totalCalls = sources.reduce((sum, s) => sum + s.apiCallsUsed, 0)
  const avgQuality = sources.length > 0 
    ? Math.round(sources.reduce((sum, s) => sum + s.averageQuality, 0) / sources.length)
    : 0

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      apollo: 'bg-blue-500',
      hunter: 'bg-green-500',
      google_places: 'bg-red-500',
      peopledatalabs: 'bg-purple-500',
    }
    return colors[source] || 'bg-gray-500'
  }

  const getQuotaColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100'
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API Performance</h1>
            <p className="text-gray-600 mt-2">Track API usage, ROI, and lead quality metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              {months.map((month, idx) => (
                <option key={month} value={idx + 1}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Leads Generated</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalLeads}</p>
              </div>
              <div className="bg-blue-50 rounded-full p-3">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">API Calls Used</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalCalls}</p>
              </div>
              <div className="bg-green-50 rounded-full p-3">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Quality</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{avgQuality}/100</p>
              </div>
              <div className="bg-purple-50 rounded-full p-3">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Sources</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{sources.length}</p>
              </div>
              <div className="bg-yellow-50 rounded-full p-3">
                <Zap className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* ROI Summary */}
        {roiSummary && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">ROI Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{roiSummary.totalLeadsGenerated}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">First Contact</p>
                <p className="text-2xl font-bold text-blue-600">{roiSummary.totalFirstContact}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Demos Booked</p>
                <p className="text-2xl font-bold text-purple-600">{roiSummary.totalDemosBooked}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Trials Started</p>
                <p className="text-2xl font-bold text-yellow-600">{roiSummary.totalTrialsStarted}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Customers</p>
                <p className="text-2xl font-bold text-green-600">{roiSummary.totalCustomersAcquired}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Total MRR</p>
                <p className="text-2xl font-bold text-green-700">${roiSummary.totalMRR}</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {(roiSummary.averageConversionRate * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cost Per Lead</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  ${roiSummary.averageCostPerLead.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Source Performance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Source Performance</h2>
            <p className="text-sm text-gray-600 mt-1">
              Performance metrics for {months[selectedMonth - 1]} {selectedYear}
            </p>
          </div>

          {reportLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading performance data...</div>
            </div>
          ) : sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500">No API usage data for this period</p>
              <p className="text-sm text-gray-400 mt-2">Start generating leads to see metrics</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leads Generated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      API Calls Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quota Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Quality
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sources.map((source) => (
                    <tr key={source.apiSource} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${getSourceColor(source.apiSource)} mr-3`}></div>
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {source.apiSource.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {source.leadsGenerated}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {source.apiCallsUsed} / {source.quotaLimit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${getQuotaColor(
                              source.quotaPercentage
                            )}`}
                          >
                            {source.quotaPercentage.toFixed(1)}%
                          </span>
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                source.quotaPercentage >= 90
                                  ? 'bg-red-500'
                                  : source.quotaPercentage >= 70
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(source.quotaPercentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">
                            {source.averageQuality}/100
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${source.averageQuality}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <p>Demos: <span className="font-medium text-gray-900">{source.demosBooked}</span></p>
                          <p>Trials: <span className="font-medium text-gray-900">{source.trialsStarted}</span></p>
                          <p>Customers: <span className="font-medium text-green-600">{source.customersAcquired}</span></p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
