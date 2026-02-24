// @ts-nocheck
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { apiPerformanceAPI } from '@/services/api'
import {
  Activity, TrendingUp, DollarSign, Award, Users, Database,
  AlertCircle, BarChart3, Zap,
} from 'lucide-react'

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

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ── Skeletons ─────────────────────────────────────────────────────────────────
const CardSkel = () => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
    <div className="flex items-start justify-between mb-3">
      <div className="h-4 bg-gray-200 rounded w-36" />
      <div className="w-11 h-11 bg-gray-200 rounded-full" />
    </div>
    <div className="h-9 bg-gray-200 rounded w-24 mb-2" />
    <div className="h-3 bg-gray-200 rounded w-32 mb-4" />
    <div className="h-1.5 bg-gray-100 rounded-full" />
  </div>
)

const TableRowSkel = () => (
  <tr className="animate-pulse">
    {[36, 16, 24, 28, 20, 24, 16].map((w, i) => (
      <td key={i} className="px-5 py-4">
        <div className={`h-4 bg-gray-200 rounded w-${w}`} />
      </td>
    ))}
  </tr>
)

// ── Helpers ───────────────────────────────────────────────────────────────────
const SOURCE_COLORS: Record<string, { dot: string; badge: string }> = {
  apollo:          { dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 border-blue-200'   },
  hunter:          { dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700 border-green-200' },
  google_places:   { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700 border-red-200'       },
  peopledatalabs:  { dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  manual_import:   { dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
}

const SOURCE_NAMES: Record<string, string> = {
  apollo:         'Apollo',
  hunter:         'Hunter',
  google_places:  'Google Places',
  peopledatalabs: 'PeopleDataLabs',
  manual_import:  'Imported Leads',
}

const getSourceColor = (s: string) => SOURCE_COLORS[s] || { dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700 border-gray-200' }
const getSourceName  = (s: string) => SOURCE_NAMES[s] || s

const quotaBg  = (p: number) => p >= 90 ? 'bg-red-500'    : p >= 70 ? 'bg-yellow-500' : 'bg-green-500'
const quotaBadge = (p: number) => p >= 90
  ? 'bg-red-50 text-red-700 border border-red-200'
  : p >= 70
  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
  : 'bg-green-50 text-green-700 border border-green-200'

// ── Main page ─────────────────────────────────────────────────────────────────
function APIPerformance() {
  const [viewMode, setViewMode] = useState<'monthly' | 'allTime'>('allTime')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear]   = useState(new Date().getFullYear())

  const { data: performanceData, isLoading: reportLoading } = useQuery({
    queryKey: ['api-performance-report', viewMode, selectedMonth, selectedYear],
    queryFn: async () => {
      const params = viewMode === 'allTime'
        ? { month: selectedMonth, year: selectedYear, allTime: true }
        : { month: selectedMonth, year: selectedYear }
      const response = await apiPerformanceAPI.getMonthlyReport(params)
      return response.data.data?.performance || {}
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  // Build sources array
  const sources = performanceData
    ? Object.entries(performanceData as APIPerformanceData).map(([apiSource, metrics]) => ({ apiSource, ...(metrics as APIMetrics) }))
    : []

  const totalLeads     = sources.reduce((s, r) => s + (r.leadsGenerated || 0), 0)
  const totalCalls     = sources.reduce((s, r) => s + (r.apiCallsUsed   || 0), 0)
  const totalDemos     = sources.reduce((s, r) => s + (r.demosBooked    || 0), 0)
  const totalTrials    = sources.reduce((s, r) => s + (r.trialsStarted  || 0), 0)
  const totalCustomers = sources.reduce((s, r) => s + (r.customersConverted || 0), 0)
  const avgQuality     = sources.length > 0
    ? Math.round(sources.reduce((s, r) => s + (r.avgLeadScore || 0), 0) / sources.length)
    : 0
  const avgCostPerLead = sources.length > 0
    ? sources.reduce((s, r) => s + (r.costPerLead || 0), 0) / sources.length
    : 0

  const apiSources = sources.filter(s => s.apiSource !== 'manual_import' && s.leadsGenerated > 0)

  const bestValue = [...apiSources]
    .map(s => ({ ...s, valueScore: ((s.avgLeadScore / 100) * (s.hotLeadsPercent / 100) * 100) / (s.costPerLead || 1) }))
    .sort((a, b) => b.valueScore - a.valueScore)[0]
  const highestQuality = [...apiSources].sort((a, b) => b.avgLeadScore   - a.avgLeadScore)[0]
  const cheapest       = [...apiSources].filter(s => s.costPerLead > 0).sort((a, b) => a.costPerLead - b.costPerLead)[0]
  const mostProductive = [...apiSources].sort((a, b) => b.leadsGenerated - a.leadsGenerated)[0]

  // Smart tips
  const tips: { icon: string; text: string }[] = []
  const underutilized = apiSources.filter(s => s.quotaPercent < 50)
  if (underutilized.length > 0) tips.push({ icon: '📊', text: `You're using less than 50% of your quota on ${underutilized.map(s => getSourceName(s.apiSource)).join(', ')}. Scale up campaigns before buying new credits.` })
  const highQualityLow = apiSources.filter(s => s.avgLeadScore >= 80 && s.quotaPercent < 60)
  if (highQualityLow.length > 0) tips.push({ icon: '🎯', text: `${highQualityLow.map(s => getSourceName(s.apiSource)).join(', ')} delivers high-quality leads and has available quota. Great opportunity to increase ROI.` })
  const nearLimit = apiSources.filter(s => s.quotaPercent >= 80)
  if (nearLimit.length > 0) tips.push({ icon: '⚠️', text: `${nearLimit.map(s => getSourceName(s.apiSource)).join(', ')} approaching quota limit. Consider upgrading if performance is good.` })
  const sorted = [...apiSources].sort((a, b) => a.costPerLead - b.costPerLead)
  if (sorted.length >= 2 && sorted[0].costPerLead < sorted[sorted.length - 1].costPerLead * 0.5)
    tips.push({ icon: '💰', text: `${getSourceName(sorted[0].apiSource)} costs ${((1 - sorted[0].costPerLead / sorted[sorted.length - 1].costPerLead) * 100).toFixed(0)}% less per lead than ${getSourceName(sorted[sorted.length - 1].apiSource)}. Consider reallocating budget.` })
  if (tips.length === 0) tips.push({ icon: '✅', text: 'Your API usage is well-balanced. Continue monitoring performance and adjust based on campaign results.' })

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-7 h-7 text-primary-600" />
              API Performance
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Track API usage, lead quality, and cost efficiency across sources.</p>
          </div>

          {/* Time filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(['allTime', 'monthly'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === mode ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode === 'allTime' ? 'All Time' : 'Monthly'}
                </button>
              ))}
            </div>
            {viewMode === 'monthly' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── Summary KPI Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {reportLoading ? [1,2,3,4].map(i => <CardSkel key={i} />) : (
            <>
              {/* Total Leads */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">Total Leads Generated</p>
                  <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 tabular-nums">{totalLeads}</p>
                <p className="text-xs text-gray-400 mt-1.5 mb-4">From {sources.length} source{sources.length !== 1 ? 's' : ''}</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: totalLeads > 0 ? '100%' : '0%' }} />
                </div>
              </div>

              {/* API Calls */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">API Calls Used</p>
                  <div className="w-11 h-11 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Database className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 tabular-nums">{totalCalls}</p>
                <p className="text-xs text-gray-400 mt-1.5 mb-4">
                  {totalLeads > 0 ? `${(totalCalls / totalLeads).toFixed(1)} calls per lead` : 'No leads yet'}
                </p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: totalCalls > 0 ? '100%' : '0%' }} />
                </div>
              </div>

              {/* Avg Quality */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">Average Quality</p>
                  <div className="w-11 h-11 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-purple-600 tabular-nums">
                  {avgQuality}<span className="text-xl text-gray-300 font-normal">/100</span>
                </p>
                <p className="text-xs text-gray-400 mt-1.5 mb-4">Across all sources</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${avgQuality}%` }} />
                </div>
              </div>

              {/* Avg Cost */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">Avg Cost Per Lead</p>
                  <div className="w-11 h-11 bg-yellow-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
                {avgCostPerLead > 0 ? (
                  <>
                    <p className="text-4xl font-bold text-gray-900 tabular-nums">${avgCostPerLead.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-1.5 mb-4">Total: ${(avgCostPerLead * totalLeads).toFixed(2)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-bold text-green-600">Free</p>
                    <p className="text-xs text-gray-400 mt-1.5 mb-4">No API costs configured</p>
                  </>
                )}
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full w-full" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Insights ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">API Source Comparison &amp; Investment Guide</h2>

          {reportLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <BarChart3 className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No API data available yet</p>
              <p className="text-xs mt-1">Start generating leads to see performance metrics.</p>
            </div>
          ) : (
            <div className="space-y-5">

              {/* Best Overall Value — hero card */}
              {bestValue && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Award className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-0.5">🏆 Best Overall Value</p>
                    <p className="text-lg font-bold text-green-900">{getSourceName(bestValue.apiSource)}</p>
                    <p className="text-sm text-green-700 mt-1">
                      Quality: {bestValue.avgLeadScore}/100 &nbsp;·&nbsp; {bestValue.hotLeadsPercent}% hot leads &nbsp;·&nbsp; ${bestValue.costPerLead.toFixed(2)}/lead
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      💡 Best balance of lead quality and cost. Recommended for most campaigns.
                    </p>
                  </div>
                </div>
              )}

              {/* Spotlight grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Highest Quality */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Award className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Highest Quality</p>
                  </div>
                  {highestQuality ? (
                    <>
                      <p className="font-semibold text-purple-900">{getSourceName(highestQuality.apiSource)}</p>
                      <p className="text-2xl font-bold text-purple-800 mt-1 tabular-nums">{highestQuality.avgLeadScore}/100</p>
                      <p className="text-xs text-purple-600 mt-2">{highestQuality.hotLeadsPercent}% hot leads · ${highestQuality.costPerLead.toFixed(2)}/lead</p>
                    </>
                  ) : <p className="text-sm text-purple-500 mt-2">No data</p>}
                </div>

                {/* Most Cost Effective */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Most Cost Effective</p>
                  </div>
                  {cheapest ? (
                    <>
                      <p className="font-semibold text-blue-900">{getSourceName(cheapest.apiSource)}</p>
                      <p className="text-2xl font-bold text-blue-800 mt-1 tabular-nums">${cheapest.costPerLead.toFixed(2)}</p>
                      <p className="text-xs text-blue-600 mt-2">per lead · Quality: {cheapest.avgLeadScore}/100</p>
                    </>
                  ) : <p className="text-sm text-blue-500 mt-2">No paid sources yet</p>}
                </div>

                {/* Most Productive */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                    </div>
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Most Productive</p>
                  </div>
                  {mostProductive ? (
                    <>
                      <p className="font-semibold text-orange-900">{getSourceName(mostProductive.apiSource)}</p>
                      <p className="text-2xl font-bold text-orange-800 mt-1 tabular-nums">{mostProductive.leadsGenerated}</p>
                      <p className="text-xs text-orange-600 mt-2">leads generated · {mostProductive.apiCallsUsed} API calls</p>
                    </>
                  ) : <p className="text-sm text-orange-500 mt-2">No data</p>}
                </div>
              </div>

              {/* ROI / Efficiency rows */}
              {apiSources.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-gray-500" /> ROI &amp; Efficiency Analysis
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {apiSources.map(s => {
                      const efficiency = s.apiCallsUsed > 0 ? (s.leadsGenerated / s.apiCallsUsed * 100) : 0
                      return (
                        <div key={s.apiSource} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{getSourceName(s.apiSource)}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{s.leadsGenerated} leads · {s.customersConverted} customers</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900 tabular-nums">{efficiency.toFixed(0)}%</p>
                            <p className="text-xs text-gray-400">{s.apiCallsUsed > 0 ? (s.leadsGenerated / s.apiCallsUsed).toFixed(2) : 0} leads/call</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Smart tips */}
              <div className="bg-white border border-primary-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary-500" /> Smart Investment Tips
                </h4>
                <div className="space-y-2">
                  {tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <span className="text-base flex-shrink-0 leading-5">{tip.icon}</span>
                      <p>{tip.text}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ── Source Performance Table ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Source Performance Breakdown</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {viewMode === 'allTime' ? 'All time' : `${months[selectedMonth - 1]} ${selectedYear}`}
            </p>
          </div>

          {reportLoading ? (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Source', 'Leads', 'API Calls', 'Quota', 'Quality', 'Conversions', 'Cost/Lead'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <TableRowSkel /><TableRowSkel /><TableRowSkel />
              </tbody>
            </table>
          ) : sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <BarChart3 className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No API usage data for this period</p>
              <p className="text-xs mt-1">Start generating leads to see performance metrics.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Source', 'Leads Generated', 'API Calls', 'Quota', 'Avg Quality', 'Conversions', 'Cost / Lead'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sources.map(s => {
                    const sc = getSourceColor(s.apiSource)
                    return (
                      <tr key={s.apiSource} className="hover:bg-gray-50 transition-colors">

                        {/* Source */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                            <span className="font-medium text-gray-900">{getSourceName(s.apiSource)}</span>
                          </div>
                        </td>

                        {/* Leads */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="font-bold text-gray-900 tabular-nums">{s.leadsGenerated}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{s.hotLeadsPercent}% hot</p>
                        </td>

                        {/* API Calls */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {s.apiSource === 'manual_import' ? (
                            <span className="text-xs text-gray-400 italic">N/A – Imported</span>
                          ) : (
                            <>
                              <p className="font-medium text-gray-900 tabular-nums">{s.apiCallsUsed}</p>
                              <p className="text-xs text-gray-400 mt-0.5">/ {s.apiCallsLimit} limit</p>
                            </>
                          )}
                        </td>

                        {/* Quota */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {s.apiSource === 'manual_import' ? (
                            <span className="text-xs text-gray-400 italic">N/A</span>
                          ) : (
                            <div className="space-y-1.5">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${quotaBadge(s.quotaPercent)}`}>
                                {s.quotaPercent}%
                              </span>
                              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${quotaBg(s.quotaPercent)}`} style={{ width: `${Math.min(s.quotaPercent, 100)}%` }} />
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Quality */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 tabular-nums text-xs">{s.avgLeadScore}/100</span>
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${s.avgLeadScore}%` }} />
                            </div>
                          </div>
                        </td>

                        {/* Conversions */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="space-y-0.5 text-xs">
                            <div className="flex gap-1 text-gray-600"><span>Demos:</span><span className="font-medium text-gray-900">{s.demosBooked}</span></div>
                            <div className="flex gap-1 text-gray-600"><span>Trials:</span><span className="font-medium text-gray-900">{s.trialsStarted}</span></div>
                            <div className="flex gap-1 text-gray-600"><span>Customers:</span><span className="font-medium text-green-600">{s.customersConverted}</span></div>
                          </div>
                        </td>

                        {/* Cost/Lead */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {s.apiSource === 'manual_import' ? (
                            <div>
                              <p className="font-bold text-green-600">Free</p>
                              <p className="text-xs text-gray-400 italic">Imported</p>
                            </div>
                          ) : s.costPerLead > 0 ? (
                            <div>
                              <p className="font-bold text-gray-900 tabular-nums">${s.costPerLead.toFixed(2)}</p>
                              <p className="text-xs text-gray-400">Total: ${(s.costPerLead * s.leadsGenerated).toFixed(2)}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-bold text-green-600">Free</p>
                              <p className="text-xs text-gray-400 italic">No cost set</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                {/* Totals footer */}
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <td className="px-5 py-3.5 text-xs uppercase tracking-wide text-gray-500">Total / Avg</td>
                    <td className="px-5 py-3.5 text-gray-900 tabular-nums">{totalLeads}</td>
                    <td className="px-5 py-3.5 text-gray-900 tabular-nums">{totalCalls}</td>
                    <td className="px-5 py-3.5" />
                    <td className="px-5 py-3.5 text-gray-900">{avgQuality}/100</td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5 text-xs">
                        <div className="text-gray-700">{totalDemos} demos</div>
                        <div className="text-gray-700">{totalTrials} trials</div>
                        <div className="text-green-600">{totalCustomers} customers</div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-900 tabular-nums">${avgCostPerLead.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ── Quota Warnings ───────────────────────────────────────────────── */}
        {sources.some(s => s.quotaPercent >= 80) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-yellow-800 mb-1.5">Quota Warnings</h3>
              <ul className="space-y-1">
                {sources.filter(s => s.quotaPercent >= 80).map(s => (
                  <li key={s.apiSource} className="text-sm text-yellow-700 flex items-center gap-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${s.quotaPercent >= 90 ? 'bg-red-500' : 'bg-yellow-500'}`} />
                    <span><strong>{getSourceName(s.apiSource)}</strong> is at <strong>{s.quotaPercent}%</strong> quota usage</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}

function APIPerformanceWithProtection() {
  return (
    <ProtectedRoute>
      <APIPerformance />
    </ProtectedRoute>
  )
}

export default APIPerformanceWithProtection
