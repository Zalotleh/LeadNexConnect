import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import {
  Save, Building2, Globe, Mail, Link as LinkIcon, Info, CheckCircle, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';

interface CompanyProfile {
  companyName: string;
  productName: string;
  productDescription: string;
  websiteUrl: string;
  signUpLink: string;
  featuresLink: string;
  pricingLink: string;
  demoLink: string;
  integrationsLink: string;
  supportEmail: string;
}

const EMPTY: CompanyProfile = {
  companyName: '',
  productName: '',
  productDescription: '',
  websiteUrl: '',
  signUpLink: '',
  featuresLink: '',
  pricingLink: '',
  demoLink: '',
  integrationsLink: '',
  supportEmail: '',
};

const REQUIRED: (keyof CompanyProfile)[] = ['companyName', 'productName', 'websiteUrl'];

function CompanyProfilePage() {
  const { isAdmin, user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && !isAdmin) {
      toast.error('Admin access required');
      router.push('/dashboard');
    }
  }, [user, isAdmin, router]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const { data } = await api.get('/settings/company-profile');
      const p = data.data || {};
      setProfile({
        companyName:        p.companyName        || '',
        productName:        p.productName        || '',
        productDescription: p.productDescription || '',
        websiteUrl:         p.websiteUrl         || '',
        signUpLink:         p.signUpLink         || '',
        featuresLink:       p.featuresLink       || '',
        pricingLink:        p.pricingLink        || '',
        demoLink:           p.demoLink           || '',
        integrationsLink:   p.integrationsLink   || '',
        supportEmail:       p.supportEmail       || '',
      });
    } catch {
      toast.error('Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    for (const key of REQUIRED) {
      if (!profile[key]?.trim()) {
        toast.error(`${fieldLabel(key)} is required`);
        return;
      }
    }
    setSaving(true);
    try {
      await api.put('/settings/company-profile', profile);
      toast.success('Company profile saved!');
    } catch {
      toast.error('Failed to save company profile');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof CompanyProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setProfile(p => ({ ...p, [key]: e.target.value }));

  const filled = REQUIRED.filter(k => !!profile[k]?.trim()).length;
  const isComplete = filled === REQUIRED.length;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-primary-600" />
            Company Profile
          </h1>
          <p className="text-gray-600">
            These values are resolved in all outgoing email templates. Keep them up-to-date so
            every email reflects your actual brand.
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
                ? 'Company profile complete — email templates will resolve correctly'
                : `${filled}/${REQUIRED.length} required fields filled in`}
            </p>
            {!isComplete && (
              <p className="text-xs text-yellow-700 mt-0.5">
                Missing: {REQUIRED.filter(k => !profile[k]?.trim()).map(fieldLabel).join(', ')}
              </p>
            )}
          </div>
          <div className="w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-yellow-400'}`}
              style={{ width: `${(filled / REQUIRED.length) * 100}%` }}
            />
          </div>
        </div>

        {/* How it works */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            These values replace template variables like{' '}
            <code className="bg-blue-100 px-1 rounded text-xs font-mono">{'{{company_name}}'}</code>,{' '}
            <code className="bg-blue-100 px-1 rounded text-xs font-mono">{'{{sign_up_link}}'}</code>, and{' '}
            <code className="bg-blue-100 px-1 rounded text-xs font-mono">{'{{demo_link}}'}</code>{' '}
            in emails generated by AI and sent from campaigns.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Loading…</div>
        ) : (
          <>
            {/* Brand */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-5">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Brand</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field
                  label="Company Name" required
                  icon={<Building2 className="w-4 h-4 text-gray-400" />}
                  value={profile.companyName} onChange={set('companyName')}
                  placeholder="e.g. Acme Corp"
                  variable="{{company_name}}"
                />
                <Field
                  label="Product Name" required
                  icon={<Building2 className="w-4 h-4 text-gray-400" />}
                  value={profile.productName} onChange={set('productName')}
                  placeholder="e.g. Acme CRM"
                  variable="{{product_name}}"
                />
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Description
                  </label>
                  <textarea
                    rows={3}
                    value={profile.productDescription}
                    onChange={set('productDescription')}
                    placeholder="e.g. An all-in-one CRM and booking platform for service businesses"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Used in AI-generated email prompts.</p>
                </div>
                <Field
                  label="Support Email"
                  icon={<Mail className="w-4 h-4 text-gray-400" />}
                  value={profile.supportEmail} onChange={set('supportEmail')}
                  placeholder="e.g. hello@yourcompany.com"
                  variable="{{support_email}}"
                  type="email"
                />
              </div>
            </section>

            {/* Links */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Links</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field
                  label="Website URL" required
                  icon={<Globe className="w-4 h-4 text-gray-400" />}
                  value={profile.websiteUrl} onChange={set('websiteUrl')}
                  placeholder="https://yourcompany.com"
                  variable="{{product_url}}"
                />
                <Field
                  label="Sign-Up Link"
                  icon={<LinkIcon className="w-4 h-4 text-gray-400" />}
                  value={profile.signUpLink} onChange={set('signUpLink')}
                  placeholder="https://yourcompany.com/sign-up"
                  variable="{{sign_up_link}}"
                />
                <Field
                  label="Features Link"
                  icon={<LinkIcon className="w-4 h-4 text-gray-400" />}
                  value={profile.featuresLink} onChange={set('featuresLink')}
                  placeholder="https://yourcompany.com/features"
                  variable="{{features_link}}"
                />
                <Field
                  label="Pricing Link"
                  icon={<LinkIcon className="w-4 h-4 text-gray-400" />}
                  value={profile.pricingLink} onChange={set('pricingLink')}
                  placeholder="https://yourcompany.com/pricing"
                  variable="{{pricing_link}}"
                />
                <Field
                  label="Demo Link"
                  icon={<LinkIcon className="w-4 h-4 text-gray-400" />}
                  value={profile.demoLink} onChange={set('demoLink')}
                  placeholder="https://yourcompany.com/demo"
                  variable="{{demo_link}}"
                />
                <Field
                  label="Integrations Link"
                  icon={<LinkIcon className="w-4 h-4 text-gray-400" />}
                  value={profile.integrationsLink} onChange={set('integrationsLink')}
                  placeholder="https://yourcompany.com/integrations"
                  variable="{{integrations_link}}"
                />
              </div>
            </section>

            {/* Save */}
            <div className="flex justify-end mb-8">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 font-medium transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Company Profile'}
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

// ── Shared field component ───────────────────────────────────────────────
function Field({
  label, required, icon, value, onChange, placeholder, variable, type = 'text',
}: {
  label: string;
  required?: boolean;
  icon: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  variable?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
      {variable && (
        <p className="text-xs text-gray-400 mt-1">
          Resolves <code className="bg-gray-100 px-1 rounded font-mono">{variable}</code>
        </p>
      )}
    </div>
  );
}

function fieldLabel(key: keyof CompanyProfile): string {
  const map: Record<keyof CompanyProfile, string> = {
    companyName: 'Company Name',
    productName: 'Product Name',
    productDescription: 'Product Description',
    websiteUrl: 'Website URL',
    signUpLink: 'Sign-Up Link',
    featuresLink: 'Features Link',
    pricingLink: 'Pricing Link',
    demoLink: 'Demo Link',
    integrationsLink: 'Integrations Link',
    supportEmail: 'Support Email',
  };
  return map[key] || key;
}

export default function CompanyProfilePageWrapper() {
  return (
    <ProtectedRoute>
      <CompanyProfilePage />
    </ProtectedRoute>
  );
}
