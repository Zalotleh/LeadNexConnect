import { useQuery } from '@tanstack/react-query';
import { X, Clock, User, Mail, Database, FileText, Settings, LogIn } from 'lucide-react';
import api from '@/services/api';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  changes: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface UserActivityTimelineProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

const getActionIcon = (action: string, entity: string) => {
  if (action.includes('login')) return <LogIn className="w-5 h-5" />;
  if (entity === 'user') return <User className="w-5 h-5" />;
  if (entity === 'email' || entity === 'campaign') return <Mail className="w-5 h-5" />;
  if (entity === 'lead') return <Database className="w-5 h-5" />;
  if (entity === 'template' || entity === 'workflow') return <FileText className="w-5 h-5" />;
  if (entity === 'config' || entity === 'settings') return <Settings className="w-5 h-5" />;
  return <Clock className="w-5 h-5" />;
};

const getActionColor = (action: string) => {
  if (action.includes('create')) return 'bg-green-100 text-green-800 border-green-200';
  if (action.includes('update')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (action.includes('delete')) return 'bg-red-100 text-red-800 border-red-200';
  if (action.includes('login')) return 'bg-purple-100 text-purple-800 border-purple-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

const formatActionText = (action: string, entity: string) => {
  const actionParts = action.split('_');
  const verb = actionParts[0].charAt(0).toUpperCase() + actionParts[0].slice(1);
  const entityName = entity.charAt(0).toUpperCase() + entity.slice(1);
  
  if (action === 'login') return 'Logged in';
  if (action === 'logout') return 'Logged out';
  
  return `${verb} ${entityName}`;
};

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
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
};

export default function UserActivityTimeline({ userId, userName, onClose }: UserActivityTimelineProps) {
  const { data: activities, isLoading } = useQuery<AuditLog[]>({
    queryKey: ['user-audit-history', userId],
    queryFn: async () => {
      const response = await api.get(`/admin/audit-logs/users/${userId}?limit=100`);
      return response.data.data.logs;
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Activity Timeline</h2>
            <p className="text-sm text-gray-600 mt-1">{userName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={activity.id} className="flex">
                  {/* Timeline Line */}
                  <div className="flex flex-col items-center mr-4">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${getActionColor(
                        activity.action
                      )}`}
                    >
                      {getActionIcon(activity.action, activity.entity)}
                    </div>
                    {index < activities.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                    )}
                  </div>

                  {/* Activity Card */}
                  <div className="flex-1 pb-8">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {formatActionText(activity.action, activity.entity)}
                          </p>
                          {activity.entityId && (
                            <p className="text-sm text-gray-500 mt-1">
                              ID: {activity.entityId.substring(0, 8)}...
                            </p>
                          )}
                          {activity.ipAddress && (
                            <p className="text-xs text-gray-400 mt-1">
                              From: {activity.ipAddress}
                            </p>
                          )}
                          {activity.changes && Object.keys(activity.changes).length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs text-indigo-600 cursor-pointer hover:text-indigo-800">
                                View changes
                              </summary>
                              <pre className="mt-2 text-xs bg-white p-2 rounded border border-gray-200 overflow-auto max-h-32">
                                {JSON.stringify(activity.changes, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                          {formatRelativeTime(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Clock className="w-16 h-16 mb-4 text-gray-300" />
              <p>No activity recorded for this user</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
