import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import Layout from '@/components/Layout'
import { TrendingUp, Users, Mail, Target, Activity, Zap, Award, MousePointerClick } from 'lucide-react'
import { dashboardAPI } from '@/services/api'

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// Skeleton Components
const MetricCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
        <div className="h-8 bg-gray-200 rounded w-20"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="bg-gray-200 rounded-full p-3 w-12 h-12"></div>
    </div>
  </div>
)

const SectionSkeleton = () => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
    <div className="space-y-4">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  </div>
)

export default function Analytics() {
  const [viewMode, setViewMode] = useState<'monthly' | 'allTime'>('allTime')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Fetch analytics data
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

  // Calculate metrics
  const conversionRate = analyticsData?.leads?.total > 0
    ? ((analyticsData.leads.converted || 0) / analyticsData.leads.total * 100).toFixed(1)
    : '0.0'

  const responseRate = analyticsData?.emails?.sent > 0
    ? ((analyticsData.emails.replied || 0) / analyticsData.emails.sent * 100).toFixed(1)
    : '0.0'

  const avgLeadScore = analyticsData?.quality?.avgScore || 0

  const openRate = analyticsData?.emails?.openRate || 0
  const clickRate = analyticsData?.emails?.clickRate || 0

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Date Filter */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-2">Track your performance and insights</p>
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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{conversionRate}%</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {analyticsData?.leads?.converted || 0} / {analyticsData?.leads?.total || 0} converted
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-full p-3">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Email Response Rate</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{responseRate}%</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {analyticsData?.emails?.replied || 0} / {analyticsData?.emails?.sent || 0} replied
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-full p-3">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Lead Score</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{avgLeadScore}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Out of 100
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-full p-3">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-50 rounded-full p-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Open Rate</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{openRate}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-50 rounded-full p-3">
                    <MousePointerClick className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Click Rate</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{clickRate}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-yellow-50 rounded-full p-3">
                    <Zap className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{analyticsData?.campaigns?.active || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-50 rounded-full p-3">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Leads</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{analyticsData?.leads?.total || 0}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Lead Quality Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <>
              <SectionSkeleton />
              <SectionSkeleton />
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Quality Distribution</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-gray-700">High Quality (75+)</span>
                    </div>
                    <span className="font-semibold text-gray-900">{analyticsData?.quality?.high || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-gray-700">Medium Quality (50-74)</span>
                    </div>
                    <span className="font-semibold text-gray-900">{analyticsData?.quality?.medium || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-gray-700">Low Quality (&lt;50)</span>
                    </div>
                    <span className="font-semibold text-gray-900">{analyticsData?.quality?.low || 0}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">Average Score</span>
                      <span className="font-bold text-gray-900 text-lg">{analyticsData?.quality?.avgScore || 0}/100</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Status Breakdown</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-gray-700">New</span>
                    </div>
                    <span className="font-semibold text-gray-900">{analyticsData?.leads?.new || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-gray-700">Contacted</span>
                    </div>
                    <span className="font-semibold text-gray-900">{analyticsData?.leads?.contacted || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span className="text-gray-700">Interested</span>
                    </div>
                    <span className="font-semibold text-gray-900">{analyticsData?.leads?.interested || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-gray-700">Converted</span>
                    </div>
                    <span className="font-semibold text-gray-900">{analyticsData?.leads?.converted || 0}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">Total</span>
                      <span className="font-bold text-gray-900 text-lg">{analyticsData?.leads?.total || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Email Performance */}
        {isLoading ? (
          <SectionSkeleton />
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Emails Sent</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData?.emails?.sent || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Opened</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData?.emails?.opened || 0}</p>
                <p className="text-sm text-gray-500 mt-1">{openRate}% rate</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Clicked</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData?.emails?.clicked || 0}</p>
                <p className="text-sm text-gray-500 mt-1">{clickRate}% rate</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Replied</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{analyticsData?.emails?.replied || 0}</p>
                <p className="text-sm text-gray-500 mt-1">{responseRate}% rate</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
