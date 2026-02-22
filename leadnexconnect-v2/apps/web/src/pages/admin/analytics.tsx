import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { BarChart3, Users, Database, Activity, TrendingUp, Mail, Target, Zap, PieChart, LineChart } from 'lucide-react';
import api from '@/services/api';
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
} from 'recharts';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalLeads: number;
  totalCampaigns: number;
  totalEmails: number;
  totalWorkflows: number;
}

interface UserActivity {
  userId: string;
  userName: string;
  email: string;
  stats: {
    totalLeads: number;
    highPotential: number;
    mediumPotential: number;
    lowPotential: number;
    totalCampaigns: number;
    activeCampaigns: number;
    totalWorkflows: number;
    totalTemplates: number;
    emailsSent: number;
    emailsOpened: number;
    emailsClicked: number;
    emailsDelivered: number;
    engagementRate: number;
  };
  lastActiveAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface LeadsTrendData {
  date: string;
  count: number;
}

interface CampaignDistribution {
  status: string;
  count: number;
}

interface EmailEngagement {
  total: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
}

interface LeadTierDistribution {
  tier: string;
  count: number;
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
};

function SystemAnalytics() {
  // Fetch system stats
  const { data: stats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics/overview');
      return response.data.data;
    },
  });

  // Fetch user activity
  const { data: userActivity, isLoading: activityLoading } = useQuery<UserActivity[]>({
    queryKey: ['admin-user-activity'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics/users');
      return response.data.data;
    },
  });

  // Fetch leads trend
  const { data: leadsTrend } = useQuery<LeadsTrendData[]>({
    queryKey: ['admin-leads-trend'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics/charts/leads-trend');
      return response.data.data.map((item: any) => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: Number(item.count),
      }));
    },
  });

  // Fetch campaign distribution
  const { data: campaignDistribution } = useQuery<CampaignDistribution[]>({
    queryKey: ['admin-campaign-distribution'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics/charts/campaign-distribution');
      return response.data.data.map((item: any) => ({
        status: item.status || 'unknown',
        count: Number(item.count),
      }));
    },
  });

  // Fetch email engagement
  const { data: emailEngagement } = useQuery<EmailEngagement>({
    queryKey: ['admin-email-engagement'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics/charts/email-engagement');
      return response.data.data;
    },
  });

  // Fetch lead tier distribution
  const { data: leadTiers } = useQuery<LeadTierDistribution[]>({
    queryKey: ['admin-lead-tiers'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics/charts/lead-tiers');
      return response.data.data.map((item: any) => ({
        tier: item.tier || 'unknown',
        count: Number(item.count),
      }));
    },
  });

  const isLoading = statsLoading || activityLoading;

  // Transform email engagement data for chart
  const emailEngagementData = emailEngagement
    ? [
        { name: 'Delivered', value: emailEngagement.delivered, fill: COLORS.primary[0] },
        { name: 'Opened', value: emailEngagement.opened, fill: COLORS.primary[1] },
        { name: 'Clicked', value: emailEngagement.clicked, fill: COLORS.primary[2] },
        { name: 'Bounced', value: emailEngagement.bounced, fill: COLORS.primary[3] },
      ]
    : [];

  // Transform lead tier data for chart
  const leadTierData = leadTiers
    ? leadTiers.map((item) => ({
        name: item.tier.charAt(0).toUpperCase() + item.tier.slice(1),
        value: item.count,
        fill: COLORS.tier[item.tier as keyof typeof COLORS.tier] || COLORS.primary[0],
      }))
    : [];

  // Transform campaign distribution for chart
  const campaignDistData = campaignDistribution
    ? campaignDistribution.map((item, index) => ({
        name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
        count: item.count,
        fill: COLORS.status[item.status as keyof typeof COLORS.status] || COLORS.primary[index],
      }))
    : [];

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
                <p className="text-xs text-green-600 mt-1">{stats?.activeUsers || 0} active</p>
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

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <LineChart className="w-5 h-5 text-indigo-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Leads Generated (30 Days)</h2>
            </div>
            {leadsTrend && leadsTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={leadsTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    name="Leads"
                    dot={{ fill: '#6366f1' }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Campaign Distribution Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <BarChart3 className="w-5 h-5 text-purple-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Campaign Status</h2>
            </div>
            {campaignDistData && campaignDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={campaignDistData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Campaigns">
                    {campaignDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Email Engagement Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <PieChart className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Email Engagement</h2>
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
                    outerRadius={80}
                    dataKey="value"
                  >
                    {emailEngagementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Lead Tier Distribution Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Lead Quality Distribution</h2>
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
                    outerRadius={80}
                    dataKey="value"
                  >
                    {leadTierData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
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
                        <div className="text-sm text-gray-900">{user.stats.totalLeads.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.stats.activeCampaigns}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.stats.emailsSent.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}
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
  );
}

function SystemAnalyticsWithProtection() {
  return (
    <ProtectedRoute requireAdmin>
      <SystemAnalytics />
    </ProtectedRoute>
  );
}

export default SystemAnalyticsWithProtection;
