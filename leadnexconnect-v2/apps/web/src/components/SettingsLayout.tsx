import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from './Layout';
import { Settings, FileText, Variable } from 'lucide-react';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const router = useRouter();

  const tabs = [
    {
      name: 'General',
      href: '/settings',
      icon: Settings,
      description: 'API keys and email configuration',
    },
    {
      name: 'Templates',
      href: '/settings/templates',
      icon: FileText,
      description: 'Manage email templates',
    },
    {
      name: 'Variables',
      href: '/settings/variables',
      icon: Variable,
      description: 'Custom email variables',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/settings') {
      return router.pathname === '/settings';
    }
    return router.pathname.startsWith(href);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Settings Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">
            Manage your application settings, templates, and custom variables
          </p>
        </div>

        {/* Settings Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8" aria-label="Settings tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = isActive(tab.href);
              
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    transition-colors
                    ${
                      active
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon
                    className={`
                      -ml-0.5 mr-2 h-5 w-5
                      ${active ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  <span>{tab.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div>{children}</div>
      </div>
    </Layout>
  );
}
