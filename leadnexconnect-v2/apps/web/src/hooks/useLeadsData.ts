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
    withoutContacts: boolean
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
  // Fetch ALL leads without sourceType filter for accurate counts (with high limit)
  const { data: allLeadsData, isLoading: allLeadsLoading, refetch: refetchAllLeads } = useQuery({
    queryKey: ['all-leads'],
    queryFn: async () => {
      return await leadsService.getAll({ limit: 10000 } as any)
    },
  })

  // Fetch filtered leads based on current filters
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leads', statusFilter, filters, searchQuery, activeTab],
    queryFn: async () => {
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (filters.industry !== 'all') params.industry = filters.industry
      if (filters.source !== 'all') params.source = filters.source
      if (searchQuery) params.search = searchQuery
      if (filters.withoutContacts) params.withoutContacts = 'true'

      // Filter by source type based on active tab
      if (activeTab === 'imported') params.sourceType = 'manual_import'
      if (activeTab === 'generated') params.sourceType = 'automated'

      return await leadsService.getAll(params)
    },
  })

  // Fetch ALL batches for accurate counts
  const { data: allBatchesData, isLoading: allBatchesLoading, refetch: refetchAllBatches } = useQuery({
    queryKey: ['all-batches'],
    queryFn: async () => {
      const result = await leadsAPI.getBatches()
      return result.data
    },
    enabled: viewMode === 'batches' || generating,
    staleTime: 0,
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
  const allLeads = allLeadsData?.data || []
  const allBatchesArray = Array.isArray(allBatchesData?.data) ? allBatchesData.data : []
  const allBatches = Array.isArray(batchesData?.data) ? batchesData.data : []
  
  // Filter batches based on activeTab
  // Note: Batches don't have a 'source' field. Instead:
  // - Imported batches: importSettings has only {industry, enrichEmail}
  // - Generated batches: importSettings has {sources: [...], industry, country, city, maxResults}
  const batches = allBatches.filter((batch: any) => {
    if (activeTab === 'all') return true
    
    const hasSourcesArray = batch.importSettings?.sources && Array.isArray(batch.importSettings.sources)
    
    if (activeTab === 'imported') {
      // CSV imports don't have a sources array in importSettings
      return !hasSourcesArray
    }
    if (activeTab === 'generated') {
      // Generated batches have a sources array (apollo, google_places, etc.)
      return hasSourcesArray
    }
    return true
  })

  return {
    leads,
    batches,
    allLeads,  // All unfiltered leads for counting
    allBatches: allBatchesArray,  // All unfiltered batches for counting
    isLoading,
    batchesLoading,
    refetch: () => {
      refetch()
      refetchAllLeads()
    },
    refetchBatches: () => {
      refetchBatches()
      refetchAllBatches()
    }
  }
}
