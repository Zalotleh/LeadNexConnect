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

## Components To Create

### 6. **BatchModals** (`/components/leads/BatchModals.tsx`)
- Batch analytics modal
- Batch campaign modal
- ~200 lines

### 7. **LeadsTableView** (`/components/leads/LeadsTableView.tsx`)
- Complete table view for leads
- Search, filters, bulk actions
- ~500 lines

### 8. **BatchesView** (`/components/leads/BatchesView.tsx`)
- Batch cards view
- Batch operations (analytics, campaigns)
- ~400 lines

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
6. ⏳ Extract Batch Modals (Analytics, Campaign)
7. ⏳ Extract Table View
8. ⏳ Extract Batches View
9. ⏳ Refactor main leads.tsx to use all components
10. ⏳ Test thoroughly
11. ⏳ Remove old code

## Progress Summary

**Completed**: 5 of 8 components (~1,325 lines extracted)
**Remaining**: 3 components + main file integration (~1,100 lines + refactoring)
**Status**: ~49% complete

## File Size Reduction

- **Before**: 2,703 lines (1 file)
- **After**: ~400 lines (main) + 8 components (~2,500 lines total, modular)
- **Benefit**: 85% reduction in main file complexity
