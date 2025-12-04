import { X, CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react'

interface ResultStat {
  label: string
  value: number | string
  highlight?: boolean
}

interface ResultAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

interface ResultDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message?: string
  variant?: 'success' | 'warning' | 'error' | 'info'
  stats?: ResultStat[]
  actions?: ResultAction[]
}

export default function ResultDialog({
  isOpen,
  onClose,
  title,
  message,
  variant = 'success',
  stats,
  actions,
}: ResultDialogProps) {
  if (!isOpen) return null

  const variantStyles = {
    success: {
      icon: CheckCircle,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
    },
    error: {
      icon: XCircle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
    },
    info: {
      icon: TrendingUp,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
    },
  }

  const style = variantStyles[variant]
  const Icon = style.icon

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-start gap-4 flex-1">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${style.iconBg} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${style.iconColor}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
              {message && <p className="text-sm text-gray-600 leading-relaxed">{message}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Section */}
        {stats && stats.length > 0 && (
          <div className="px-6 pb-4">
            <div className={`border ${style.borderColor} rounded-lg divide-y divide-gray-200`}>
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between px-4 py-3 ${
                    stat.highlight ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <span className="text-sm text-gray-600">{stat.label}</span>
                  <span className={`text-sm font-semibold ${stat.highlight ? 'text-gray-900' : 'text-gray-700'}`}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
          {actions && actions.length > 0 ? (
            <>
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={
                    action.variant === 'primary'
                      ? 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors'
                      : 'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
                  }
                >
                  {action.label}
                </button>
              ))}
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
