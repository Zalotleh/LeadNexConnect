import React from 'react';
import Layout from './Layout';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Settings Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">
            Manage your application settings and configurations
          </p>
        </div>

        {/* Settings Content */}
        <div>{children}</div>
      </div>
    </Layout>
  );
}
