import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Home, Users, Mail, TrendingUp, Settings, Search } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Campaigns', href: '/campaigns', icon: Mail },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const isActive = (href: string) => router.pathname === href

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
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm h-16">
          <div className="flex items-center justify-between h-full px-8">
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search leads, campaigns..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">
                Upgrade Plan
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
