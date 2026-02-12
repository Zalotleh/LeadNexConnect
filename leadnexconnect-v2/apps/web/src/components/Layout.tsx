import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Home, Users, Mail, TrendingUp, Settings, Workflow, FileText, Variable, ChevronDown, ChevronRight, Activity, Menu, X, LogOut, User, Shield, ClipboardList, Monitor } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const { user, logout, isAdmin } = useAuth()
  const [isContentOpen, setIsContentOpen] = useState(true)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 border-b px-4">
            <h1 className="text-xl lg:text-2xl font-bold text-primary-600">LeadNexConnect</h1>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
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

            {/* Admin Section - Only visible to admins */}
            {isAdmin && (
              <>
                <div className="border-t border-gray-200 my-4"></div>
                <div className="px-4 mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Admin
                  </p>
                </div>
                <Link
                  href="/admin/users"
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/users')
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Shield className="w-5 h-5 mr-3" />
                  User Management
                </Link>
                <Link
                  href="/admin/analytics"
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/analytics')
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Activity className="w-5 h-5 mr-3" />
                  System Analytics
                </Link>
                <Link
                  href="/admin/sessions"
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/sessions')
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Monitor className="w-5 h-5 mr-3" />
                  Session Management
                </Link>
                <Link
                  href="/admin/audit-logs"
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive('/admin/audit-logs')
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ClipboardList className="w-5 h-5 mr-3" />
                  Audit Logs
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 min-h-screen w-full max-w-full overflow-x-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-sm h-16 w-full max-w-full">
          <div className="flex items-center justify-between h-full px-4 lg:px-8 max-w-full">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1">
              {/* Search removed - use page-specific search instead */}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  {isAdmin ? (
                    <Shield className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <User className="w-5 h-5 text-gray-600" />
                  )}
                  <div className="text-left hidden md:block">
                    <p className="text-sm font-medium text-gray-700">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        isAdmin ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {isAdmin && <Shield className="w-3 h-3 mr-1" />}
                        {user?.role}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      logout()
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 w-full max-w-full overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
