// @ts-nocheck
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import UserActivityTimeline from '@/components/UserActivityTimeline'
import {
  Users, UserPlus, Edit, Trash2, Shield, User, Lock, Unlock,
  Mail, Clock, CheckSquare, Square, Download, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'user'
  status: 'active' | 'inactive'
  createdAt: string
  lastLoginAt: string | null
}

function UserManagement() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [viewingTimeline, setViewingTimeline] = useState<User | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [bulkOperation, setBulkOperation] = useState<'activate' | 'deactivate' | 'delete' | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'user' as 'admin' | 'user',
    status: 'active' as 'active' | 'inactive',
  })

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await api.get('/users')
      return response.data.data.users
    },
  })

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof formData) => {
      const response = await api.post('/users', userData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowCreateModal(false)
      resetForm()
      toast.success('User created successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create user')
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await api.put(`/users/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowCreateModal(false)
      setEditingUser(null)
      resetForm()
      toast.success('User updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update user')
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/users/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete user')
    },
  })

  const bulkOperationMutation = useMutation({
    mutationFn: async ({ userIds, operation }: { userIds: string[]; operation: string }) => {
      const response = await api.post('/users/bulk', { userIds, operation })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setSelectedUsers([])
      setShowBulkConfirm(false)
      setBulkOperation(null)
      const result = data.data
      toast.success(`Bulk operation completed: ${result.success} succeeded, ${result.failed} failed`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to perform bulk operation')
    },
  })

  const resetForm = () => {
    setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'user', status: 'active' })
  }

  const handleBulkAction = (operation: 'activate' | 'deactivate' | 'delete') => {
    setBulkOperation(operation)
    setShowBulkConfirm(true)
  }

  const confirmBulkOperation = () => {
    if (bulkOperation && selectedUsers.length > 0) {
      bulkOperationMutation.mutate({ userIds: selectedUsers, operation: bulkOperation })
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === users?.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users?.map((u) => u.id) || [])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingUser) {
      const { password, ...updateData } = formData
      const dataToSend = password ? formData : updateData
      updateUserMutation.mutate({ id: editingUser.id, data: dataToSend })
    } else {
      createUserMutation.mutate(formData)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
    })
    setShowCreateModal(true)
  }

  const handleDelete = (user: User) => {
    if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      deleteUserMutation.mutate(user.id)
    }
  }

  const handleExport = async () => {
    try {
      const response = await api.get('/api/admin/export/users', { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Users exported successfully')
    } catch {
      toast.error('Failed to export users')
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingUser(null)
    resetForm()
  }

  // Derived counts
  const total     = users?.length || 0
  const admins    = users?.filter((u) => u.role === 'admin').length || 0
  const active    = users?.filter((u) => u.status === 'active').length || 0
  const inactive  = users?.filter((u) => u.status === 'inactive').length || 0
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

  return (
    <Layout>
      <div className="space-y-6">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary-600" />
              User Management
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Manage system users and permissions.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>

        {/* ── Bulk Actions Bar ──────────────────────────────────────────── */}
        {selectedUsers.length > 0 && (
          <div className="flex items-center justify-between gap-4 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-primary-900">
              {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Unlock className="w-3.5 h-3.5" />
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                Deactivate
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          </div>
        )}

        {/* ── Stats Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <div className="w-11 h-11 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 tabular-nums">{total}</p>
            <p className="text-xs text-gray-400 mt-1.5 mb-4">Registered accounts</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: total > 0 ? '100%' : '0%' }} />
            </div>
          </div>

          {/* Admins */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-sm font-medium text-gray-500">Admins</p>
              <div className="w-11 h-11 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 tabular-nums">{admins}</p>
            <p className="text-xs text-gray-400 mt-1.5 mb-4">{pct(admins, total)}% of all users</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct(admins, total)}%` }} />
            </div>
          </div>

          {/* Active */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <div className="w-11 h-11 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Unlock className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 tabular-nums">{active}</p>
            <p className="text-xs text-gray-400 mt-1.5 mb-4">{pct(active, total)}% of all users</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct(active, total)}%` }} />
            </div>
          </div>

          {/* Inactive */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-sm font-medium text-gray-500">Inactive Users</p>
              <div className="w-11 h-11 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 tabular-nums">{inactive}</p>
            <p className="text-xs text-gray-400 mt-1.5 mb-4">{pct(inactive, total)}% of all users</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct(inactive, total)}%` }} />
            </div>
          </div>
        </div>

        {/* ── Users Table ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3.5 text-left">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center"
                    >
                      {selectedUsers.length === users?.length && users?.length > 0 ? (
                        <CheckSquare className="w-4.5 h-4.5 text-primary-600" />
                      ) : (
                        <Square className="w-4.5 h-4.5 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">User</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Role</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Last Login</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-7 h-7 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : users && users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${selectedUsers.includes(user.id) ? 'bg-primary-50/40' : ''}`}>
                      <td className="px-4 py-4">
                        <button onClick={() => toggleUserSelection(user.id)} className="flex items-center justify-center">
                          {selectedUsers.includes(user.id) ? (
                            <CheckSquare className="w-4.5 h-4.5 text-primary-600" />
                          ) : (
                            <Square className="w-4.5 h-4.5 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            user.role === 'admin' ? 'bg-purple-100' : 'bg-gray-100'
                          }`}>
                            {user.role === 'admin' ? (
                              <Shield className="w-4 h-4 text-purple-600" />
                            ) : (
                              <User className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          user.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          user.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                          {user.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 tabular-nums">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : <span className="text-gray-400 italic">Never</span>}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setViewingTimeline(user)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 transition-colors"
                            title="View activity timeline"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Timeline
                          </button>
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-xs font-medium text-primary-600 hover:text-primary-800 inline-flex items-center gap-1 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="text-xs font-medium text-red-600 hover:text-red-800 inline-flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center">
                      <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No users found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bulk Confirm Modal ────────────────────────────────────────── */}
        {showBulkConfirm && bulkOperation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                Confirm {bulkOperation.charAt(0).toUpperCase() + bulkOperation.slice(1)}
              </h2>
              <p className="text-sm text-gray-600 mb-2">
                Are you sure you want to <strong>{bulkOperation}</strong>{' '}
                {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}?
              </p>
              {bulkOperation === 'delete' && (
                <p className="text-xs text-red-600 font-medium mb-4">This action cannot be undone.</p>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowBulkConfirm(false); setBulkOperation(null) }}
                  className="px-4 py-2 text-sm border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkOperation}
                  disabled={bulkOperationMutation.isPending}
                  className={`px-4 py-2 text-sm rounded-xl text-white transition-colors disabled:opacity-50 ${
                    bulkOperation === 'delete'
                      ? 'bg-red-600 hover:bg-red-700'
                      : bulkOperation === 'activate'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-yellow-500 hover:bg-yellow-600'
                  }`}
                >
                  {bulkOperationMutation.isPending
                    ? 'Processing…'
                    : `Confirm ${bulkOperation.charAt(0).toUpperCase() + bulkOperation.slice(1)}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Create / Edit Modal ───────────────────────────────────────── */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    required
                    disabled={!!editingUser}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Password{editingUser && <span className="text-gray-400 font-normal ml-1">(leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required={!editingUser}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createUserMutation.isPending || updateUserMutation.isPending}
                    className="px-4 py-2 text-sm bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {createUserMutation.isPending || updateUserMutation.isPending
                      ? 'Saving…'
                      : editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Activity Timeline Modal ───────────────────────────────────── */}
        {viewingTimeline && (
          <UserActivityTimeline
            userId={viewingTimeline.id}
            userName={`${viewingTimeline.firstName} ${viewingTimeline.lastName}`}
            onClose={() => setViewingTimeline(null)}
          />
        )}

      </div>
    </Layout>
  )
}

function UserManagementWithProtection() {
  return (
    <ProtectedRoute requireAdmin>
      <UserManagement />
    </ProtectedRoute>
  )
}

export default UserManagementWithProtection
