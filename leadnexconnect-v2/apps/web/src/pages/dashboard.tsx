import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { dashboardAPI, apiPerformanceAPI } from '@/services/api'
import { TrendingUp, Users, Mail, Activity, Zap, Target, Award, Flame, Thermometer, Snowflake } from 'lucide-react'

interface DashboardStats {
  totalLeads: number
  hotLeads: number
  warmLeads: number
  coldLeads: number
  activeCampaigns: number
  emailsSent: number
}

interface LeadsByTier {
  hot: number
  warm: number
  cold: number
}

interface APIPerformance {
  totalLeadsGenerated: number
  totalAPICalls: number
  averageQuality: number
  topSource: string
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// Skeleton Component for Loading State
const StatCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="bg-gray-200 rounded-full p-3 w-12 h-12"></div>
    </div>
  </div>
)

const PerformanceCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="flex items-center space-x-3">
      <div className="bg-gray-200 rounded-full p-3 w-12 h-12"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  </div>
)

const LeadItemSkeleton = () => (
  <div className="flex items-center justify-between border-b pb-3 animate-pulse">
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-40"></div>
      <div className="h-3 bg-gray-200 rounded w-32"></div>
    </div>
    <div className="flex items-center space-x-2">
      <div className="h-6 bg-gray-200 rounded w-12"></div>
      <div className="h-4 bg-gray-200 rounded w-10"></div>
    </div>
  </div>
)

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<'monthly' | 'allTime'>('allTime')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Parallel data fetching with staleTime to reduce redundant calls
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', viewMode, selectedMonth, selectedYear],
    queryFn: async () => {
      const params = viewMode === 'allTime' 
        ? { allTime: true }
        : { month: selectedMonth, year: selectedYear }
      const { data } = await dashboardAPI.getStats(params)
      return data.data
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false, // Prevent refetch on window focus
  })

  const { data: apiPerformance, isLoading: apiLoading } = useQuery<APIPerformance>({
    queryKey: ['api-performance', viewMode, selectedMonth, selectedYear],
    queryFn: async () => {
      const params = viewMode === 'allTime'
        ? { allTime: true }
        : { month: selectedMonth, year: selectedYear }
      const { data } = await apiPerformanceAPI.getMonthlyReport(params)
      const report = data.data?.performance || {}
      
      // Check if report is empty or not an object
      if (!report || Object.keys(report).length === 0) {
        return {
          totalLeadsGenerated: 0,
          totalAPICalls: 0,
          averageQuality: 0,
          topSource: 'N/A'
        }
      }

      // Convert object to array of sources with their data
      const sources = Object.entries(report).map(([apiSource, metrics]: [string, any]) => ({
        apiSource,
        leadsGenerated: metrics.leadsGenerated || 0,
        apiCallsUsed: metrics.apiCallsUsed || 0,
        avgLeadScore: metrics.avgLeadScore || 0,
      }))

      const totalLeads = sources.reduce((sum, s) => sum + s.leadsGenerated, 0)
      const totalCalls = sources.reduce((sum, s) => sum + s.apiCallsUsed, 0)
      const avgQuality = sources.length > 0
        ? sources.reduce((sum, s) => sum + s.avgLeadScore, 0) / sources.length
        : 0
      
      // Find top performing source by leads generated
      const topPerformer = sources.sort((a, b) => b.leadsGenerated - a.leadsGenerated)[0]
      const topSource = topPerformer ? topPerformer.apiSource.toUpperCase() : 'N/A'

      return {
        totalLeadsGenerated: totalLeads,
        totalAPICalls: totalCalls,
        averageQuality: Math.round(avgQuality),
        topSource
      }
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  })

  const { data: recentLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ['recent-leads'],
    queryFn: async () => {
      const { data } = await dashboardAPI.getRecentLeads(5)
      return data.data || []
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  })

  const statCards = [
    {
      name: 'Total Leads',
      value: stats?.totalLeads || 0,
      icon: Users,
      change: `${stats?.hotLeads || 0} hot leads`,
      changeType: 'positive' as const,
    },
    {
      name: 'Hot Leads',
      value: stats?.hotLeads || 0,
      icon: Flame,
      change: `${stats?.warmLeads || 0} warm`,
      changeType: 'positive' as const,
    },
    {
      name: 'Active Campaigns',
      value: stats?.activeCampaigns || 0,
      icon: Zap,
      change: `${stats?.emailsSent || 0} sent`,
      changeType: 'neutral' as const,
    },
    {
      name: 'API Calls Used',
      value: apiPerformance?.totalAPICalls || 0,
      icon: Activity,
      change: `${apiPerformance?.totalLeadsGenerated || 0} generated`,
      changeType: 'positive' as const,
    },
  ]

  const performanceCards = [
    {
      name: 'Average Lead Quality',
      value: `${apiPerformance?.averageQuality || 0}/100`,
      icon: Award,
      color: 'blue',
    },
    {
      name: 'Top Performing Source',
      value: apiPerformance?.topSource || 'N/A',
      icon: TrendingUp,
      color: 'green',
    },
    {
      name: 'Warm Leads',
      value: stats?.warmLeads || 0,
      icon: Thermometer,
      color: 'yellow',
    },
    {
      name: 'Cold Leads',
      value: stats?.coldLeads || 0,
      icon: Snowflake,
      color: 'gray',
    },
  ]

  const isLoading = statsLoading || apiLoading

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'hot':
        return 'bg-red-100 text-red-800'
      case 'warm':
        return 'bg-yellow-100 text-yellow-800'
      case 'cold':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Date Filter */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back! Here's your overview.</p>
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

        {/* Stats Grid - Show skeleton while loading */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsLoading || apiLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.name} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                      <p
                        className={`text-sm mt-2 ${
                          stat.changeType === 'positive'
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {stat.change}
                      </p>
                    </div>
                    <div className="bg-primary-50 rounded-full p-3">
                      <Icon className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Performance Cards - Show skeleton while loading */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsLoading || apiLoading ? (
            <>
              <PerformanceCardSkeleton />
              <PerformanceCardSkeleton />
              <PerformanceCardSkeleton />
              <PerformanceCardSkeleton />
            </>
          ) : (
            performanceCards.map((card) => {
              const Icon = card.icon
              return (
                <div key={card.name} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center space-x-3">
                    <div className={`bg-${card.color}-50 rounded-full p-3`}>
                      <Icon className={`w-6 h-6 text-${card.color}-600`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">{card.name}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Leads</h2>
            <div className="space-y-4">
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
                  <div key={lead.id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-medium text-gray-900">{lead.companyName || lead.name}</p>
                      <p className="text-sm text-gray-500">{lead.industry} • {lead.city}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getTierBadgeColor(
                          lead.qualityScore >= 80 ? 'hot' : lead.qualityScore >= 60 ? 'warm' : 'cold'
                        )}`}
                      >
                        {lead.qualityScore >= 80 ? 'HOT' : lead.qualityScore >= 60 ? 'WARM' : 'COLD'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{lead.qualityScore}/100</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No leads yet. Generate your first leads!</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Distribution</h2>
            <div className="space-y-4">
              {statsLoading ? (
                <>
                  <div className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-8"></div>
                  </div>
                  <div className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-8"></div>
                  </div>
                  <div className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-3 h-3 rounded-full bg-gray-200"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-8"></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-gray-700">Hot Leads (80+)</span>
                    </div>
                    <span className="font-semibold text-gray-900">{stats?.hotLeads || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-gray-700">Warm Leads (60-79)</span>
                    </div>
                    <span className="font-semibold text-gray-900">{stats?.warmLeads || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-gray-700">Cold Leads (&lt;60)</span>
                    </div>
                    <span className="font-semibold text-gray-900">{stats?.coldLeads || 0}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">Total</span>
                      <span className="font-bold text-gray-900 text-lg">{stats?.totalLeads || 0}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
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
