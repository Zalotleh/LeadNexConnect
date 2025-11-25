import Layout from '@/components/Layout'
import { Plus, Play, Pause, Mail } from 'lucide-react'

export default function Campaigns() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-600 mt-2">Manage your email campaigns</p>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">
            <Plus className="w-4 h-4 inline mr-2" />
            New Campaign
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <Mail className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-600 mb-6">Create your first email campaign to start reaching out to leads</p>
            <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">
              <Plus className="w-4 h-4 inline mr-2" />
              Create Your First Campaign
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
