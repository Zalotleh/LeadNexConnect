import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Home, Users, Mail, TrendingUp, Settings, Workflow, FileText, Variable, ChevronDown, ChevronRight, Activity } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const [isContentOpen, setIsContentOpen] = useState(true)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Campaigns', href: '/campaigns', icon: Mail },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const contentSubmenu = [
    { name: 'Workflows', href: '/workflows', icon: Workflow },
    { name: 'Templates', href: '/settings/templates', icon: FileText },
    { name: 'Variables', href: '/settings/variables', icon: Variable },
  ]

  const analyticsSubmenu = [
    { name: 'Leads Analytics', href: '/analytics', icon: TrendingUp },
    { name: 'API Performance', href: '/api-performance', icon: Activity },
  ]

  const isActive = (href: string) => router.pathname === href
  const isContentActive = () => contentSubmenu.some(item => router.pathname === item.href)
  const isAnalyticsActive = () => analyticsSubmenu.some(item => router.pathname === item.href)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b px-4">
            <h1 className="text-2xl font-bold text-primary-600">LeadNexConnect</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {/* Dashboard */}
            <Link
              href="/dashboard"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive('/dashboard')
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Home className="w-5 h-5 mr-3" />
              Dashboard
            </Link>

            {/* Leads */}
            <Link
              href="/leads"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive('/leads')
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-5 h-5 mr-3" />
              Leads
            </Link>

            {/* Campaigns */}
            <Link
              href="/campaigns"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive('/campaigns')
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Mail className="w-5 h-5 mr-3" />
              Campaigns
            </Link>

            {/* Content Dropdown */}
            <div>
              <button
                onClick={() => setIsContentOpen(!isContentOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isContentActive()
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-3" />
                  Content
                </div>
                {isContentOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Submenu */}
              {isContentOpen && (
                <div className="mt-1 ml-4 space-y-1">
                  {contentSubmenu.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          isActive(item.href)
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Analytics Dropdown */}
            <div>
              <button
                onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isAnalyticsActive()
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-3" />
                  Analytics
                </div>
                {isAnalyticsOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Submenu */}
              {isAnalyticsOpen && (
                <div className="mt-1 ml-4 space-y-1">
                  {analyticsSubmenu.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          isActive(item.href)
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Settings */}
            <Link
              href="/settings"
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive('/settings')
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5 mr-3" />
              Settings
            </Link>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm h-16">
          <div className="flex items-center justify-between h-full px-8">
            <div className="flex-1">
              {/* Search removed - use page-specific search instead */}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
