import React from 'react'
import Layout from './Layout'

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </Layout>
  )
}
