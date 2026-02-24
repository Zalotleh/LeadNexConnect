// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/Layout'
import ProtectedRoute from '../../components/ProtectedRoute'
import api from '../../services/api'
import {
  Monitor, Smartphone, Tablet, X, Users, Activity, Clock,
  RefreshCw, Download, Shield, AlertTriangle, CheckCircle2,
  ChevronRight, Wifi, LogOut,
} from 'lucide-react'

interface Session {
  id: string
  userId: string
  userName: string
  userEmail: string
  userRole: string
  ipAddress: string | null
  userAgent: string | null
  expiresAt: string
  createdAt: string
  lastUsedAt: string
}

interface SessionStats {
  totalActive: number
  totalSessions: number
  recentActivity: number
  topUsers: Array<{ userName: string; userEmail: string; count: number }>
}

// ── Toast ────────────────────────────────────────────────────────────────────
interface Toast {
  id: number
  type: 'success' | 'error'
  message: string
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
interface ConfirmState {
  open: boolean
  title: string
  body: string
  onConfirm: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseUserAgent = (ua: string | null) => {
  if (!ua) return { browser: 'Unknown', os: 'Unknown' }
  let browser = 'Unknown', os = 'Unknown'
  if (ua.includes('Edg')) browser = 'Edge'
  else if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari')) browser = 'Safari'

  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iOS')) os = 'iOS'

  return { browser, os }
}

const getDeviceType = (ua: string | null) => {
  if (!ua) return 'desktop'
  const u = ua.toLowerCase()
  if (u.includes('mobile') || u.includes('android') || u.includes('iphone')) return 'mobile'
  if (u.includes('tablet') || u.includes('ipad')) return 'tablet'
  return 'desktop'
}

const formatRelative = (dateString: string) => {
  const diff = Date.now() - new Date(dateString).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const isExpiringSoon = (expiresAt: string) => {
  const diff = new Date(expiresAt).getTime() - Date.now()
  return diff > 0 && diff < 3 * 60 * 60 * 1000 // < 3 hours
}

// ── Device Icon ───────────────────────────────────────────────────────────────
const DeviceIcon = ({ ua }: { ua: string | null }) => {
  const type = getDeviceType(ua)
  if (type === 'mobile') return (
    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
      <Smartphone className="w-4 h-4 text-blue-600" />
    </div>
  )
  if (type === 'tablet') return (
    <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
      <Tablet className="w-4 h-4 text-green-600" />
    </div>
  )
  return (
    <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
      <Monitor className="w-4 h-4 text-indigo-600" />
    </div>
  )
}

export default function AdminSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false, title: '', body: '', onConfirm: () => {},
  })

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now()
    setToasts(t => [...t, { id, type, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  const openConfirm = (title: string, body: string, onConfirm: () => void) =>
    setConfirm({ open: true, title, body, onConfirm })

  const closeConfirm = () => setConfirm(c => ({ ...c, open: false }))

  const fetchSessions = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.get('/admin/sessions')
      if (res.data.success) setSessions(res.data.data.sessions || [])
    } catch (err: any) {
      addToast('error', err.response?.data?.error?.message || 'Failed to load sessions')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const res = await api.get('/admin/sessions/stats')
      if (res.data.success) setStats(res.data.data)
    } catch { /* silent */ } finally {
      setStatsLoading(false)
    }
  }

  const refresh = () => {
    fetchSessions(true)
    fetchStats()
  }

  useEffect(() => {
    fetchSessions()
    fetchStats()
  }, [])

  const handleRevoke = (sessionId: string) => {
    openConfirm(
      'Revoke Session',
      'This will immediately log the user out of this session. Are you sure?',
      async () => {
        closeConfirm()
        setRevokingId(sessionId)
        try {
          const res = await api.delete(`/admin/sessions/${sessionId}`)
          if (res.data.success) {
            setSessions(s => s.filter(x => x.id !== sessionId))
            fetchStats()
            addToast('success', 'Session revoked successfully')
          }
        } catch (err: any) {
          addToast('error', err.response?.data?.error?.message || 'Failed to revoke session')
        } finally {
          setRevokingId(null)
        }
      },
    )
  }

  const handleRevokeAll = (userId: string, userName: string) => {
    openConfirm(
      `Revoke All Sessions for ${userName}`,
      `This will log ${userName} out of all devices immediately. This action cannot be undone.`,
      async () => {
        closeConfirm()
        try {
          const res = await api.delete(`/admin/sessions/users/${userId}/revoke-all`)
          if (res.data.success) {
            setSessions(s => s.filter(x => x.userId !== userId))
            fetchStats()
            addToast('success', res.data.message || 'All sessions revoked')
          }
        } catch (err: any) {
          addToast('error', err.response?.data?.error?.message || 'Failed to revoke sessions')
        }
      },
    )
  }

  const handleExport = async () => {
    try {
      const res = await api.get('/api/admin/export/sessions', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `sessions-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      addToast('success', 'Export started')
    } catch {
      addToast('error', 'Failed to export sessions')
    }
  }

  const maxSessions = stats?.topUsers?.[0]?.count || 1

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="space-y-6">

          {/* ── Toasts ────────────────────────────────────────────────── */}
          <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
            {toasts.map(t => (
              <div
                key={t.id}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto transition-all
                  ${t.type === 'success'
                    ? 'bg-white border border-green-200 text-green-800'
                    : 'bg-white border border-red-200 text-red-700'}`}
              >
                {t.type === 'success'
                  ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                {t.message}
              </div>
            ))}
          </div>

          {/* ── Confirm Modal ──────────────────────────────────────────── */}
          {confirm.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{confirm.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{confirm.body}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={closeConfirm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirm.onConfirm}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Header ────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-7 h-7 text-primary-600" />
                Session Management
              </h1>
              <p className="text-gray-500 mt-1 text-sm">Monitor and manage all active user sessions across devices.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={refresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* ── KPI Cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Active Sessions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-sm font-medium text-gray-500">Active Sessions</p>
                <div className="w-11 h-11 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Wifi className="w-5 h-5 text-green-600" />
                </div>
              </div>
              {statsLoading ? (
                <div className="h-9 w-16 bg-gray-200 rounded animate-pulse mb-1.5" />
              ) : (
                <p className="text-4xl font-bold text-gray-900 tabular-nums">{stats?.totalActive ?? 0}</p>
              )}
              <p className="text-xs text-gray-400 mt-1.5 mb-4">Currently online</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: stats?.totalActive ? '100%' : '0%' }} />
              </div>
            </div>

            {/* Total Sessions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                <div className="w-11 h-11 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              {statsLoading ? (
                <div className="h-9 w-16 bg-gray-200 rounded animate-pulse mb-1.5" />
              ) : (
                <p className="text-4xl font-bold text-gray-900 tabular-nums">{stats?.totalSessions ?? 0}</p>
              )}
              <p className="text-xs text-gray-400 mt-1.5 mb-4">All session records</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: stats?.totalSessions ? '100%' : '0%' }} />
              </div>
            </div>

            {/* Last 24h */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-sm font-medium text-gray-500">Last 24 Hours</p>
                <div className="w-11 h-11 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              {statsLoading ? (
                <div className="h-9 w-16 bg-gray-200 rounded animate-pulse mb-1.5" />
              ) : (
                <p className="text-4xl font-bold text-gray-900 tabular-nums">{stats?.recentActivity ?? 0}</p>
              )}
              <p className="text-xs text-gray-400 mt-1.5 mb-4">Recent logins</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: stats?.recentActivity ? '80%' : '0%' }} />
              </div>
            </div>

            {/* Most Active */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-sm font-medium text-gray-500">Most Active</p>
                <div className="w-11 h-11 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-orange-500" />
                </div>
              </div>
              {statsLoading ? (
                <div className="h-9 w-28 bg-gray-200 rounded animate-pulse mb-1.5" />
              ) : (
                <p className="text-lg font-bold text-gray-900 truncate mt-1">{stats?.topUsers?.[0]?.userName || '—'}</p>
              )}
              <p className="text-xs text-gray-400 mt-1.5 mb-4">{stats?.topUsers?.[0]?.count ?? 0} sessions</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full" style={{ width: stats?.topUsers?.[0] ? '70%' : '0%' }} />
              </div>
            </div>
          </div>

          {/* ── Sessions Table ─────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary-600" />
                  <h2 className="text-base font-semibold text-gray-900">Active Sessions</h2>
                  {!loading && (
                    <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      {sessions.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">All currently active user sessions</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-500">No active sessions</p>
                <p className="text-xs text-gray-400 mt-1">All users are currently logged out</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Device</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">User</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">IP Address</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Browser / OS</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Last Active</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Expires</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sessions.map(session => {
                      const { browser, os } = parseUserAgent(session.userAgent)
                      const expiring = isExpiringSoon(session.expiresAt)
                      return (
                        <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <DeviceIcon ua={session.userAgent} />
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-indigo-700">
                                  {(session.userName || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{session.userName || 'Unknown'}</div>
                                <div className="text-xs text-gray-400">{session.userEmail || '—'}</div>
                                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full border mt-0.5
                                  ${session.userRole === 'admin'
                                    ? 'text-purple-700 bg-purple-50 border-purple-200'
                                    : 'text-blue-700 bg-blue-50 border-blue-200'}`}>
                                  {session.userRole}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-sm font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg">
                              {session.ipAddress || '—'}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-700 font-medium">{browser}</div>
                            <div className="text-xs text-gray-400">{os}</div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-700">{formatRelative(session.lastUsedAt)}</div>
                            <div className="text-xs text-gray-400">{formatDate(session.lastUsedAt)}</div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            {expiring ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                <Clock className="w-3 h-3" />
                                Expiring soon
                              </span>
                            ) : (
                              <div className="text-sm text-gray-500">{formatDate(session.expiresAt)}</div>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleRevoke(session.id)}
                              disabled={revokingId === session.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {revokingId === session.id ? (
                                <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <LogOut className="w-3 h-3" />
                              )}
                              Revoke
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Top Active Users ───────────────────────────────────────── */}
          {stats && stats.topUsers.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-600" />
                  <h2 className="text-base font-semibold text-gray-900">Most Active Users</h2>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Users with the most active sessions</p>
              </div>
              <div className="divide-y divide-gray-100">
                {stats.topUsers.slice(0, 5).map((user, index) => {
                  const userId = sessions.find(s => s.userEmail === user.userEmail)?.userId
                  const barPct = Math.round((user.count / maxSessions) * 100)
                  return (
                    <div key={index} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                        ${index === 0 ? 'bg-yellow-100 text-yellow-700'
                        : index === 1 ? 'bg-gray-100 text-gray-600'
                        : index === 2 ? 'bg-orange-100 text-orange-700'
                        : 'bg-indigo-50 text-indigo-600'}`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{user.userName}</span>
                            <span className="text-xs text-gray-400 ml-2">{user.userEmail}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-700 tabular-nums flex-shrink-0 ml-2">
                            {user.count} session{user.count > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                      {userId && (
                        <button
                          onClick={() => handleRevokeAll(userId, user.userName)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                          Revoke All
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </Layout>
    </ProtectedRoute>
  )
}
