import { useQuery } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import { dashboardAPI, apiPerformanceAPI } from '@/services/api'
import { TrendingUp, Users, Mail, DollarSign, Activity, Zap, Target, BarChart3 } from 'lucide-react'

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

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await dashboardAPI.getStats()
      return data.data
    },
  })

  const { data: apiPerformance, isLoading: apiLoading } = useQuery<APIPerformance>({
    queryKey: ['api-performance'],
    queryFn: async () => {
      const { data } = await apiPerformanceAPI.getMonthlyReport()
      const report = data.data
      
      if (!report || report.length === 0) {
        return {
          totalLeadsGenerated: 0,
          totalAPICalls: 0,
          averageQuality: 0,
          topSource: 'N/A'
        }
      }

      const totalLeads = report.reduce((sum: number, r: any) => sum + r.leadsGenerated, 0)
      const totalCalls = report.reduce((sum: number, r: any) => sum + r.apiCallsUsed, 0)
      const avgQuality = report.reduce((sum: number, r: any) => sum + (r.averageQuality || 0), 0) / report.length
      const topSource = report.sort((a: any, b: any) => b.leadsGenerated - a.leadsGenerated)[0]?.apiSource || 'N/A'

      return {
        totalLeadsGenerated: totalLeads,
        totalAPICalls: totalCalls,
        averageQuality: Math.round(avgQuality),
        topSource
      }
    },
  })

  const { data: recentLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ['recent-leads'],
    queryFn: async () => {
      const { data } = await dashboardAPI.getRecentLeads(5)
      return data.data || []
    },
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
      icon: TrendingUp,
      change: `${stats?.warmLeads || 0} warm`,
      changeType: 'positive' as const,
    },
    {
      name: 'Active Campaigns',
      value: stats?.activeCampaigns || 0,
      icon: Mail,
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
      icon: Target,
      color: 'blue',
    },
    {
      name: 'Top Performing Source',
      value: apiPerformance?.topSource || 'N/A',
      icon: Zap,
      color: 'green',
    },
    {
      name: 'Warm Leads',
      value: stats?.warmLeads || 0,
      icon: BarChart3,
      color: 'yellow',
    },
    {
      name: 'Cold Leads',
      value: stats?.coldLeads || 0,
      icon: DollarSign,
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

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-gray-500">Loading...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's your overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
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
          })}
        </div>

        {/* Performance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceCards.map((card) => {
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
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Leads</h2>
            <div className="space-y-4">
              {leadsLoading ? (
                <p className="text-sm text-gray-500">Loading recent leads...</p>
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
                <p className="text-sm text-gray-500">Loading distribution...</p>
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
