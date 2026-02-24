// @ts-nocheck
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  TrendingUp, Users, Mail, Award,
  MousePointerClick, BarChart3, ArrowRight,
  MessageSquare, Eye, Send, Zap,
} from 'lucide-react'
import { dashboardAPI } from '@/services/api'

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ── Skeletons ──────────────────────────────────────────────────────────────────
const CardSkel = () => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
    <div className="flex items-start justify-between mb-3">
      <div className="h-4 bg-gray-200 rounded w-32" />
      <div className="w-11 h-11 bg-gray-200 rounded-full" />
    </div>
    <div className="h-9 bg-gray-200 rounded w-28 mb-2" />
    <div className="h-3 bg-gray-200 rounded w-36 mb-4" />
    <div className="h-1.5 bg-gray-100 rounded-full" />
  </div>
)

const MiniSkel = () => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 animate-pulse">
    <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
    <div className="space-y-1.5 flex-1">
      <div className="h-3 bg-gray-200 rounded w-20" />
      <div className="h-6 bg-gray-200 rounded w-14" />
    </div>
  </div>
)

const SectionSkel = () => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-44 mb-6" />
    <div className="space-y-5">
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-1.5">
          <div className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-200 rounded w-12" />
          </div>
          <div className="h-2 bg-gray-100 rounded-full" />
        </div>
      ))}
    </div>
  </div>
)

const FunnelSkel = () => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-52 mb-5" />
    <div className="flex flex-col sm:flex-row gap-2">
      {[1,2,3,4].map(i => (
        <div key={i} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="h-3 bg-gray-200 rounded w-12" />
          </div>
          <div className="h-7 bg-gray-200 rounded w-16" />
          <div className="h-1 bg-gray-200 rounded-full" />
        </div>
      ))}
    </div>
  </div>
)

// ── ProgressRow ────────────────────────────────────────────────────────────────
function ProgressRow({ label, count, total, barColor }: {
  label: string; count: number; total: number; barColor: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-900 font-semibold tabular-nums">
          {count} <span className="text-gray-400 font-normal text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
function Analytics() {
  const [viewMode, setViewMode] = useState<'monthly' | 'allTime'>('allTime')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics-full', viewMode, selectedMonth, selectedYear],
    queryFn: async () => {
      const params = viewMode === 'allTime'
        ? { allTime: true }
        : { month: selectedMonth, year: selectedYear }
      const { data } = await dashboardAPI.getStats(params)
      return data.data
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  // Derived metrics
  const total     = analyticsData?.leads?.total    || 0
  const converted = analyticsData?.leads?.converted || 0
  const replied   = analyticsData?.emails?.replied  || 0
  const sent      = analyticsData?.emails?.sent     || 0
  const opened    = analyticsData?.emails?.opened   || 0
  const clicked   = analyticsData?.emails?.clicked  || 0
  const avgScore  = analyticsData?.quality?.avgScore || 0

  const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0'
  const responseRate   = sent  > 0 ? ((replied  / sent)  * 100).toFixed(1) : '0.0'
  const openRatePct    = sent  > 0 ? Math.round((opened  / sent) * 100) : (analyticsData?.emails?.openRate  || 0)
  const clickRatePct   = sent  > 0 ? Math.round((clicked / sent) * 100) : (analyticsData?.emails?.clickRate || 0)

  const scoreColor = avgScore >= 75 ? 'text-green-600' : avgScore >= 50 ? 'text-yellow-600' : 'text-red-500'
  const scoreBar   = avgScore >= 75 ? 'bg-green-500'   : avgScore >= 50 ? 'bg-yellow-500'   : 'bg-red-400'
  const scoreLabel = avgScore >= 75 ? 'High quality pipeline' : avgScore >= 50 ? 'Medium quality pipeline' : 'Pipeline needs improvement'

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-primary-600" />
              Analytics
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Track your outreach performance and lead quality.</p>
          </div>

          {/* Time filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(['allTime', 'monthly'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
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

        {/* ── Primary KPIs ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {isLoading ? [1,2,3].map(i => <CardSkel key={i} />) : (
            <>
              {/* Conversion Rate */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                  <div className="w-11 h-11 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-green-600 tabular-nums">{conversionRate}%</p>
                <p className="text-xs text-gray-400 mt-1.5 mb-4">{converted} of {total} leads converted</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(Number(conversionRate), 100)}%` }} />
                </div>
              </div>

              {/* Response Rate */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">Email Response Rate</p>
                  <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-blue-600 tabular-nums">{responseRate}%</p>
                <p className="text-xs text-gray-400 mt-1.5 mb-4">{replied} of {sent} emails replied</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(Number(responseRate), 100)}%` }} />
                </div>
              </div>

              {/* Avg Lead Score */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">Avg Lead Score</p>
                  <div className="w-11 h-11 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className={`text-4xl font-bold tabular-nums ${scoreColor}`}>
                  {avgScore}<span className="text-xl text-gray-300 font-normal">/100</span>
                </p>
                <p className="text-xs text-gray-400 mt-1.5 mb-4">{scoreLabel}</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${scoreBar}`} style={{ width: `${avgScore}%` }} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Secondary KPIs ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? [1,2,3,4].map(i => <MiniSkel key={i} />) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Open Rate</p>
                  <p className="text-xl font-bold text-blue-600 tabular-nums">{openRatePct}%</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <MousePointerClick className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Click Rate</p>
                  <p className="text-xl font-bold text-green-600 tabular-nums">{clickRatePct}%</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Active Campaigns</p>
                  <p className="text-xl font-bold text-yellow-600 tabular-nums">{analyticsData?.campaigns?.active || 0}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Total Leads</p>
                  <p className="text-xl font-bold text-purple-600 tabular-nums">{total}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Lead Quality + Status ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {isLoading ? [1,2].map(i => <SectionSkel key={i} />) : (
            <>
              {/* Lead Quality Distribution */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-gray-900">Lead Quality Distribution</h2>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    avgScore >= 75 ? 'bg-green-50 text-green-700' :
                    avgScore >= 50 ? 'bg-yellow-50 text-yellow-700' :
                    'bg-red-50 text-red-600'
                  }`}>
                    Avg {avgScore}/100
                  </span>
                </div>
                <div className="space-y-4">
                  <ProgressRow
                    label="🟢 High Quality (75+)"
                    count={analyticsData?.quality?.high || 0}
                    total={total}
                    barColor="bg-green-500"
                  />
                  <ProgressRow
                    label="🟡 Medium Quality (50–74)"
                    count={analyticsData?.quality?.medium || 0}
                    total={total}
                    barColor="bg-yellow-400"
                  />
                  <ProgressRow
                    label="🔴 Low Quality (&lt;50)"
                    count={analyticsData?.quality?.low || 0}
                    total={total}
                    barColor="bg-red-400"
                  />
                </div>
              </div>

              {/* Lead Status Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-gray-900">Lead Status Breakdown</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{total} total</span>
                </div>
                <div className="space-y-4">
                  <ProgressRow label="New"        count={analyticsData?.leads?.new       || 0} total={total} barColor="bg-blue-500"   />
                  <ProgressRow label="Contacted"  count={analyticsData?.leads?.contacted  || 0} total={total} barColor="bg-yellow-400" />
                  <ProgressRow label="Interested" count={analyticsData?.leads?.interested || 0} total={total} barColor="bg-purple-500" />
                  <ProgressRow label="Converted"  count={converted}                             total={total} barColor="bg-green-500"  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Email Performance Funnel ──────────────────────────────────────── */}
        {isLoading ? <FunnelSkel /> : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Email Performance Funnel</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">

              {/* Sent */}
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                    <Send className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-500">Sent</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{sent}</p>
                <div className="mt-3 h-1 bg-gray-200 rounded-full">
                  <div className="h-full bg-blue-400 rounded-full w-full" />
                </div>
                <p className="text-xs text-gray-400 mt-1">100%</p>
              </div>

              <ArrowRight className="w-4 h-4 text-gray-300 hidden sm:block flex-shrink-0 self-center" />

              {/* Opened */}
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                    <Eye className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-500">Opened</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{opened}</p>
                <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-400 rounded-full" style={{ width: `${sent > 0 ? Math.round((opened/sent)*100) : 0}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{sent > 0 ? Math.round((opened/sent)*100) : 0}% open rate</p>
              </div>

              <ArrowRight className="w-4 h-4 text-gray-300 hidden sm:block flex-shrink-0 self-center" />

              {/* Clicked */}
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-yellow-50 rounded-full flex items-center justify-center">
                    <MousePointerClick className="w-4 h-4 text-yellow-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-500">Clicked</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{clicked}</p>
                <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${sent > 0 ? Math.round((clicked/sent)*100) : 0}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{sent > 0 ? Math.round((clicked/sent)*100) : 0}% click rate</p>
              </div>

              <ArrowRight className="w-4 h-4 text-gray-300 hidden sm:block flex-shrink-0 self-center" />

              {/* Replied */}
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-xs font-medium text-gray-500">Replied</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{replied}</p>
                <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(Number(responseRate), 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{responseRate}% reply rate</p>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}

function AnalyticsWithProtection() {
  return (
    <ProtectedRoute>
      <Analytics />
    </ProtectedRoute>
  )
}

export default AnalyticsWithProtection
