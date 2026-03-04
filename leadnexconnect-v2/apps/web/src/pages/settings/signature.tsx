import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import {
  Save, Eye, Pen, Info, CheckCircle, AlertCircle,
  User, Mail, CornerDownLeft, Building2, Link as LinkIcon, Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import TinyMCEEmailEditor from '@/components/EmailEditor/TinyMCEEmailEditor';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface SenderProfile {
  senderName: string | null;
  senderEmail: string | null;
  replyTo: string | null;
  signatureHtml: string | null;
}

interface CompanyProfile {
  companyName?: string;
  productName?: string;
  productDescription?: string;
  websiteUrl?: string;
  signUpLink?: string;
  featuresLink?: string;
  pricingLink?: string;
  demoLink?: string;
  integrationsLink?: string;
  supportEmail?: string;
}

// ─────────────────────────────────────────────
// Completion helpers
// ─────────────────────────────────────────────
const REQUIRED_FIELDS: { key: keyof SenderProfile; label: string }[] = [
  { key: 'senderName',    label: 'Sender Name' },
  { key: 'senderEmail',   label: 'Sender Email' },
  { key: 'signatureHtml', label: 'Signature' },
];

function completionCount(profile: SenderProfile) {
  return REQUIRED_FIELDS.filter(f => !!(profile[f.key] as string | null)?.trim()).length;
}

const SIGNATURE_TEMPLATES = [
  {
    name: 'Simple Text',
    html: `<p>Best regards,</p>\n<p><strong>Your Name</strong><br>Your Title | Your Company<br>your@email.com<br><a href="https://yourwebsite.com">yourwebsite.com</a></p>`,
  },
  {
    name: 'Professional',
    html: `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:14px;color:#333;border-collapse:collapse;">\n  <tr>\n    <td style="padding-right:15px;vertical-align:top;border-right:2px solid #2563eb;">\n      <strong style="font-size:16px;color:#1e293b;">Your Name</strong><br>\n      <span style="font-size:12px;color:#64748b;">Your Title</span>\n    </td>\n    <td style="padding-left:15px;vertical-align:top;">\n      <strong style="color:#1e293b;">Your Company</strong><br>\n      <a href="mailto:your@email.com" style="color:#2563eb;text-decoration:none;">your@email.com</a><br>\n      <a href="https://yourwebsite.com" style="color:#2563eb;text-decoration:none;">yourwebsite.com</a>\n    </td>\n  </tr>\n</table>`,
  },
  {
    name: 'Minimal',
    html: `<div style="border-top:1px solid #e2e8f0;padding-top:12px;margin-top:8px;font-family:Arial,sans-serif;font-size:13px;color:#475569;">\n  <strong style="color:#1e293b;">Your Name</strong> &nbsp;·&nbsp; Your Title<br>\n  <a href="mailto:your@email.com" style="color:#2563eb;text-decoration:none;">your@email.com</a>\n  &nbsp;·&nbsp;\n  <a href="https://yourwebsite.com" style="color:#2563eb;text-decoration:none;">yourwebsite.com</a>\n</div>`,
  },
];

// ─────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────
export default function SignaturePage() {
  const [profile, setProfile] = useState<SenderProfile>({
    senderName: '', senderEmail: '', replyTo: '', signatureHtml: '',
  });
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [showCompany, setShowCompany] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, companyRes] = await Promise.all([
        api.get('/sender-profile'),
        api.get('/settings/company-profile'),
      ]);
      const p = profileRes.data.data;
      setProfile({
        senderName:    p.senderName    ?? '',
        senderEmail:   p.senderEmail   ?? '',
        replyTo:       p.replyTo       ?? '',
        signatureHtml: p.signatureHtml ?? '',
      });
      setCompanyProfile(companyRes.data.data ?? {});
    } catch (err: any) {
      console.error('Failed to load sender profile:', err);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.senderName?.trim()) { toast.error('Sender name is required'); return; }
    if (!profile.senderEmail?.trim()) { toast.error('Sender email is required'); return; }
    setSaving(true);
    try {
      await api.put('/sender-profile', {
        senderName:    profile.senderName    || null,
        senderEmail:   profile.senderEmail   || null,
        replyTo:       profile.replyTo       || null,
        signatureHtml: profile.signatureHtml || null,
      });
      toast.success('Sender profile saved!');
    } catch (err: any) {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (html: string) => {
    setProfile(p => ({ ...p, signatureHtml: html }));
    setActiveTab('editor');
    toast.success('Template applied — customize it with your details!');
  };

  const filled     = completionCount(profile);
  const total      = REQUIRED_FIELDS.length;
  const isComplete = filled === total;

  return (
    <ProtectedRoute>
    <Layout>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sender Settings</h1>
          <p className="text-gray-600">
            Set your sender identity and build your email signature. These are used automatically
            when emails are sent on your behalf.
          </p>
        </div>

        {/* Completion indicator */}
        <div className={`flex items-center gap-4 rounded-xl p-4 mb-6 border ${
          isComplete ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
        }`}>
          {isComplete
            ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            : <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />}
          <div className="flex-1">
            <p className={`text-sm font-medium ${isComplete ? 'text-green-800' : 'text-yellow-800'}`}>
              {isComplete
                ? 'Profile complete — your emails will use your sender identity'
                : `Profile ${filled}/${total} fields complete — fill in the missing fields below`}
            </p>
            {!isComplete && (
              <p className="text-xs text-yellow-700 mt-0.5">
                Missing: {REQUIRED_FIELDS.filter(f => !(profile[f.key] as string | null)?.trim()).map(f => f.label).join(', ')}
              </p>
            )}
          </div>
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-yellow-400'}`}
              style={{ width: `${(filled / total) * 100}%` }}
            />
          </div>
          <span className={`text-sm font-semibold ${isComplete ? 'text-green-700' : 'text-yellow-700'}`}>
            {filled}/{total}
          </span>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>How it works:</strong> Your sender name and email are used as the <em>From</em> field
            when campaigns send emails. The{' '}
            <code className="bg-blue-100 px-1 rounded font-mono text-xs">{'{{signature}}'}</code>{' '}
            placeholder in any template is replaced with your saved HTML signature at send time.
          </div>
        </div>

        {/* Sender Identity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary-600" />
            Sender Identity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Sender Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sender Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={profile.senderName ?? ''}
                  onChange={e => setProfile(p => ({ ...p, senderName: e.target.value }))}
                  placeholder="e.g. John Smith"
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Resolves <code className="bg-gray-100 px-1 rounded">{'{{sender_name}}'}</code></p>
            </div>

            {/* Sender Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sender Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={profile.senderEmail ?? ''}
                  onChange={e => setProfile(p => ({ ...p, senderEmail: e.target.value }))}
                  placeholder="e.g. john@yourcompany.com"
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Resolves <code className="bg-gray-100 px-1 rounded">{'{{sender_email}}'}</code></p>
            </div>

            {/* Reply-To */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reply-To <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <CornerDownLeft className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={profile.replyTo ?? ''}
                  onChange={e => setProfile(p => ({ ...p, replyTo: e.target.value }))}
                  placeholder="Leave blank to use Sender Email"
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Replies from recipients will go here instead of your sender email.</p>
            </div>
          </div>
        </div>

        {/* Signature Editor */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Pen className="w-4 h-4 text-primary-600" />
              HTML Signature <span className="text-red-500">*</span>
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 hidden sm:block">Quick-start:</span>
              {SIGNATURE_TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => applyTemplate(t.html)}
                  className="px-3 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 flex">
            {(['editor', 'preview'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'editor' ? <Pen className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {tab}
              </button>
            ))}
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                Loading your profile...
              </div>
            ) : activeTab === 'editor' ? (
              <TinyMCEEmailEditor
                value={profile.signatureHtml ?? ''}
                onChange={html => setProfile(p => ({ ...p, signatureHtml: html }))}
              />
            ) : (
              <div className="min-h-48 p-6 border border-gray-100 rounded-lg bg-gray-50">
                {profile.signatureHtml ? (
                  <>
                    <p className="text-xs text-gray-400 mb-4 uppercase tracking-wide font-medium">
                      Preview — how it will appear in emails
                    </p>
                    <div dangerouslySetInnerHTML={{ __html: profile.signatureHtml }} />
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">
                    No signature yet. Use a template or the Editor tab to build one.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end mb-8">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 font-medium transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {/* Company Profile — read-only */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowCompany(v => !v)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">Company Profile</span>
              <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" /> Admin managed
              </span>
            </div>
            <span className="text-xs text-gray-400">{showCompany ? 'Hide' : 'Show values'}</span>
          </button>

          {showCompany && (
            <div className="border-t border-gray-100 p-5">
              <p className="text-xs text-gray-500 mb-4">
                These values are managed by your admin and resolve automatically in templates
                (e.g. <code className="bg-gray-100 px-1 rounded">{'{{company_name}}'}</code>,{' '}
                <code className="bg-gray-100 px-1 rounded">{'{{sign_up_link}}'}</code>).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { label: 'Company Name',        value: companyProfile.companyName,        variable: '{{company_name}}' },
                  { label: 'Product Name',         value: companyProfile.productName,         variable: '{{product_name}}' },
                  { label: 'Product Description',  value: companyProfile.productDescription,  variable: null },
                  { label: 'Support Email',        value: companyProfile.supportEmail,        variable: null },
                  { label: 'Website URL',          value: companyProfile.websiteUrl,          variable: '{{product_url}}' },
                  { label: 'Sign-Up Link',         value: companyProfile.signUpLink,          variable: '{{sign_up_link}}' },
                  { label: 'Features Link',        value: companyProfile.featuresLink,        variable: null },
                  { label: 'Pricing Link',         value: companyProfile.pricingLink,         variable: null },
                  { label: 'Demo Link',            value: companyProfile.demoLink,            variable: '{{demo_link}}' },
                  { label: 'Integrations Link',    value: companyProfile.integrationsLink,    variable: null },
                ] as { label: string; value: string | undefined; variable: string | null }[]).map(item => (
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500">{item.label}</span>
                      {item.variable && (
                        <code className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded">
                          {item.variable}
                        </code>
                      )}
                    </div>
                    {item.value
                      ? item.value.startsWith('http')
                        ? <a href={item.value} target="_blank" rel="noreferrer"
                             className="flex items-center gap-1 text-sm text-primary-600 hover:underline break-all">
                            <LinkIcon className="w-3 h-3 flex-shrink-0" />{item.value}
                          </a>
                        : <p className="text-sm text-gray-700">{item.value}</p>
                      : <p className="text-sm text-gray-400 italic">Not set by admin</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </Layout>
    </ProtectedRoute>
  );
}
