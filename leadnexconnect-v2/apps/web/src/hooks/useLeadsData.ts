import { useQuery } from '@tanstack/react-query'
import leadsService from '@/services/leads.service'
import { leadsAPI } from '@/services/api'

interface UseLeadsDataParams {
  viewMode: 'table' | 'batches'
  activeTab: 'all' | 'imported' | 'generated'
  statusFilter: string
  filters: {
    industry: string
    minScore: number
    maxScore: number
    verificationStatus: string
    source: string
  }
  searchQuery: string
  generating: boolean
}

export function useLeadsData({
  viewMode,
  activeTab,
  statusFilter,
  filters,
  searchQuery,
  generating
}: UseLeadsDataParams) {
  // Fetch leads
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leads', statusFilter, filters, searchQuery, activeTab],
    queryFn: async () => {
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (filters.industry !== 'all') params.industry = filters.industry
      if (filters.source !== 'all') params.source = filters.source
      if (searchQuery) params.search = searchQuery
      
      // Filter by source type based on active tab
      if (activeTab === 'imported') params.sourceType = 'manual_import'
      if (activeTab === 'generated') params.sourceType = 'automated'
      
      return await leadsService.getAll(params)
    },
  })

  // Fetch batches for batch view
  const { data: batchesData, isLoading: batchesLoading, refetch: refetchBatches } = useQuery({
    queryKey: ['batches', activeTab],
    queryFn: async () => {
      const result = await leadsAPI.getBatches()
      return result.data
    },
    enabled: viewMode === 'batches' || generating,
    staleTime: 0,
  })

  const leads = data?.data || []
  const allBatches = Array.isArray(batchesData?.data) ? batchesData.data : []
  
  // Filter batches based on activeTab
  const batches = allBatches.filter((batch: any) => {
    if (activeTab === 'all') return true
    if (activeTab === 'imported') {
      return batch.source === 'csv_import' || batch.source === 'manual_import'
    }
    if (activeTab === 'generated') {
      return batch.source === 'apollo' || 
             batch.source === 'google_places' || 
             batch.source === 'peopledatalabs' ||
             batch.source === 'automated'
    }
    return true
  })

  return {
    leads,
    batches,
    isLoading,
    batchesLoading,
    refetch,
    refetchBatches
  }
}
