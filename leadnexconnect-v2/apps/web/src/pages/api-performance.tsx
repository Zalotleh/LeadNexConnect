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
                    {avgCostPerLead > 0 ? (
                      <>
                        <p className="text-3xl font-bold text-gray-900 mt-2">${avgCostPerLead.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 mt-1">Total: ${(avgCostPerLead * totalLeads).toFixed(2)}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-green-600 mt-2">Free</p>
                        <p className="text-xs text-gray-500 mt-1">No API costs configured</p>
                      </>
                    )}
                  </div>
                  <div className="bg-yellow-50 rounded-full p-3">
                    <DollarSign className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* API Source Comparison & Recommendations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">API Source Comparison & Investment Guide</h2>
          {reportLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No API data available yet. Start generating leads to see API performance metrics.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Best Overall Value */}
              <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
                <div className="flex items-start gap-3">
                  <Award className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-1">🏆 Best Overall Value</h3>
                    {(() => {
                      // Calculate value score: (quality * hot_leads%) / cost
                      const bestValue = [...sources]
                        .filter(s => s.apiSource !== 'manual_import')
                        .map(s => ({
                          ...s,
                          valueScore: s.leadsGenerated > 0 
                            ? ((s.avgLeadScore / 100) * (s.hotLeadsPercent / 100) * 100) / (s.costPerLead || 1)
                            : 0
                        }))
                        .sort((a, b) => b.valueScore - a.valueScore)[0]
                      
                      return bestValue ? (
                        <div>
                          <p className="text-green-800 font-medium text-lg">{getSourceDisplayName(bestValue.apiSource)}</p>
                          <p className="text-sm text-green-700 mt-1">
                            Quality: {bestValue.avgLeadScore}/100 • {bestValue.hotLeadsPercent}% Hot Leads • ${bestValue.costPerLead.toFixed(2)}/lead
                          </p>
                          <p className="text-xs text-green-600 mt-2">
                            💡 Best balance of lead quality and cost. Recommended for most campaigns.
                          </p>
                        </div>
                      ) : <p className="text-green-700">No data available</p>
                    })()}
                  </div>
                </div>
              </div>

              {/* Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Highest Quality */}
                <div className="border border-purple-200 bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-purple-900">Highest Quality</h4>
                  </div>
                  {(() => {
                    const highest = [...sources]
                      .filter(s => s.apiSource !== 'manual_import' && s.leadsGenerated > 0)
                      .sort((a, b) => b.avgLeadScore - a.avgLeadScore)[0]
                    return highest ? (
                      <div>
                        <p className="text-purple-800 font-medium">{getSourceDisplayName(highest.apiSource)}</p>
                        <p className="text-2xl font-bold text-purple-900 mt-1">{highest.avgLeadScore}/100</p>
                        <p className="text-xs text-purple-600 mt-2">
                          {highest.hotLeadsPercent}% hot leads • ${highest.costPerLead.toFixed(2)}/lead
                        </p>
                      </div>
                    ) : <p className="text-purple-700 text-sm">No data</p>
                  })()}
                </div>

                {/* Most Cost Effective */}
                <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">Most Cost Effective</h4>
                  </div>
                  {(() => {
                    const cheapest = [...sources]
                      .filter(s => s.apiSource !== 'manual_import' && s.leadsGenerated > 0 && s.costPerLead > 0)
                      .sort((a, b) => a.costPerLead - b.costPerLead)[0]
                    return cheapest ? (
                      <div>
                        <p className="text-blue-800 font-medium">{getSourceDisplayName(cheapest.apiSource)}</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">${cheapest.costPerLead.toFixed(2)}</p>
                        <p className="text-xs text-blue-600 mt-2">
                          per lead • Quality: {cheapest.avgLeadScore}/100
                        </p>
                      </div>
                    ) : <p className="text-blue-700 text-sm">No data</p>
                  })()}
                </div>

                {/* Most Used */}
                <div className="border border-orange-200 bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <h4 className="font-semibold text-orange-900">Most Productive</h4>
                  </div>
                  {(() => {
                    const mostUsed = [...sources]
                      .filter(s => s.apiSource !== 'manual_import')
                      .sort((a, b) => b.leadsGenerated - a.leadsGenerated)[0]
                    return mostUsed ? (
                      <div>
                        <p className="text-orange-800 font-medium">{getSourceDisplayName(mostUsed.apiSource)}</p>
                        <p className="text-2xl font-bold text-orange-900 mt-1">{mostUsed.leadsGenerated}</p>
                        <p className="text-xs text-orange-600 mt-2">
                          leads generated • {mostUsed.apiCallsUsed} API calls
                        </p>
                      </div>
                    ) : <p className="text-orange-700 text-sm">No data</p>
                  })()}
                </div>
              </div>

              {/* ROI Analysis */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-gray-600" />
                  ROI & Efficiency Analysis
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sources
                    .filter(s => s.apiSource !== 'manual_import' && s.leadsGenerated > 0)
                    .map(source => {
                      const roi = source.customersConverted > 0 
                        ? (source.customersConverted * 1000) / (source.costPerLead * source.leadsGenerated) // Assuming $1000 customer value
                        : 0
                      const efficiency = source.apiCallsUsed > 0 
                        ? (source.leadsGenerated / source.apiCallsUsed * 100)
                        : 0
                      
                      return (
                        <div key={source.apiSource} className="flex items-center justify-between p-3 bg-white rounded border">
                          <div>
                            <p className="font-medium text-gray-900">{getSourceDisplayName(source.apiSource)}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {source.leadsGenerated} leads • {source.customersConverted} customers
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {efficiency.toFixed(0)}% efficiency
                            </p>
                            <p className="text-xs text-gray-600">
                              {(source.leadsGenerated / source.apiCallsUsed).toFixed(1)} leads/call
                            </p>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Investment Recommendations */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  💡 Smart Investment Tips
                </h4>
                <div className="space-y-2 text-sm">
                  {(() => {
                    const apiSources = sources.filter(s => s.apiSource !== 'manual_import' && s.leadsGenerated > 0)
                    const tips = []
                    
                    // Check for underutilized quota
                    const underutilized = apiSources.filter(s => s.quotaPercent < 50)
                    if (underutilized.length > 0) {
                      tips.push({
                        icon: '📊',
                        text: `You're using less than 50% of your quota on ${underutilized.map(s => getSourceDisplayName(s.apiSource)).join(', ')}. Consider scaling up campaigns before buying new credits.`
                      })
                    }
                    
                    // Check for high-quality low-usage
                    const highQualityLowUsage = apiSources.filter(s => s.avgLeadScore >= 80 && s.quotaPercent < 60)
                    if (highQualityLowUsage.length > 0) {
                      tips.push({
                        icon: '🎯',
                        text: `${highQualityLowUsage.map(s => getSourceDisplayName(s.apiSource)).join(', ')} delivers high-quality leads and has available quota. Great opportunity to increase ROI.`
                      })
                    }
                    
                    // Check for near quota limit
                    const nearLimit = apiSources.filter(s => s.quotaPercent >= 80)
                    if (nearLimit.length > 0) {
                      tips.push({
                        icon: '⚠️',
                        text: `${nearLimit.map(s => getSourceDisplayName(s.apiSource)).join(', ')} approaching quota limit. Consider upgrading plan if performance is good.`
                      })
                    }
                    
                    // Cost efficiency tip
                    const sorted = [...apiSources].sort((a, b) => a.costPerLead - b.costPerLead)
                    if (sorted.length >= 2 && sorted[0].costPerLead < sorted[sorted.length - 1].costPerLead * 0.5) {
                      tips.push({
                        icon: '💰',
                        text: `${getSourceDisplayName(sorted[0].apiSource)} costs ${((1 - sorted[0].costPerLead / sorted[sorted.length - 1].costPerLead) * 100).toFixed(0)}% less per lead than ${getSourceDisplayName(sorted[sorted.length - 1].apiSource)}. Consider reallocating budget.`
                      })
                    }
                    
                    if (tips.length === 0) {
                      tips.push({
                        icon: '✅',
                        text: 'Your API usage is well-balanced. Continue monitoring performance and adjust based on campaign results.'
                      })
                    }
                    
                    return tips.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-lg flex-shrink-0">{tip.icon}</span>
                        <p>{tip.text}</p>
                      </div>
                    ))
                  })()}
                </div>
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
                            <div className="text-sm font-bold text-green-600">Free</div>
                            <div className="text-xs text-gray-500 italic">Imported</div>
                          </div>
                        ) : source.costPerLead > 0 ? (
                          <>
                            <div className="text-lg font-bold text-gray-900">
                              ${source.costPerLead.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Total: ${(source.costPerLead * source.leadsGenerated).toFixed(2)}
                            </div>
                          </>
                        ) : (
                          <div>
                            <div className="text-sm font-bold text-green-600">Free</div>
                            <div className="text-xs text-gray-500 italic">No cost set</div>
                          </div>
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
