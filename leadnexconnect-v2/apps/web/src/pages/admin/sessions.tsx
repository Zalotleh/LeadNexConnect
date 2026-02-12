import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import api from '../../services/api';
import { Monitor, Smartphone, Tablet, X, Users, Activity, Clock } from 'lucide-react';

interface Session {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string;
}

interface SessionStats {
  totalActive: number;
  totalSessions: number;
  recentActivity: number;
  topUsers: Array<{ userName: string; userEmail: string; count: number }>;
}

export default function AdminSessions() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  // Fetch active sessions
  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/admin/sessions');

      if (response.data.success) {
        setSessions(response.data.data.sessions);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch session statistics
  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/sessions/stats');

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load session stats:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchStats();
  }, []);

  // Revoke a specific session
  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session? The user will be logged out immediately.')) {
      return;
    }

    try {
      setRevokingSessionId(sessionId);

      const response = await api.delete(`/admin/sessions/${sessionId}`);

      if (response.data.success) {
        // Remove session from list
        setSessions(sessions.filter(s => s.id !== sessionId));
        // Refresh stats
        fetchStats();
        alert('Session revoked successfully');
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to revoke session');
    } finally {
      setRevokingSessionId(null);
    }
  };

  // Revoke all sessions for a user
  const handleRevokeUserSessions = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to revoke ALL sessions for ${userName}? This will log them out of all devices.`)) {
      return;
    }

    try {
      const response = await api.delete(`/admin/sessions/users/${userId}/revoke-all`);

      if (response.data.success) {
        // Remove all user sessions from list
        setSessions(sessions.filter(s => s.userId !== userId));
        // Refresh stats
        fetchStats();
        alert(response.data.message);
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to revoke user sessions');
    }
  };

  // Parse user agent to detect device type
  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return <Monitor className="w-5 h-5 text-gray-400" />;

    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="w-5 h-5 text-blue-500" />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="w-5 h-5 text-green-500" />;
    }
    return <Monitor className="w-5 h-5 text-purple-500" />;
  };

  // Parse user agent to get browser and OS
  const parseUserAgent = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown';

    const ua = userAgent;
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect browser
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    // Detect OS
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return `${browser} on ${os}`;
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Session Management</h1>
            <button
              onClick={() => {
                fetchSessions();
                fetchStats();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Activity className="w-8 h-8 text-green-500 mr-3" />
                  <div>
                    <h3 className="text-gray-500 text-sm font-medium">Active Sessions</h3>
                    <p className="text-3xl font-bold mt-1">{stats.totalActive}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-500 mr-3" />
                  <div>
                    <h3 className="text-gray-500 text-sm font-medium">Total Sessions</h3>
                    <p className="text-3xl font-bold mt-1">{stats.totalSessions}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-purple-500 mr-3" />
                  <div>
                    <h3 className="text-gray-500 text-sm font-medium">Last 24 Hours</h3>
                    <p className="text-3xl font-bold mt-1">{stats.recentActivity}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <Monitor className="w-8 h-8 text-orange-500 mr-3" />
                  <div>
                    <h3 className="text-gray-500 text-sm font-medium">Most Active User</h3>
                    <p className="text-lg font-bold mt-1 truncate">{stats.topUsers[0]?.userName || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{stats.topUsers[0]?.count || 0} sessions</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Sessions Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No active sessions found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Device
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Browser & OS
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Used
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getDeviceIcon(session.userAgent)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{session.userName || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{session.userEmail || 'N/A'}</div>
                              <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-0.5 ${
                                session.userRole === 'admin' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {session.userRole}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.ipAddress || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="max-w-xs truncate" title={session.userAgent || ''}>
                            {parseUserAgent(session.userAgent)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{formatRelativeTime(session.lastUsedAt)}</div>
                          <div className="text-xs text-gray-400">{formatDate(session.lastUsedAt)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(session.expiresAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleRevokeSession(session.id)}
                            disabled={revokingSessionId === session.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                            title="Revoke session"
                          >
                            {revokingSessionId === session.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <>
                                <X className="w-4 h-4 mr-1" />
                                Revoke
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top Active Users */}
          {stats && stats.topUsers.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Most Active Users</h2>
              <div className="space-y-3">
                {stats.topUsers.slice(0, 5).map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                        <div className="text-sm text-gray-500">{user.userEmail}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">
                        {user.count} active session{user.count > 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => {
                          const userId = sessions.find(s => s.userEmail === user.userEmail)?.userId;
                          if (userId) handleRevokeUserSessions(userId, user.userName);
                        }}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Revoke All
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
