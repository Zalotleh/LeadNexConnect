// @ts-nocheck
import { useState, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, ExternalLink, CheckCircle2, XCircle,
  Mail, RefreshCw, Star, Clock, Calendar, Shield, AlertCircle,
} from 'lucide-react'
import { configService } from '@/services/config.service'
import SmtpConfigDialog from '@/components/SmtpConfigDialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import toast from 'react-hot-toast'

// ── Provider meta ──────────────────────────────────────────────────────────────
const SMTP_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  gmail:     { label: 'Gmail',     color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200'    },
  outlook:   { label: 'Outlook',   color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  sendgrid:  { label: 'SendGrid',  color: 'text-sky-700',    bg: 'bg-sky-50',    border: 'border-sky-200'    },
  mailgun:   { label: 'Mailgun',   color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  aws_ses:   { label: 'AWS SES',   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
}

function getSmtpMeta(provider: string) {
  const key = (provider || '').toLowerCase()
  return SMTP_META[key] ?? { label: provider || 'Unknown', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' }
}

function usagePct(used: number, limit: number) {
  if (!limit || limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function usageColor(pct: number) {
  if (pct >= 90) return 'bg-red-400'
  if (pct >= 70) return 'bg-amber-400'
  return 'bg-green-400'
}

export default function SmtpConfigTab() {
  const [configs, setConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<any>(null)

  useEffect(() => { loadConfigs() }, [])

  const loadConfigs = async () => {
    setLoading(true)
    try {
      const data = await configService.getAllSmtpConfigs()
      setConfigs(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load SMTP configurations')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (config: any) => {
    try {
      const full = await configService.getSmtpConfig(config.id, true)
      setEditingConfig(full)
      setDialogOpen(true)
    } catch {
      toast.error('Failed to load config details')
    }
  }

  const handleDelete = async () => {
    if (!configToDelete) return
    try {
      await configService.deleteSmtpConfig(configToDelete.id)
      toast.success(`${getSmtpMeta(configToDelete.provider).label} SMTP config deleted`)
      setDeleteDialogOpen(false)
      setConfigToDelete(null)
      loadConfigs()
    } catch {
      toast.error('Failed to delete configuration')
    }
  }

  const activeCount = configs.filter(c => c.isActive).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-gray-500">
            {configs.length} provider{configs.length !== 1 ? 's' : ''} configured
          </span>
          {activeCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {activeCount} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadConfigs}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setEditingConfig(null); setDialogOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Provider
          </button>
        </div>
      </div>

      {/* ── Empty State ──────────────────────────────────────────────────── */}
      {configs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Mail className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">No SMTP providers</h3>
          <p className="text-xs text-gray-400 mb-5 text-center max-w-xs">
            Add your first email provider to enable outreach campaigns.
          </p>
          <button
            onClick={() => { setEditingConfig(null); setDialogOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Provider
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {configs.map((config) => {
            const meta = getSmtpMeta(config.provider)
            const dailyPct = usagePct(config.emailsSentToday ?? 0, config.dailyLimit ?? 0)
            const hourlyPct = usagePct(config.emailsSentThisHour ?? 0, config.hourlyLimit ?? 0)

            return (
              <div
                key={config.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md
                  ${config.isActive ? 'border-gray-200' : 'border-gray-200 opacity-75'}`}
              >
                {/* Card header */}
                <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-50">
                  {/* Provider icon */}
                  <div className={`w-10 h-10 ${meta.bg} border ${meta.border} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-base font-bold ${meta.color}`}>{meta.label.charAt(0)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${meta.color}`}>{meta.label}</span>

                      {/* Primary badge */}
                      {config.isPrimary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          Primary
                        </span>
                      )}

                      {/* Active / Inactive */}
                      {config.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-full">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-400 mt-0.5">
                      {config.host}:{config.port} · Priority {config.priority ?? '—'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {config.documentationUrl && (
                      <a
                        href={config.documentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Documentation"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleEdit(config)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setConfigToDelete(config); setDeleteDialogOpen(true) }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Usage bars */}
                <div className="px-5 py-4 space-y-3">
                  {/* Daily usage */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        Daily Usage
                      </div>
                      <div className="text-xs font-medium tabular-nums text-gray-700">
                        {(config.emailsSentToday ?? 0).toLocaleString()}
                        {config.dailyLimit ? ` / ${config.dailyLimit.toLocaleString()}` : ''}
                        {config.dailyLimit ? <span className="text-gray-400 font-normal ml-1">({dailyPct}%)</span> : ''}
                      </div>
                    </div>
                    {config.dailyLimit ? (
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${usageColor(dailyPct)}`}
                          style={{ width: `${dailyPct}%` }}
                        />
                      </div>
                    ) : (
                      <div className="h-1.5 bg-gray-100 rounded-full" />
                    )}
                  </div>

                  {/* Hourly usage */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        Hourly Usage
                      </div>
                      <div className="text-xs font-medium tabular-nums text-gray-700">
                        {(config.emailsSentThisHour ?? 0).toLocaleString()}
                        {config.hourlyLimit ? ` / ${config.hourlyLimit.toLocaleString()}` : ''}
                        {config.hourlyLimit ? <span className="text-gray-400 font-normal ml-1">({hourlyPct}%)</span> : ''}
                      </div>
                    </div>
                    {config.hourlyLimit ? (
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${usageColor(hourlyPct)}`}
                          style={{ width: `${hourlyPct}%` }}
                        />
                      </div>
                    ) : (
                      <div className="h-1.5 bg-gray-100 rounded-full" />
                    )}
                  </div>
                </div>

                {/* Setup notes */}
                {config.setupNotes && (
                  <div className="px-5 pb-4 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-500 leading-relaxed">{config.setupNotes}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      {dialogOpen && (
        <SmtpConfigDialog
          open={dialogOpen}
          config={editingConfig}
          onClose={() => { setDialogOpen(false); setEditingConfig(null) }}
          onSaved={() => { setDialogOpen(false); setEditingConfig(null); loadConfigs() }}
        />
      )}
      {deleteDialogOpen && (
        <ConfirmDialog
          open={deleteDialogOpen}
          title="Delete SMTP Configuration"
          message={`Are you sure you want to delete the ${getSmtpMeta(configToDelete?.provider).label} configuration? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => { setDeleteDialogOpen(false); setConfigToDelete(null) }}
        />
      )}
    </>
  )
}
