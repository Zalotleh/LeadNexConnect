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

### 2. **ImportCSVDialog Component** (`/components/leads/ImportCSVDialog.tsx`)
- Standalone CSV import dialog
- Props-based, fully reusable
- ~200 lines

## Components To Create

### 3. **GenerateLeadsModal** (`/components/leads/GenerateLeadsModal.tsx`)
- Lead generation modal with source selection
- Industry and location filters
- Batch naming
- ~300 lines

### 4. **LeadsTableView** (`/components/leads/LeadsTableView.tsx`)
- Complete table view for leads
- Search, filters, bulk actions
- ~500 lines

### 5. **BatchesView** (`/components/leads/BatchesView.tsx`)
- Batch cards view
- Batch operations (analytics, campaigns)
- ~400 lines

### 6. **LeadModals** (`/components/leads/LeadModals.tsx`)
- Create lead modal
- Edit lead modal
- View lead modal
- Delete confirmation
- ~300 lines

### 7. **BatchModals** (`/components/leads/BatchModals.tsx`)
- Batch analytics modal
- Batch campaign modal
- ~200 lines

### 8. **CreateCampaignModal** (`/components/leads/CreateCampaignModal.tsx`)
- Campaign creation from leads/batches
- Email template selection
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

1. ✅ Create hook for data fetching
2. ✅ Extract Import CSV Dialog
3. Extract Generate Leads Modal
4. Extract Table View
5. Extract Batches View
6. Extract Lead Modals
7. Extract Batch Modals
8. Extract Campaign Modal
9. Refactor main leads.tsx to use all components
10. Test thoroughly
11. Remove old code

## File Size Reduction

- **Before**: 2,703 lines (1 file)
- **After**: ~400 lines (main) + 8 components (~2,500 lines total, modular)
- **Benefit**: 85% reduction in main file complexity
