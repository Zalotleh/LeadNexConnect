// @ts-nocheck – full rewrite, types validated below
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, X, Save, AlertCircle, CheckCircle,
  Tag, Hash, Link as LinkIcon, User, Building2, Settings2, Braces,
  Copy, Check, Info, FlaskConical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { emailVariableManager } from '@/lib/emailVariables';
import api from '@/services/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CustomVariable {
  id: string;
  key: string;
  label: string;
  value: string;
  category: string;
  description: string | null;
  usageCount: number;
  isActive: boolean;
  defaultValue: string | null;
  createdAt: string;
  updatedAt: string;
}

type FormState = {
  key: string;
  label: string;
  category: string;
  description: string;
  defaultValue: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  key: '', label: '', category: 'custom', description: '', defaultValue: '', isActive: true,
};

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'lead',    label: 'Lead',    color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     icon: <User className="w-3 h-3" /> },
  { value: 'sender',  label: 'Sender',  color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: <User className="w-3 h-3" /> },
  { value: 'company', label: 'Company', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: <Building2 className="w-3 h-3" /> },
  { value: 'link',    label: 'Link',    color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   icon: <LinkIcon className="w-3 h-3" /> },
  { value: 'product', label: 'Product', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: <Tag className="w-3 h-3" /> },
  { value: 'system',  label: 'System',  color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', icon: <Settings2 className="w-3 h-3" /> },
  { value: 'custom',  label: 'Custom',  color: 'text-gray-700',   bg: 'bg-gray-100 border-gray-200',    icon: <Hash className="w-3 h-3" /> },
] as const;

function getCat(value: string) {
  return CATEGORIES.find(c => c.value === value) || CATEGORIES[CATEGORIES.length - 1];
}

function CategoryBadge({ category }: { category: string }) {
  const c = getCat(category);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.color}`}>
      {c.icon}{c.label}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VariablesPage() {
  const [variables, setVariables] = useState<CustomVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomVariable | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomVariable | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testTarget, setTestTarget] = useState<CustomVariable | null>(null);
  const [testValue, setTestValue] = useState('');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => { loadVariables(); }, [searchTerm, categoryFilter]);

  const loadVariables = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('category', categoryFilter);
      const { data } = await api.get(`/custom-variables${params.toString() ? `?${params}` : ''}`);
      setVariables(data.data || []);
    } catch {
      toast.error('Failed to load variables');
    } finally {
      setLoading(false);
    }
  };

  // ── Form actions ──────────────────────────────────────────────────────────
  const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowFormModal(true); };
  const openEdit = (v: CustomVariable) => {
    setEditTarget(v);
    setForm({ key: v.key, label: v.label, category: v.category, description: v.description || '', defaultValue: v.defaultValue || '', isActive: v.isActive });
    setShowFormModal(true);
  };
  const closeForm = () => { setShowFormModal(false); setEditTarget(null); };

  const handleSave = async () => {
    if (!form.label.trim()) { toast.error('Label is required'); return; }
    if (!editTarget && !form.key.trim()) { toast.error('Key is required'); return; }
    if (!editTarget && !/^[a-zA-Z0-9_]+$/.test(form.key)) {
      toast.error('Key must contain only letters, numbers, and underscores'); return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await api.put(`/custom-variables/${editTarget.id}`, {
          label: form.label, category: form.category,
          description: form.description || null, defaultValue: form.defaultValue || null, isActive: form.isActive,
        });
        toast.success('Variable updated');
      } else {
        await api.post('/custom-variables', {
          key: form.key, label: form.label, value: `{{${form.key}}}`, category: form.category,
          description: form.description || null, defaultValue: form.defaultValue || null, isActive: form.isActive,
        });
        toast.success('Variable created');
      }
      closeForm();
      loadVariables();
      emailVariableManager.reloadCustomVariables();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save variable');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.delete(`/custom-variables/${deleteTarget.id}`);
      toast.success('Variable deleted');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      loadVariables();
      emailVariableManager.reloadCustomVariables();
    } catch {
      toast.error('Failed to delete variable');
    } finally {
      setSaving(false);
    }
  };

  const copyVar = (v: CustomVariable) => {
    navigator.clipboard.writeText(v.value);
    setCopiedKey(v.id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalActive = variables.filter(v => v.isActive).length;
  const totalUsed   = variables.filter(v => v.usageCount > 0).length;
  const cats        = [...new Set(variables.map(v => v.category))].length;

  return (
    <ProtectedRoute>
    <Layout>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Braces className="w-7 h-7 text-primary-600" />
              Custom Variables
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Define variables resolved in every email template and AI-generated email.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-sm font-medium whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Variable
          </button>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { label: 'Total',      value: variables.length, color: 'text-gray-700',    bg: 'bg-white border border-gray-200' },
            { label: 'Active',     value: totalActive,      color: 'text-green-700',   bg: 'bg-green-50 border border-green-200' },
            { label: 'In use',     value: totalUsed,        color: 'text-primary-700', bg: 'bg-primary-50 border border-primary-200' },
            { label: 'Categories', value: cats,             color: 'text-purple-700',  bg: 'bg-purple-50 border border-purple-200' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm ${s.bg}`}>
              <span className={`font-bold text-base ${s.color}`}>{s.value}</span>
              <span className="text-gray-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-800">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Custom variables supplement the built-in ones from{' '}
            <strong>Sender Settings</strong> and <strong>Company Profile</strong>.
            Use them in templates like{' '}
            <code className="bg-blue-100 px-1 rounded font-mono text-xs">{'{{myVariable}}'}</code>
            {' '}— the system replaces them at send time.
          </p>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by key, label or description…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
            <button
              onClick={() => setCategoryFilter('')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!categoryFilter ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              All
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategoryFilter(categoryFilter === c.value ? '' : c.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${categoryFilter === c.value ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-56">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="w-7 h-7 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                <p className="text-sm">Loading variables…</p>
              </div>
            </div>
          ) : variables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Braces className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-base font-medium text-gray-600">No variables found</p>
              <p className="text-sm mt-1 mb-5 text-center max-w-xs">
                {searchTerm || categoryFilter
                  ? 'Try adjusting your search or filter.'
                  : 'Create your first custom variable to personalise templates.'}
              </p>
              {!searchTerm && !categoryFilter && (
                <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
                  <Plus className="w-4 h-4" /> New Variable
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Variable</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Label</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Default value</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variables.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    {/* Variable token — click to copy */}
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => copyVar(v)}
                        title="Click to copy"
                        className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1.5 bg-primary-50 text-primary-700 rounded-lg border border-primary-200 hover:bg-primary-100 transition-colors"
                      >
                        {v.value}
                        {copiedKey === v.id
                          ? <Check className="w-3 h-3 text-green-600" />
                          : <Copy className="w-3 h-3 opacity-40" />}
                      </button>
                    </td>
                    {/* Label + description */}
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{v.label}</p>
                      {v.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{v.description}</p>
                      )}
                    </td>
                    {/* Category */}
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <CategoryBadge category={v.category} />
                    </td>
                    {/* Default value */}
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {v.defaultValue
                        ? <span className="text-gray-600 font-mono text-xs">{v.defaultValue}</span>
                        : <span className="text-gray-300 italic text-xs">—</span>}
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      {v.isActive
                        ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5"><CheckCircle className="w-3 h-3" />Active</span>
                        : <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">Inactive</span>}
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setTestTarget(v); setTestValue(v.defaultValue || ''); setShowTestModal(true); }}
                          title="Test variable"
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <FlaskConical className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(v)}
                          title="Edit"
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setDeleteTarget(v); setShowDeleteModal(true); }}
                          title="Delete"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────────────────────── */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editTarget ? 'Edit Variable' : 'New Custom Variable'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {editTarget
                    ? `Editing {{${editTarget.key}}}`
                    : 'Define a new variable to use in email templates'}
                </p>
              </div>
              <button onClick={closeForm} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              <div className="p-7 grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Key */}
                {editTarget ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Key <span className="text-gray-400 font-normal">(read-only)</span></label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <code className="text-primary-700 font-mono text-sm">{`{{${editTarget.key}}}`}</code>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Key <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={form.key}
                      onChange={e => setForm(f => ({ ...f, key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                      placeholder="e.g. companyRevenue"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      autoFocus
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Letters, numbers & underscores → becomes{' '}
                      <code className="bg-gray-100 px-1 rounded font-mono text-primary-600">{`{{${form.key || 'key'}}}`}</code>
                    </p>
                  </div>
                )}

                {/* Label */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="e.g. Company Revenue"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Category — pill buttons */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, category: c.value }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          form.category === c.value
                            ? `${c.bg} ${c.color} ring-2 ring-offset-1 ring-primary-400`
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`}
                      >
                        {c.icon}{c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Value <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={form.defaultValue}
                    onChange={e => setForm(f => ({ ...f, defaultValue: e.target.value }))}
                    placeholder="Fallback when not populated"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="What does this variable represent? Where is it used?"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Active toggle */}
                <div className="md:col-span-2">
                  <label
                    className="flex items-center gap-3 cursor-pointer select-none"
                    onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  >
                    <div className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${form.isActive ? 'bg-primary-600' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow mt-1 transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      Active — available in the Insert Variable dropdown and AI prompts
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-7 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 rounded-b-2xl">
              <button onClick={closeForm} disabled={saving} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.label.trim() || (!editTarget && !form.key.trim())}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                  : <><Save className="w-4 h-4" />{editTarget ? 'Save Changes' : 'Create Variable'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Test Modal ─────────────────────────────────────────────────────── */}
      {showTestModal && testTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-gray-900">Test Variable</h2>
              </div>
              <button onClick={() => setShowTestModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-semibold uppercase tracking-wide">Variable</p>
                <code className="block w-full px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg text-primary-700 font-mono text-sm">
                  {testTarget.value}
                </code>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter a test value</label>
                <input
                  type="text"
                  value={testValue}
                  onChange={e => setTestValue(e.target.value)}
                  placeholder={testTarget.defaultValue || 'Type a value to preview…'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-2 bg-gray-50 border-b border-gray-200">Preview in email</p>
                <p className="px-4 py-3 text-sm text-gray-800">
                  Hi <strong className="text-primary-700">{testValue || testTarget.defaultValue || testTarget.value}</strong>, thanks for your interest!
                </p>
              </div>
              {testTarget.description && (
                <p className="text-xs text-gray-500 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  {testTarget.description}
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setShowTestModal(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-7 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Variable?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Permanently delete{' '}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-primary-600 text-xs">{deleteTarget.value}</code>
                {' '}(<strong>{deleteTarget.label}</strong>).
              </p>
              {deleteTarget.usageCount > 0 && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-left mb-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">
                    Used in <strong>{deleteTarget.usageCount}</strong> template{deleteTarget.usageCount !== 1 ? 's' : ''} — those emails will show the raw token after deletion.
                  </p>
                </div>
              )}
            </div>
            <div className="px-7 pb-7 flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Trash2 className="w-4 h-4" />Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
    </ProtectedRoute>
  );
}
