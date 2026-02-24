// @ts-nocheck
import { useQuery } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import {
  BarChart3, Users, Database, Activity, TrendingUp, Mail, Target, Zap,
  PieChart, LineChart, CheckCircle2,
} from 'lucide-react'
import api from '@/services/api'
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

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
  stats: {
    totalLeads: number
    highPotential: number
    mediumPotential: number
    lowPotential: number
    totalCampaigns: number
    activeCampaigns: number
    totalWorkflows: number
    totalTemplates: number
    emailsSent: number
    emailsOpened: number
    emailsClicked: number
    emailsDelivered: number
    engagementRate: number
  }
  lastActiveAt: string | null
  lastLoginAt: string | null
  createdAt: string
}

interface LeadsTrendData {
  date: string
  count: number
}

interface CampaignDistribution {
  status: string
  count: number
}

interface EmailEngagement {
  total: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
}

interface LeadTierDistribution {
  tier: string
  count: number
}

const COLORS = {
  primary: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'],
  status: {
    active: '#10b981',
    paused: '#f59e0b',
    completed: '#3b82f6',
    draft: '#6b7280',
  },
  tier: {
    high: '#10b981',
    medium: '#f59e0b',
    low: '#ef4444',
  },
}

// ─── Empty chart placeholder ─────────────────────────────────────────────────
const ChartEmpty = ({ icon: Icon }: { icon: any }) => (
  <div className="h-[300px] flex flex-col items-center justify-center gap-2">
    <Icon className="w-8 h-8 text-gray-300" />
    <p className="text-sm text-gray-400">No data available</p>
  </div>
)

function SystemAnalytics() {
  const { data: stats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics/overview')
      // Backend returns: { users: { total, active, admins }, data: { totalLeads, totalCampaigns, totalEmails, totalWorkflows } }
      const d = response.data.data
      return {
        totalUsers: d?.users?.total || 0,
        activeUsers: d?.users?.active || 0,
        totalLeads: d?.data?.totalLeads || 0,
        totalCampaigns: d?.data?.totalCampaigns || 0,
        totalEmails: d?.data?.totalEmails || 0,
        totalWorkflows: d?.data?.totalWorkflows || 0,
      }
    },
  })

  const { data: userActivity, isLoading: activityLoading } = useQuery<UserActivity[]>({
    queryKey: ['admin-user-activity'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics/users')
      return response.data.data
    },
  })

  const { data: leadsTrend } = useQuery<LeadsTrendData[]>({
    queryKey: ['admin-leads-trend'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics/charts/leads-trend')
      const rows = response.data.data || []
      return rows.map((item: any) => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: Number(item.count),
      }))
    },
  })

  const { data: campaignDistribution } = useQuery<CampaignDistribution[]>({
    queryKey: ['admin-campaign-distribution'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics/charts/campaign-distribution')
      const rows = response.data.data || []
      return rows.map((item: any) => ({
        status: item.status || 'unknown',
        count: Number(item.count),
      }))
    },
  })

  const { data: emailEngagement } = useQuery<EmailEngagement>({
    queryKey: ['admin-email-engagement'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics/charts/email-engagement')
      return response.data.data
    },
  })

  const { data: leadTiers } = useQuery<LeadTierDistribution[]>({
    queryKey: ['admin-lead-tiers'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics/charts/lead-tiers')
      const rows = response.data.data || []
      return rows
        .filter((item: any) => item.tier !== null && item.tier !== undefined)
        .map((item: any) => ({
          tier: item.tier || 'unknown',
          count: Number(item.count),
        }))
    },
  })

  const isLoading = statsLoading || activityLoading

  const emailEngagementData = emailEngagement
    ? [
        { name: 'Delivered', value: emailEngagement.delivered, fill: COLORS.primary[0] },
        { name: 'Opened',    value: emailEngagement.opened,    fill: COLORS.primary[1] },
        { name: 'Clicked',   value: emailEngagement.clicked,   fill: COLORS.primary[2] },
        { name: 'Bounced',   value: emailEngagement.bounced,   fill: COLORS.primary[3] },
      ]
    : []

  const leadTierData = leadTiers
    ? leadTiers.map((item) => ({
        name: item.tier.charAt(0).toUpperCase() + item.tier.slice(1),
        value: item.count,
        fill: COLORS.tier[item.tier as keyof typeof COLORS.tier] || COLORS.primary[0],
      }))
    : []

  const campaignDistData = campaignDistribution
    ? campaignDistribution.map((item, index) => ({
        name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
        count: item.count,
        fill: COLORS.status[item.status as keyof typeof COLORS.status] || COLORS.primary[index],
      }))
    : []

  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)
  const totalUsers    = stats?.totalUsers    || 0
  const activeUsers   = stats?.activeUsers   || 0
  const totalLeads    = stats?.totalLeads    || 0
  const totalCampaigns = stats?.totalCampaigns || 0
  const totalEmails   = stats?.totalEmails   || 0
  const totalWorkflows = stats?.totalWorkflows || 0
  const engagementRate = pct(activeUsers, totalUsers)

  return (
    <Layout>
      <div className="space-y-6">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary-600" />
            System Analytics
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Overview of system-wide metrics and user activity.</p>
        </div>

        {/* ── Primary KPI Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <div className="w-11 h-11 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-9 bg-gray-200 rounded w-20 animate-pulse mb-1.5" />
            ) : (
              <p className="text-4xl font-bold text-gray-900 tabular-nums">{totalUsers}</p>
            )}
            <p className="text-xs text-gray-400 mt-1.5 mb-4">{activeUsers} currently active</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: totalUsers > 0 ? '100%' : '0%' }} />
            </div>
          </div>

          {/* Total Leads */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-sm font-medium text-gray-500">Total Leads</p>
              <div className="w-11 h-11 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Database className="w-5 h-5 text-green-600" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-9 bg-gray-200 rounded w-20 animate-pulse mb-1.5" />
            ) : (
              <p className="text-4xl font-bold text-gray-900 tabular-nums">{totalLeads.toLocaleString()}</p>
            )}
            <p className="text-xs text-gray-400 mt-1.5 mb-4">Across all user accounts</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: totalLeads > 0 ? '100%' : '0%' }} />
            </div>
          </div>

          {/* Total Campaigns */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-sm font-medium text-gray-500">Total Campaigns</p>
              <div className="w-11 h-11 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-9 bg-gray-200 rounded w-20 animate-pulse mb-1.5" />
            ) : (
              <p className="text-4xl font-bold text-gray-900 tabular-nums">{totalCampaigns}</p>
            )}
            <p className="text-xs text-gray-400 mt-1.5 mb-4">Active outreach campaigns</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: Math.min(100, totalCampaigns * 5) + '%' }} />
            </div>
          </div>

          {/* Emails Sent */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-sm font-medium text-gray-500">Emails Sent</p>
              <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-9 bg-gray-200 rounded w-20 animate-pulse mb-1.5" />
            ) : (
              <p className="text-4xl font-bold text-gray-900 tabular-nums">{totalEmails.toLocaleString()}</p>
            )}
            <p className="text-xs text-gray-400 mt-1.5 mb-4">System-wide email volume</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: totalEmails > 0 ? '100%' : '0%' }} />
            </div>
          </div>
        </div>

        {/* ── Charts ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads Trend */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                <LineChart className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Leads Generated (30 Days)</h2>
            </div>
            {leadsTrend && leadsTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={leadsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} name="Leads" dot={{ fill: '#6366f1', r: 3 }} />
                </RechartsLineChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty icon={LineChart} />
            )}
          </div>

          {/* Campaign Status */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Campaign Status</h2>
            </div>
            {campaignDistData && campaignDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={campaignDistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                  <Legend />
                  <Bar dataKey="count" name="Campaigns" radius={[4, 4, 0, 0]}>
                    {campaignDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty icon={BarChart3} />
            )}
          </div>

          {/* Email Engagement */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <PieChart className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Email Engagement</h2>
            </div>
            {emailEngagementData && emailEngagementData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={emailEngagementData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {emailEngagementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty icon={PieChart} />
            )}
          </div>

          {/* Lead Quality Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Lead Quality Distribution</h2>
            </div>
            {leadTierData && leadTierData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={leadTierData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {leadTierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty icon={TrendingUp} />
            )}
          </div>
        </div>

        {/* ── Secondary Stats ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-indigo-100 font-medium">Total Workflows</p>
                {isLoading ? (
                  <div className="h-9 w-16 bg-white/20 rounded animate-pulse mt-2" />
                ) : (
                  <p className="text-4xl font-bold tabular-nums mt-2">{totalWorkflows}</p>
                )}
                <p className="text-xs text-indigo-200 mt-2">Email sequences created</p>
              </div>
              <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-sm p-6 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-green-100 font-medium">System Activity</p>
                {isLoading ? (
                  <div className="h-9 w-24 bg-white/20 rounded animate-pulse mt-2" />
                ) : (
                  <p className="text-4xl font-bold tabular-nums mt-2">{engagementRate}%</p>
                )}
                <p className="text-xs text-green-200 mt-2">User engagement rate</p>
              </div>
              <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* ── User Activity Table ───────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <h2 className="text-base font-semibold text-gray-900">User Activity</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Recent activity across all users</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">User</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Leads</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Active Campaigns</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Emails Sent</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activityLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-7 h-7 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : userActivity && userActivity.length > 0 ? (
                  userActivity.map((user) => (
                    <tr key={user.userId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="w-3.5 h-3.5 text-indigo-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{user.userName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900 tabular-nums">{user.stats.totalLeads.toLocaleString()}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-900 tabular-nums">{user.stats.activeCampaigns}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-900 tabular-nums">{user.stats.emailsSent.toLocaleString()}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-400 tabular-nums">
                        {user.lastActiveAt
                          ? new Date(user.lastActiveAt).toLocaleDateString()
                          : <span className="italic">Never</span>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center">
                      <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No activity data available</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── System Health ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-5 h-5 text-green-600" />
            <h2 className="text-base font-semibold text-gray-900">System Health</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Database',      status: 'Healthy',     badge: 'text-green-700 bg-green-50 border-green-200' },
              { label: 'API Services',  status: 'Operational', badge: 'text-green-700 bg-green-50 border-green-200' },
              { label: 'Email Service', status: 'Active',      badge: 'text-green-700 bg-green-50 border-green-200' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${item.badge}`}>
                  {item.status}
                </span>
              </div>
            ))}
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
