// @ts-nocheck
import { useState, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, ExternalLink, CheckCircle2, XCircle,
  Server, RefreshCw, DollarSign, Layers, AlertCircle,
} from 'lucide-react'
import { configService } from '@/services/config.service'
import ApiConfigDialog from '@/components/ApiConfigDialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import toast from 'react-hot-toast'

// ── Provider meta ──────────────────────────────────────────────────────────────
const PROVIDER_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  apollo:              { label: 'Apollo.io',           color: 'text-indigo-700',  bg: 'bg-indigo-50',   border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
  hunter:              { label: 'Hunter.io',           color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200',  dot: 'bg-orange-500'  },
  google_places:       { label: 'Google Places',       color: 'text-green-700',   bg: 'bg-green-50',    border: 'border-green-200',   dot: 'bg-green-500'   },
  peopledatalabs:      { label: 'People Data Labs',    color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',    dot: 'bg-blue-500'    },
  google_custom_search:{ label: 'Google Custom Search',color: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-200',    dot: 'bg-rose-500'    },
}

function getProviderMeta(source: string) {
  const key = (source || '').toLowerCase()
  return PROVIDER_META[key] ?? { label: source || 'Unknown', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-500' }
}

function ProviderInitial({ source, meta }: { source: string; meta: ReturnType<typeof getProviderMeta> }) {
  return (
    <div className={`w-10 h-10 ${meta.bg} border ${meta.border} rounded-xl flex items-center justify-center flex-shrink-0`}>
      <span className={`text-base font-bold ${meta.color}`}>
        {(meta.label || '?').charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

export default function ApiConfigTab() {
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
      const data = await configService.getAllApiConfigs()
      setConfigs(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load API configurations')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (config: any) => {
    try {
      const full = await configService.getApiConfig(config.apiSource, true)
      setEditingConfig(full)
      setDialogOpen(true)
    } catch {
      toast.error('Failed to load config details')
    }
  }

  const handleDelete = async () => {
    if (!configToDelete) return
    try {
      await configService.deleteApiConfig(configToDelete.apiSource)
      toast.success(`${getProviderMeta(configToDelete.apiSource).label} config deleted`)
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
            <Server className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">No API providers</h3>
          <p className="text-xs text-gray-400 mb-5 text-center max-w-xs">
            Connect your first lead generation API to start discovering leads.
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
            const meta = getProviderMeta(config.apiSource)
            const monthlyPct = config.monthlyLimit && config.leadsGenerated
              ? Math.min(100, Math.round((config.leadsGenerated / config.monthlyLimit) * 100))
              : null

            return (
              <div
                key={config.apiSource}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md
                  ${config.isActive ? 'border-gray-200' : 'border-gray-200 opacity-75'}`}
              >
                {/* Card header */}
                <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-50">
                  <ProviderInitial source={config.apiSource} meta={meta} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${meta.color}`}>{meta.label}</span>
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
                    <div className="text-xs text-gray-400 mt-0.5">Source: {config.apiSource}</div>
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

                {/* Card body — stats */}
                <div className="px-5 py-3.5 grid grid-cols-3 gap-4">
                  {/* Monthly limit */}
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
                      <Layers className="w-3 h-3" />
                      Monthly Limit
                    </div>
                    <div className="text-sm font-bold text-gray-800 tabular-nums">
                      {config.monthlyLimit ? config.monthlyLimit.toLocaleString() : '—'}
                    </div>
                    {monthlyPct !== null && (
                      <div className="mt-1.5">
                        <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                          <span>{config.leadsGenerated?.toLocaleString() ?? 0} used</span>
                          <span>{monthlyPct}%</span>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              monthlyPct >= 90 ? 'bg-red-400' : monthlyPct >= 70 ? 'bg-amber-400' : 'bg-green-400'
                            }`}
                            style={{ width: `${monthlyPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cost per lead */}
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
                      <DollarSign className="w-3 h-3" />
                      Cost / Lead
                    </div>
                    <div className="text-sm font-bold text-gray-800 tabular-nums">
                      {config.costPerLead != null ? `$${Number(config.costPerLead).toFixed(4)}` : '—'}
                    </div>
                  </div>

                  {/* Cost per API call */}
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
                      <DollarSign className="w-3 h-3" />
                      Cost / Call
                    </div>
                    <div className="text-sm font-bold text-gray-800 tabular-nums">
                      {config.costPerAPICall != null ? `$${Number(config.costPerAPICall).toFixed(4)}` : '—'}
                    </div>
                  </div>
                </div>

                {/* Setup notes */}
                {config.setupNotes && (
                  <div className="px-5 pb-3.5 flex items-start gap-1.5">
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
        <ApiConfigDialog
          open={dialogOpen}
          config={editingConfig}
          onClose={() => { setDialogOpen(false); setEditingConfig(null) }}
          onSaved={() => { setDialogOpen(false); setEditingConfig(null); loadConfigs() }}
        />
      )}
      {deleteDialogOpen && (
        <ConfirmDialog
          open={deleteDialogOpen}
          title="Delete API Configuration"
          message={`Are you sure you want to delete the ${getProviderMeta(configToDelete?.apiSource).label} configuration? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => { setDeleteDialogOpen(false); setConfigToDelete(null) }}
        />
      )}
    </>
  )
}
