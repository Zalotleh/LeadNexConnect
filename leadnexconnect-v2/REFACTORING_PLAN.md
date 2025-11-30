# Leads Page Refactoring Plan

## Current Status
- **File Size**: 2,703 lines
- **Problem**: Single massive file with too much complexity
- **Goal**: Split into modular, maintainable components

## Components Created ✅

### 1. **useLeadsData Hook** (`/hooks/useLeadsData.ts`)
- Handles all data fetching logic
- Manages leads and batches queries
- Exports: leads, batches, isLoading, batchesLoading, refetch, refetchBatches
- ~85 lines ✅

### 2. **ImportCSVDialog Component** (`/components/leads/ImportCSVDialog.tsx`)
- Standalone CSV import dialog
- Props-based, fully reusable
- ~200 lines ✅

### 3. **GenerateLeadsModal Component** (`/components/leads/GenerateLeadsModal.tsx`)
- Lead generation modal with source selection (Apollo, Google Places, PDL, LinkedIn)
- Industry and location filters, batch naming
- ~250 lines ✅

### 4. **CreateCampaignModal Component** (`/components/leads/CreateCampaignModal.tsx`)
- Campaign creation from selected leads
- Workflow selector, email editor, scheduling
- ~190 lines ✅

### 5. **LeadModals Component** (`/components/leads/LeadModals.tsx`)
- View lead modal (read-only display)
- Edit lead modal (form with all fields)
- Create lead modal (new lead form)
- ~600 lines ✅

### 6. **BatchModals Component** (`/components/leads/BatchModals.tsx`)
- Batch analytics modal (metrics, quality, campaigns)
- Batch campaign creation modal
- ~390 lines ✅

### 7. **LeadsTableView Component** (`/components/leads/LeadsTableView.tsx`)
- Complete table view for leads
- Search, filters, bulk actions, status badges
- Quality scores with visual indicators
- ~200 lines ✅

### 8. **BatchesView Component** (`/components/leads/BatchesView.tsx`)
- Batch cards display with metrics
- Loading and empty states
- Action buttons (campaign, analytics)
- ~160 lines ✅

## Main Page Structure (`/pages/leads.tsx`)

After refactoring, the main file should be ~300-400 lines:
```tsx
- Imports (30 lines)
- State management (50 lines)
- Handler functions (100 lines)
- Main render with view tabs (50 lines)
- Conditional component renders (70 lines)
```

## Benefits

1. **Maintainability**: Each component is self-contained
2. **Reusability**: Components can be used elsewhere
3. **Testing**: Easier to unit test individual components
4. **Performance**: Can optimize re-renders per component
5. **Collaboration**: Multiple developers can work on different components
6. **Readability**: Clear separation of concerns

## Implementation Strategy

1. ✅ Create hook for data fetching (useLeadsData)
2. ✅ Extract Import CSV Dialog
3. ✅ Extract Generate Leads Modal
4. ✅ Extract Create Campaign Modal
5. ✅ Extract Lead Modals (View, Edit, Create)
6. ✅ Extract Batch Modals (Analytics, Campaign)
7. ✅ Extract Leads Table View
8. ✅ Extract Batches View
9. ⏳ Refactor main leads.tsx to use all components
10. ⏳ Test thoroughly
11. ⏳ Remove old code and cleanup

## Progress Summary

**Completed**: 8 of 8 components (~2,075 lines extracted)
**Remaining**: Main file integration and testing
**Status**: 100% component extraction complete! 🎉

Next Phase: Integrate all components into main leads.tsx file

## File Size Reduction

- **Before**: 2,703 lines (1 file)
- **After**: ~400 lines (main) + 8 components (~2,500 lines total, modular)
- **Benefit**: 85% reduction in main file complexity
