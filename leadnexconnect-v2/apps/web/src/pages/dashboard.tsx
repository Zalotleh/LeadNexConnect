// @ts-nocheck
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { dashboardAPI, apiPerformanceAPI } from '@/services/api'
import api from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import {
  TrendingUp, Users, Mail, Activity, Zap, Award, Flame, Thermometer, Snowflake,
  Database, AlertTriangle, ArrowRight, X, LayoutDashboard,
} from 'lucide-react'

interface DashboardStats {
  totalLeads: number
  hotLeads: number
  warmLeads: number
  coldLeads: number
  activeCampaigns: number
  emailsSent: number
}

interface APIPerformance {
  totalLeadsGenerated: number
  totalAPICalls: number
  averageQuality: number
  topSource: string
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ─── Skeletons ───────────────────────────────────────────────────────────────

const StatCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="h-4 bg-gray-200 rounded w-28" />
      <div className="w-11 h-11 bg-gray-200 rounded-full" />
    </div>
    <div className="h-9 bg-gray-200 rounded w-24 mb-1.5" />
    <div className="h-3 bg-gray-200 rounded w-20 mb-4" />
    <div className="h-1.5 bg-gray-200 rounded-full w-full" />
  </div>
)

const PerformanceCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="h-4 bg-gray-200 rounded w-28" />
      <div className="w-11 h-11 bg-gray-200 rounded-full" />
    </div>
    <div className="h-8 bg-gray-200 rounded w-20 mb-1.5" />
    <div className="h-3 bg-gray-200 rounded w-16 mb-4" />
    <div className="h-1.5 bg-gray-200 rounded-full w-full" />
  </div>
)

const LeadItemSkeleton = () => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 animate-pulse">
    <div className="space-y-1.5">
      <div className="h-4 bg-gray-200 rounded w-36" />
      <div className="h-3 bg-gray-200 rounded w-24" />
    </div>
    <div className="flex items-center gap-2">
      <div className="h-5 bg-gray-200 rounded-full w-12" />
      <div className="h-4 bg-gray-200 rounded w-10" />
    </div>
  </div>
)

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard() {
  const [viewMode, setViewMode] = useState<'monthly' | 'allTime'>('allTime')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', viewMode, selectedMonth, selectedYear],
    queryFn: async () => {
      const params = viewMode === 'monthly' ? { month: selectedMonth, year: selectedYear } : {}
      const { data } = await dashboardAPI.getStats(params)
      return data.data
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const { data: apiPerformance, isLoading: apiLoading } = useQuery<APIPerformance>({
    queryKey: ['api-performance', viewMode, selectedMonth, selectedYear],
    queryFn: async () => {
      const params = viewMode === 'monthly' ? { month: selectedMonth, year: selectedYear } : {}
      const reportData = await apiPerformanceAPI.getMonthlyReport(params)
      const sources = (reportData.data?.data || []).map((s: any) => ({
        apiSource: s.apiSource || s.api_source || '',
        leadsGenerated: s.leadsGenerated || s.leads_generated || 0,
        apiCallsUsed: s.apiCallsUsed || s.api_calls_used || 0,
        avgLeadScore: s.avgLeadScore || 0,
      }))
      const totalLeads = sources.reduce((sum: number, s: any) => sum + s.leadsGenerated, 0)
      const totalCalls = sources.reduce((sum: number, s: any) => sum + s.apiCallsUsed, 0)
      const avgQuality =
        sources.length > 0
          ? sources.reduce((sum: number, s: any) => sum + s.avgLeadScore, 0) / sources.length
          : 0
      const topPerformer = [...sources].sort((a: any, b: any) => b.leadsGenerated - a.leadsGenerated)[0]
      return {
        totalLeadsGenerated: totalLeads,
        totalAPICalls: totalCalls,
        averageQuality: Math.round(avgQuality),
        topSource: topPerformer ? topPerformer.apiSource.toUpperCase() : 'N/A',
      }
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const { data: recentLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ['recent-leads'],
    queryFn: async () => {
      const { data } = await dashboardAPI.getRecentLeads(5)
      return data.data || []
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const { isAdmin } = useAuth()

  const { data: senderProfile } = useQuery({
    queryKey: ['sender-profile-banner'],
    queryFn: async () => {
      const { data } = await api.get('/sender-profile')
      return data.data
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
    enabled: !isAdmin,
  })

  const { data: companyProfile } = useQuery({
    queryKey: ['company-profile-banner'],
    queryFn: async () => {
      const { data } = await api.get('/settings/company-profile')
      return data.data
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  })

  const missingSetup: { label: string; href: string }[] = []
  if (isAdmin) {
    if (!companyProfile?.companyName || !companyProfile?.websiteUrl) {
      missingSetup.push({ label: 'Complete your company profile', href: '/settings/company-profile' })
    }
  } else {
    if (!senderProfile?.senderName || !senderProfile?.senderEmail) {
      missingSetup.push({ label: 'Set your sender identity', href: '/settings/signature' })
    }
    if (!senderProfile?.signatureHtml) {
      missingSetup.push({ label: 'Build your email signature', href: '/settings/signature' })
    }
  }
  const showSetupBanner = !bannerDismissed && missingSetup.length > 0

  // Derived values
  const totalLeads = stats?.totalLeads || 0
  const hotLeads = stats?.hotLeads || 0
  const warmLeads = stats?.warmLeads || 0
  const coldLeads = stats?.coldLeads || 0
  const activeCampaigns = stats?.activeCampaigns || 0
  const emailsSent = stats?.emailsSent || 0
  const apiCalls = apiPerformance?.totalAPICalls || 0
  const avgQuality = apiPerformance?.averageQuality || 0

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'hot':  return 'bg-red-100 text-red-800'
      case 'warm': return 'bg-yellow-100 text-yellow-800'
      case 'cold': return 'bg-blue-100 text-blue-800'
      default:     return 'bg-gray-100 text-gray-800'
    }
  }

  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

  return (
    <Layout>
      <div className="space-y-6">

        {/* ── Setup Banner ──────────────────────────────────────────────── */}
        {showSetupBanner && (
          <div className="relative flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 mb-1">
                Complete your setup to start sending emails
              </p>
              <div className="flex flex-wrap gap-2">
                {missingSetup.map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-md px-2 py-1 transition-colors"
                  >
                    {item.label}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ))}
              </div>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-amber-500 hover:text-amber-700 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Page Header ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <LayoutDashboard className="w-7 h-7 text-primary-600" />
              Dashboard
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Your outreach performance at a glance.</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View-mode toggle */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'monthly'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setViewMode('allTime')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'allTime'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Time
              </button>
            </div>

            {viewMode === 'monthly' && (
              <>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {months.map((month, idx) => (
                    <option key={month} value={idx + 1}>{month}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {[2024, 2025, 2026].map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = '/leads'}
            className="flex items-center gap-4 p-5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white hover:from-purple-600 hover:to-purple-700 transition-all shadow hover:shadow-md text-left"
          >
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">Generate Leads</div>
              <div className="text-purple-100 text-xs mt-0.5">Auto-discover contacts</div>
            </div>
          </button>

          <button
            onClick={() => window.location.href = '/campaigns'}
            className="flex items-center gap-4 p-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow hover:shadow-md text-left"
          >
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">Start Outreach</div>
              <div className="text-blue-100 text-xs mt-0.5">Send email sequences</div>
            </div>
          </button>

          <button
            onClick={() => window.location.href = '/workflows'}
            className="flex items-center gap-4 p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl text-white hover:from-emerald-600 hover:to-emerald-700 transition-all shadow hover:shadow-md text-left"
          >
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">Build Workflow</div>
              <div className="text-emerald-100 text-xs mt-0.5">Create email sequences</div>
            </div>
          </button>
        </div>

        {/* ── Primary KPI Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsLoading || apiLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              {/* Total Leads */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">Total Leads</p>
                  <div className="w-11 h-11 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 tabular-nums">{totalLeads.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1.5 mb-4">{hotLeads} hot leads in pipeline</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, totalLeads > 0 ? 100 : 0)}%` }} />
                </div>
              </div>

              {/* Hot Leads */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">Hot Leads</p>
                  <div className="w-11 h-11 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Flame className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 tabular-nums">{hotLeads.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1.5 mb-4">{pct(hotLeads, totalLeads)}% of total leads</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct(hotLeads, totalLeads)}%` }} />
                </div>
              </div>

              {/* Active Campaigns */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
                  <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 tabular-nums">{activeCampaigns}</p>
                <p className="text-xs text-gray-400 mt-1.5 mb-4">{emailsSent.toLocaleString()} emails sent</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, activeCampaigns * 10)}%` }} />
                </div>
              </div>

              {/* API Calls */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">API Calls Used</p>
                  <div className="w-11 h-11 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 tabular-nums">{apiCalls.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1.5 mb-4">{(apiPerformance?.totalLeadsGenerated || 0).toLocaleString()} leads generated</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, apiCalls > 0 ? 100 : 0)}%` }} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Secondary Performance Cards ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsLoading || apiLoading ? (
            <>
              <PerformanceCardSkeleton />
              <PerformanceCardSkeleton />
              <PerformanceCardSkeleton />
              <PerformanceCardSkeleton />
            </>
          ) : (
            <>
              {/* Avg Lead Quality */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">Avg Lead Quality</p>
                  <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 tabular-nums">
                  {avgQuality}
                  <span className="text-xl text-gray-400 font-normal">/100</span>
                </p>
                <p className="text-xs text-gray-400 mt-1.5 mb-4">Average across all sources</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${avgQuality >= 70 ? 'bg-green-500' : avgQuality >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${avgQuality}%` }}
                  />
                </div>
              </div>

              {/* Top Performing Source */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">Top Performing Source</p>
                  <div className="w-11 h-11 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{apiPerformance?.topSource || 'N/A'}</p>
                <p className="text-xs text-gray-400 mt-1.5 mb-4">Best lead generation API</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full w-full" />
                </div>
              </div>

              {/* Warm Leads */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">Warm Leads</p>
                  <div className="w-11 h-11 bg-yellow-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Thermometer className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 tabular-nums">{warmLeads.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1.5 mb-4">{pct(warmLeads, totalLeads)}% of total leads</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${pct(warmLeads, totalLeads)}%` }} />
                </div>
              </div>

              {/* Cold Leads */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-gray-500">Cold Leads</p>
                  <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Snowflake className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 tabular-nums">{coldLeads.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1.5 mb-4">{pct(coldLeads, totalLeads)}% of total leads</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-400 rounded-full" style={{ width: `${pct(coldLeads, totalLeads)}%` }} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Recent Activity ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Leads */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Leads</h2>
            <div>
              {leadsLoading ? (
                <>
                  <LeadItemSkeleton />
                  <LeadItemSkeleton />
                  <LeadItemSkeleton />
                  <LeadItemSkeleton />
                  <LeadItemSkeleton />
                </>
              ) : recentLeads && recentLeads.length > 0 ? (
                recentLeads.map((lead: any) => (
                  <div key={lead.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{lead.companyName || lead.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{lead.industry} • {lead.city}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTierBadgeColor(
                        lead.qualityScore >= 80 ? 'hot' : lead.qualityScore >= 60 ? 'warm' : 'cold'
                      )}`}>
                        {lead.qualityScore >= 80 ? 'HOT' : lead.qualityScore >= 60 ? 'WARM' : 'COLD'}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">{lead.qualityScore}/100</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No leads yet. Generate your first leads!</p>
                </div>
              )}
            </div>
          </div>

          {/* Lead Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Lead Distribution</h2>
            {statsLoading ? (
              <div className="space-y-5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex justify-between mb-1.5">
                      <div className="h-4 bg-gray-200 rounded w-28" />
                      <div className="h-4 bg-gray-200 rounded w-8" />
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Hot */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-sm text-gray-700">Hot Leads (80+)</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {hotLeads}{' '}
                      <span className="text-gray-400 font-normal text-xs">({pct(hotLeads, totalLeads)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${pct(hotLeads, totalLeads)}%` }} />
                  </div>
                </div>

                {/* Warm */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                      <span className="text-sm text-gray-700">Warm Leads (60–79)</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {warmLeads}{' '}
                      <span className="text-gray-400 font-normal text-xs">({pct(warmLeads, totalLeads)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${pct(warmLeads, totalLeads)}%` }} />
                  </div>
                </div>

                {/* Cold */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-sm text-gray-700">Cold Leads (&lt;60)</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                      {coldLeads}{' '}
                      <span className="text-gray-400 font-normal text-xs">({pct(coldLeads, totalLeads)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct(coldLeads, totalLeads)}%` }} />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="text-lg font-bold text-gray-900 tabular-nums">{totalLeads.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  )
}

function DashboardWithProtection() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}

export default DashboardWithProtection
