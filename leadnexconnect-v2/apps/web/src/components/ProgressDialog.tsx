import { Loader2 } from 'lucide-react'

interface ProgressDialogProps {
  isOpen: boolean
  title: string
  message: string
  progress?: number // 0-100, if provided shows determinate progress
  indeterminate?: boolean // Default true, shows spinner
}

export default function ProgressDialog({
  isOpen,
  title,
  message,
  progress,
  indeterminate = true,
}: ProgressDialogProps) {
  if (!isOpen) return null

  const showProgressBar = progress !== undefined && !indeterminate
  const progressPercentage = Math.min(Math.max(progress || 0, 0), 100)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[90vw] sm:max-w-md p-6">
        {/* Header with Spinner */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-600 mb-4 ml-16">{message}</p>

        {/* Progress Bar (if determinate) */}
        {showProgressBar && (
          <div className="ml-16">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right">{progressPercentage}%</p>
          </div>
        )}

        {/* Loading Dots (if indeterminate) */}
        {indeterminate && (
          <div className="flex justify-center gap-1 ml-16">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </div>
  )
}
