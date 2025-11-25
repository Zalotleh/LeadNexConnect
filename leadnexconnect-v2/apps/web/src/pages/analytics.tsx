import Layout from '@/components/Layout'
import { TrendingUp, Users, Mail, BarChart } from 'lucide-react'

export default function Analytics() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">Track your performance and insights</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">24.5%</p>
                <p className="text-sm text-green-600 mt-2">+4.2%</p>
              </div>
              <div className="bg-green-50 rounded-full p-3">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">18.2%</p>
                <p className="text-sm text-green-600 mt-2">+2.1%</p>
              </div>
              <div className="bg-blue-50 rounded-full p-3">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Lead Score</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">72</p>
                <p className="text-sm text-green-600 mt-2">+5</p>
              </div>
              <div className="bg-purple-50 rounded-full p-3">
                <BarChart className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Over Time</h2>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chart will be displayed here
          </div>
        </div>
      </div>
    </Layout>
  )
}
