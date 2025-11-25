import { useQuery } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import api from '@/services/api'
import { TrendingUp, Users, Mail, DollarSign } from 'lucide-react'

interface DashboardStats {
  totalLeads: number
  hotLeads: number
  activeCampaigns: number
  emailsSent: number
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/dashboard')
      return data.data
    },
  })

  const statCards = [
    {
      name: 'Total Leads',
      value: stats?.totalLeads || 0,
      icon: Users,
      change: '+12%',
      changeType: 'positive',
    },
    {
      name: 'Hot Leads',
      value: stats?.hotLeads || 0,
      icon: TrendingUp,
      change: '+8%',
      changeType: 'positive',
    },
    {
      name: 'Active Campaigns',
      value: stats?.activeCampaigns || 0,
      icon: Mail,
      change: '3 active',
      changeType: 'neutral',
    },
    {
      name: 'Emails Sent',
      value: stats?.emailsSent || 0,
      icon: DollarSign,
      change: '+23%',
      changeType: 'positive',
    },
  ]

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
                          : stat.changeType === 'negative'
                          ? 'text-red-600'
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

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Leads</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Loading recent leads...</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Loading campaign data...</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
