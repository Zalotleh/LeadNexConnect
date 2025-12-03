import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import { apiPerformanceAPI } from '@/services/api'
import { Activity, TrendingUp, DollarSign, Award, Zap, Users, Database, AlertCircle, BarChart3 } from 'lucide-react'

interface APIMetrics {
  leadsGenerated: number
  apiCallsUsed: number
  apiCallsLimit: number
  quotaPercent: number
  avgLeadScore: number
  hotLeadsPercent: number
  demosBooked: number
  trialsStarted: number
  customersConverted: number
  costPerLead: number
}

interface APIPerformanceData {
  [key: string]: APIMetrics
}

// Skeleton Components
const CardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
        <div className="h-8 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="bg-gray-200 rounded-full p-3 w-12 h-12"></div>
    </div>
  </div>
)

const TableRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
  </tr>
)

export default function APIPerformance() {
  const [viewMode, setViewMode] = useState<'monthly' | 'allTime'>('allTime')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const { data: performanceData, isLoading: reportLoading, error: reportError } = useQuery({
    queryKey: ['api-performance-report', viewMode, selectedMonth, selectedYear],
    queryFn: async () => {
      if (viewMode === 'allTime') {
        const response = await apiPerformanceAPI.getMonthlyReport({
          month: selectedMonth,
          year: selectedYear,
          allTime: true,
        })
        return response.data.data?.performance || {}
      } else {
        const response = await apiPerformanceAPI.getMonthlyReport({
          month: selectedMonth,
          year: selectedYear,
        })
        return response.data.data?.performance || {}
      }
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const { data: roiSummary, isLoading: roiLoading } = useQuery({
    queryKey: ['roi-summary'],
    queryFn: async () => {
      const { data } = await apiPerformanceAPI.getROISummary()
      return data.data
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  // Convert object to array and calculate totals
  const sources = performanceData ? Object.entries(performanceData).map(([apiSource, metrics]) => {
    const data = metrics as APIMetrics;
    return {
      apiSource,
      ...data
    };
  }) : []

  const totalLeads = sources.reduce((sum, s) => sum + (s.leadsGenerated || 0), 0)
  const totalCalls = sources.reduce((sum, s) => sum + (s.apiCallsUsed || 0), 0)
  const avgQuality = sources.length > 0 
    ? Math.round(sources.reduce((sum, s) => sum + (s.avgLeadScore || 0), 0) / sources.length)
    : 0
  const totalDemos = sources.reduce((sum, s) => sum + (s.demosBooked || 0), 0)
  const totalTrials = sources.reduce((sum, s) => sum + (s.trialsStarted || 0), 0)
  const totalCustomers = sources.reduce((sum, s) => sum + (s.customersConverted || 0), 0)
  const avgCostPerLead = sources.length > 0
    ? sources.reduce((sum, s) => sum + (s.costPerLead || 0), 0) / sources.length
    : 0

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      apollo: 'bg-blue-500',
      hunter: 'bg-green-500',
      google_places: 'bg-red-500',
      peopledatalabs: 'bg-purple-500',
      manual_import: 'bg-orange-500',
    }
    return colors[source] || 'bg-gray-500'
  }

  const getSourceDisplayName = (source: string) => {
    const names: Record<string, string> = {
      apollo: 'Apollo',
      hunter: 'Hunter',
      google_places: 'Google Places',
      peopledatalabs: 'PeopleDataLabs',
      manual_import: 'Imported Leads',
    }
    return names[source] || source
  }

  const getQuotaColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100'
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getQuotaBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">API Performance</h1>
            <p className="text-gray-600 mt-2">Track API usage, costs, and lead quality metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'monthly'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setViewMode('allTime')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'allTime'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Time
              </button>
            </div>
            
            {/* Month/Year selectors - only show in monthly mode */}
            {viewMode === 'monthly' && (
              <>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {[2024, 2025, 2026].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {reportLoading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Leads Generated</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalLeads}</p>
                    <p className="text-xs text-gray-500 mt-1">From {sources.length} sources</p>
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
                    <p className="text-xs text-gray-500 mt-1">
                      {totalLeads > 0 ? `${(totalCalls / totalLeads).toFixed(1)} calls/lead` : 'No leads yet'}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-full p-3">
                    <Database className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average Quality</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{avgQuality}<span className="text-xl">/100</span></p>
                    <p className="text-xs text-gray-500 mt-1">Across all sources</p>
                  </div>
                  <div className="bg-purple-50 rounded-full p-3">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Cost Per Lead</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">${avgCostPerLead.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Total: ${(avgCostPerLead * totalLeads).toFixed(2)}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-full p-3">
                    <DollarSign className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Conversion Funnel</h2>
          {reportLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="relative">
                  <div className="w-full h-32 bg-blue-100 rounded-t-lg flex items-center justify-center">
                    <Users className="w-12 h-12 text-blue-600" />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center font-bold text-xl">
                    {totalLeads}
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900 mt-5">Total Leads</p>
                <p className="text-xs text-gray-500 mt-1">100%</p>
              </div>

              <div className="text-center">
                <div className="relative">
                  <div className="w-full h-32 bg-purple-100 rounded-t-lg flex items-center justify-center">
                    <Award className="w-12 h-12 text-purple-600" />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white rounded-full w-16 h-16 flex items-center justify-center font-bold text-xl">
                    {totalDemos}
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900 mt-5">Demos Booked</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalLeads > 0 ? ((totalDemos / totalLeads) * 100).toFixed(1) : '0'}%
                </p>
              </div>

              <div className="text-center">
                <div className="relative">
                  <div className="w-full h-32 bg-yellow-100 rounded-t-lg flex items-center justify-center">
                    <Zap className="w-12 h-12 text-yellow-600" />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white rounded-full w-16 h-16 flex items-center justify-center font-bold text-xl">
                    {totalTrials}
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900 mt-5">Trials Started</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalDemos > 0 ? ((totalTrials / totalDemos) * 100).toFixed(1) : '0'}%
                </p>
              </div>

              <div className="text-center">
                <div className="relative">
                  <div className="w-full h-32 bg-green-100 rounded-t-lg flex items-center justify-center">
                    <TrendingUp className="w-12 h-12 text-green-600" />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white rounded-full w-16 h-16 flex items-center justify-center font-bold text-xl">
                    {totalCustomers}
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900 mt-5">Customers</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalTrials > 0 ? ((totalCustomers / totalTrials) * 100).toFixed(1) : '0'}%
                </p>
              </div>
            </div>
          )}
        </div>
        {/* Source Performance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Source Performance Breakdown</h2>
            <p className="text-sm text-gray-600 mt-1">
              Detailed metrics for {months[selectedMonth - 1]} {selectedYear}
            </p>
          </div>

          {reportLoading ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leads</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Calls</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quota</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/Lead</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </tbody>
              </table>
            </div>
          ) : sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No API usage data for this period</p>
              <p className="text-sm text-gray-400 mt-2">Start generating leads to see performance metrics</p>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost Per Lead
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sources.map((source) => (
                    <tr key={source.apiSource} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${getSourceColor(source.apiSource)} mr-3`}></div>
                          <span className="text-sm font-medium text-gray-900">
                            {getSourceDisplayName(source.apiSource)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{source.leadsGenerated}</div>
                        <div className="text-xs text-gray-500">
                          {source.hotLeadsPercent}% hot leads
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {source.apiSource === 'manual_import' ? (
                          <div className="text-sm text-gray-400 italic">N/A - Imported</div>
                        ) : (
                          <>
                            <div className="font-medium text-gray-900">{source.apiCallsUsed}</div>
                            <div className="text-xs text-gray-500">
                              / {source.apiCallsLimit} limit
                            </div>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {source.apiSource === 'manual_import' ? (
                          <span className="text-sm text-gray-400 italic">N/A</span>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${getQuotaColor(
                                source.quotaPercent
                              )}`}
                            >
                              {source.quotaPercent}%
                            </span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getQuotaBarColor(source.quotaPercent)}`}
                                style={{ width: `${Math.min(source.quotaPercent, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">
                            {source.avgLeadScore}/100
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${source.avgLeadScore}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-500">Demos:</span>
                            <span className="font-medium text-gray-900">{source.demosBooked}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-500">Trials:</span>
                            <span className="font-medium text-gray-900">{source.trialsStarted}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-500">Customers:</span>
                            <span className="font-medium text-green-600">{source.customersConverted}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {source.apiSource === 'manual_import' ? (
                          <div>
                            <div className="text-sm font-bold text-gray-400">$0.00</div>
                            <div className="text-xs text-gray-500 italic">No API cost</div>
                          </div>
                        ) : (
                          <>
                            <div className="text-lg font-bold text-gray-900">
                              ${source.costPerLead.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Total: ${(source.costPerLead * source.leadsGenerated).toFixed(2)}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">TOTAL</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{totalLeads}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{totalCalls}</td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{avgQuality}/100</td>
                    <td className="px-6 py-4">
                      <div className="text-sm space-y-1">
                        <div className="font-medium">{totalDemos} demos</div>
                        <div className="font-medium">{totalTrials} trials</div>
                        <div className="font-medium text-green-600">{totalCustomers} customers</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-lg font-bold text-gray-900">
                      ${avgCostPerLead.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Quota Warnings */}
        {sources.some(s => s.quotaPercent >= 80) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Quota Warnings</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    {sources.filter(s => s.quotaPercent >= 80).map(source => (
                      <li key={source.apiSource}>
                        <span className="font-medium">{getSourceDisplayName(source.apiSource)}</span> is at{' '}
                        <span className="font-bold">{source.quotaPercent}%</span> quota usage
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
