import { AlertCircle } from 'lucide-react'

interface InlineErrorProps {
  message: string
  visible: boolean
  className?: string
}

export default function InlineError({ message, visible, className = '' }: InlineErrorProps) {
  if (!visible) return null

  return (
    <div className={`flex items-start gap-2 text-red-600 mt-2 animate-in fade-in slide-in-from-top-1 duration-200 ${className}`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span className="text-sm">{message}</span>
    </div>
  )
}
