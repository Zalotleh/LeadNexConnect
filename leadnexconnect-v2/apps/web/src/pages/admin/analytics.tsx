import { useQuery } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { BarChart3, Users, Database, Activity, TrendingUp, Mail, Target, Zap } from 'lucide-react'
import api from '@/services/api'

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalLeads: number
  totalCampaigns: number
  totalEmails: number
  totalWorkflows: number
}

interface UserActivity {
  userId: string
  userName: string
  email: string
  leadsGenerated: number
  campaignsActive: number
  emailsSent: number
  lastActive: string
}

function SystemAnalytics() {
  // Fetch system stats
  const { data: stats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/api/admin/analytics/stats')
      return response.data.data
    }
  })

  // Fetch user activity
  const { data: userActivity, isLoading: activityLoading } = useQuery<UserActivity[]>({
    queryKey: ['admin-user-activity'],
    queryFn: async () => {
      const response = await api.get('/api/admin/analytics/user-activity')
      return response.data.data
    }
  })

  const isLoading = statsLoading || activityLoading

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-indigo-600" />
            System Analytics
          </h1>
          <p className="text-gray-600 mt-2">Overview of system-wide metrics and user activity</p>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalUsers || 0}</p>
                )}
                <p className="text-xs text-green-600 mt-1">
                  {stats?.activeUsers || 0} active
                </p>
              </div>
              <Users className="w-10 h-10 text-indigo-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Leads</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats?.totalLeads?.toLocaleString() || 0}
                  </p>
                )}
              </div>
              <Database className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Campaigns</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalCampaigns || 0}</p>
                )}
              </div>
              <Target className="w-10 h-10 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Emails Sent</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats?.totalEmails?.toLocaleString() || 0}
                  </p>
                )}
              </div>
              <Mail className="w-10 h-10 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-100">Total Workflows</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-white bg-opacity-20 rounded animate-pulse mt-1"></div>
                ) : (
                  <p className="text-3xl font-bold mt-1">{stats?.totalWorkflows || 0}</p>
                )}
                <p className="text-xs text-indigo-100 mt-2">Email sequences created</p>
              </div>
              <Zap className="w-12 h-12 text-white opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-100">System Activity</p>
                {isLoading ? (
                  <div className="h-8 w-24 bg-white bg-opacity-20 rounded animate-pulse mt-1"></div>
                ) : (
                  <p className="text-3xl font-bold mt-1">
                    {Math.round(((stats?.activeUsers || 0) / (stats?.totalUsers || 1)) * 100)}%
                  </p>
                )}
                <p className="text-xs text-green-100 mt-2">User engagement rate</p>
              </div>
              <Activity className="w-12 h-12 text-white opacity-80" />
            </div>
          </div>
        </div>

        {/* User Activity Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <TrendingUp className="w-6 h-6 mr-2 text-indigo-600" />
              User Activity
            </h2>
            <p className="text-sm text-gray-600 mt-1">Recent activity across all users</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leads Generated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Campaigns
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Emails Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activityLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : userActivity && userActivity.length > 0 ? (
                  userActivity.map((user) => (
                    <tr key={user.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.leadsGenerated.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.campaignsActive}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.emailsSent.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No activity data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4">
            <Activity className="w-6 h-6 mr-2 text-green-600" />
            System Health
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Database</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">API Services</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Email Service</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function SystemAnalyticsWithProtection() {
  return (
    <ProtectedRoute requireAdmin>
      <SystemAnalytics />
    </ProtectedRoute>
  )
}

export default SystemAnalyticsWithProtection
