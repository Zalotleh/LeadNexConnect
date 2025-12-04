# Notification UX Improvement Plan

## Overview
This document outlines the strategy for improving notification patterns across the application. We found 100+ toast notifications that need to be categorized and improved for better UX.

## Current State
- **100+ toast notifications** across the application
- Simple `toast.success()`, `toast.error()`, `toast.warning()` patterns
- No confirmation dialogs for destructive actions
- Validation errors shown as toasts instead of inline
- No progress indicators for long operations

## Notification Strategy

### 1. **Modal Dialogs** (Use ConfirmDialog)
For important actions that need user acknowledgment or confirmation.

**When to Use:**
- Destructive actions (delete campaign, delete lead, delete batch)
- Critical errors that block workflow
- Important success messages with details
- Complex operation results (import summaries)

**Files to Update:**
- `leads.tsx` - Delete confirmations
- `campaigns/[id].tsx` - Delete campaign, stop campaign
- `batches/[id].tsx` - Delete batch
- `ApiConfigTab.tsx` - Delete API config
- `SmtpConfigTab.tsx` - Delete SMTP config

### 2. **Inline Validation**
For form field errors that should appear next to the field.

**When to Use:**
- Required field validation
- Format validation (email, URL)
- Field-specific constraints

**Files to Update:**
- `ApiConfigDialog.tsx` - Form validation
- `SmtpConfigDialog.tsx` - Form validation
- `EnhancedEmailEditor.tsx` - Template validation
- `BatchModals.tsx` - Campaign name validation

### 3. **Progress Indicators**
For long-running operations that need visual feedback.

**When to Use:**
- Lead generation (10-30 seconds)
- Lead enrichment (5-15 seconds)
- Import/export operations
- Campaign execution start

**Files to Update:**
- `leads.tsx` - Generate leads, export leads
- `campaigns/[id].tsx` - Start campaign
- `batches/[id].tsx` - Batch operations

### 4. **Toast Notifications** (Keep)
For non-critical success messages and background operations.

**When to Use:**
- Simple success confirmations
- Background operation completion
- Non-blocking informational updates

**Keep As-Is:**
- Template saved successfully
- Settings updated
- Configuration updated

## Implementation Priority

### Phase 1: Critical Actions (HIGH PRIORITY)
**Delete Confirmations** - Add ConfirmDialog before deleting:
- [ ] Delete Lead (leads/[id].tsx)
- [ ] Delete Campaign (campaigns/[id].tsx)
- [ ] Delete Batch (batches/[id].tsx)
- [ ] Delete API Config (ApiConfigTab.tsx)
- [ ] Delete SMTP Config (SmtpConfigTab.tsx)
- [ ] Bulk Delete Leads (leads.tsx)

### Phase 2: Inline Validation (HIGH PRIORITY)
**Form Validation** - Replace validation toasts:
- [ ] ApiConfigDialog.tsx - "Please select an API source" → inline error
- [ ] SmtpConfigDialog.tsx - "Please enter host and port" → inline error
- [ ] EnhancedEmailEditor.tsx - "Template name required" → inline error
- [ ] BatchModals.tsx - "Please enter campaign name" → inline error
- [ ] leads.tsx - "Please select an industry" → inline error

### Phase 3: Progress Indicators (MEDIUM PRIORITY)
**Long Operations** - Add progress dialogs:
- [ ] Generate leads from Apollo.io (leads.tsx)
- [ ] Generate leads from Google Places (leads.tsx)
- [ ] Enrich leads (leads.tsx)
- [ ] Export leads (leads.tsx)
- [ ] Start campaign (campaigns/[id].tsx)
- [ ] Import leads (leads.tsx)

### Phase 4: Result Dialogs (MEDIUM PRIORITY)
**Complex Results** - Show detailed results in dialog:
- [ ] Import results with duplicate count (leads.tsx)
- [ ] Enrichment results with success/failure stats
- [ ] Campaign creation with lead count
- [ ] Export completion with file info

### Phase 5: Polish (LOW PRIORITY)
**Toast Improvements** - Keep as toasts but improve:
- [ ] Consistent success icons
- [ ] Better error messages with actionable info
- [ ] Longer duration for important messages
- [ ] Better positioning (top-right for non-blocking)

## Component Requirements

### Existing Components (Use These)
✅ **ConfirmDialog** (`components/ConfirmDialog.tsx`)
- Already exists with variants: danger, warning, info, success
- Supports loading state
- Well-styled with icons

### New Components Needed
❌ **ProgressDialog** (Need to Create)
```tsx
interface ProgressDialogProps {
  isOpen: boolean
  title: string
  message: string
  progress?: number // 0-100
  indeterminate?: boolean
}
```

❌ **ResultDialog** (Need to Create)
```tsx
interface ResultDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  variant: 'success' | 'warning' | 'error'
  stats?: Array<{ label: string; value: number | string }>
  actions?: Array<{ label: string; onClick: () => void }>
}
```

❌ **InlineError** (Need to Create)
```tsx
interface InlineErrorProps {
  message: string
  visible: boolean
}
```

## File-by-File Breakdown

### 1. leads.tsx (24 toasts)
**Delete Confirmations:**
- Line ~450: Delete lead → Use ConfirmDialog
- Line ~680: Bulk delete → Use ConfirmDialog

**Inline Validation:**
- Line ~520: "Please select an industry" → Inline error
- Line ~560: "Please select a search method" → Inline error

**Progress Indicators:**
- Line ~590: "Generating leads..." → ProgressDialog
- Line ~740: "Enriching leads..." → ProgressDialog
- Line ~820: "Exporting leads..." → ProgressDialog

**Result Dialogs:**
- Line ~610: Import results → ResultDialog with stats

**Keep as Toast:**
- Lead status updated
- Lead assigned
- Settings saved

### 2. campaigns/[id].tsx (8 toasts)
**Delete Confirmations:**
- Line ~120: Delete campaign → Use ConfirmDialog
- Line ~180: Stop campaign → Use ConfirmDialog (warning variant)

**Progress Indicators:**
- Line ~240: "Starting campaign..." → ProgressDialog

**Keep as Toast:**
- Campaign updated
- Campaign paused
- Campaign resumed

### 3. batches/[id].tsx (6 toasts)
**Delete Confirmations:**
- Line ~90: Delete batch → Use ConfirmDialog

**Inline Validation:**
- Line ~150: "Please select leads" → Inline error

**Keep as Toast:**
- Batch updated
- Leads added to batch

### 4. EnhancedEmailEditor.tsx (8 toasts)
**Inline Validation:**
- Line ~305: "Template name required" → Inline error
- Line ~310: "Email body empty" → Inline error

**Keep as Toast:**
- Template saved successfully
- Template loaded
- Failed to load templates (background error)

### 5. ApiConfigTab.tsx (4 toasts)
**Delete Confirmations:**
- Line ~59: Delete config → Use ConfirmDialog

**Keep as Toast:**
- Config deleted successfully
- Failed to load configs

### 6. SmtpConfigTab.tsx (4 toasts)
**Delete Confirmations:**
- Line ~59: Delete config → Use ConfirmDialog

**Keep as Toast:**
- Config deleted successfully
- Failed to load configs

### 7. ApiConfigDialog.tsx (3 toasts)
**Inline Validation:**
- Line ~43: "Please select an API source" → Inline error

**Keep as Toast:**
- Config saved successfully
- Save failed

### 8. SmtpConfigDialog.tsx (6 toasts)
**Inline Validation:**
- Line ~48: "Please enter host and port" → Inline error
- Line ~79: "Fill required fields" → Inline error

**Keep as Toast:**
- Connection test success/failure (immediate feedback)
- Config saved

### 9. BatchModals.tsx (3 toasts)
**Inline Validation:**
- Line ~244: "Please enter campaign name" → Inline error

**Progress Indicators:**
- Line ~249: "Creating campaign..." → ProgressDialog

**Keep as Toast:**
- Campaign created successfully

## Implementation Guidelines

### 1. Delete Confirmation Pattern
```tsx
// Before
const handleDelete = async () => {
  try {
    await api.delete(`/leads/${id}`);
    toast.success('Lead deleted successfully');
  } catch (error) {
    toast.error('Failed to delete lead');
  }
};

// After
const [showDeleteDialog, setShowDeleteDialog] = useState(false);

const handleDeleteConfirm = async () => {
  setIsDeleting(true);
  try {
    await api.delete(`/leads/${id}`);
    setShowDeleteDialog(false);
    toast.success('Lead deleted successfully');
  } catch (error) {
    toast.error('Failed to delete lead');
  } finally {
    setIsDeleting(false);
  }
};

// In JSX
<ConfirmDialog
  isOpen={showDeleteDialog}
  onClose={() => setShowDeleteDialog(false)}
  onConfirm={handleDeleteConfirm}
  title="Delete Lead"
  message="Are you sure you want to delete this lead? This action cannot be undone."
  confirmText="Delete"
  variant="danger"
  isLoading={isDeleting}
/>
```

### 2. Inline Validation Pattern
```tsx
// Before
const handleSubmit = () => {
  if (!formData.name) {
    toast.error('Please enter a name');
    return;
  }
  // ...
};

// After
const [errors, setErrors] = useState<{ name?: string }>({});

const validateForm = () => {
  const newErrors: { name?: string } = {};
  if (!formData.name) {
    newErrors.name = 'Name is required';
  }
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleSubmit = () => {
  if (!validateForm()) return;
  // ...
};

// In JSX
<input
  value={formData.name}
  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
  className={errors.name ? 'border-red-500' : ''}
/>
{errors.name && <InlineError message={errors.name} visible={true} />}
```

### 3. Progress Dialog Pattern
```tsx
// Before
const handleGenerate = async () => {
  toast.loading('Generating leads...');
  try {
    const result = await api.post('/leads/generate', data);
    toast.success(`Generated ${result.count} leads`);
  } catch (error) {
    toast.error('Failed to generate leads');
  }
};

// After
const [showProgressDialog, setShowProgressDialog] = useState(false);
const [progressMessage, setProgressMessage] = useState('');

const handleGenerate = async () => {
  setShowProgressDialog(true);
  setProgressMessage('Connecting to Apollo.io...');
  try {
    const result = await api.post('/leads/generate', data, {
      onUploadProgress: (progress) => {
        setProgressMessage('Fetching leads...');
      }
    });
    setShowProgressDialog(false);
    // Show result dialog instead
    setShowResultDialog(true);
    setResult(result);
  } catch (error) {
    setShowProgressDialog(false);
    toast.error('Failed to generate leads');
  }
};

// In JSX
<ProgressDialog
  isOpen={showProgressDialog}
  title="Generating Leads"
  message={progressMessage}
  indeterminate={true}
/>
```

## Success Metrics
- ✅ All destructive actions have confirmation dialogs
- ✅ Form validation errors show inline
- ✅ Long operations show progress indicators
- ✅ Complex results show detailed dialogs
- ✅ Only non-critical messages use toasts
- ✅ User feels more confident and informed

## Timeline
- **Phase 1 (Critical Actions)**: 2-3 hours
- **Phase 2 (Inline Validation)**: 2-3 hours
- **Phase 3 (Progress Indicators)**: 3-4 hours
- **Phase 4 (Result Dialogs)**: 2-3 hours
- **Phase 5 (Polish)**: 1-2 hours

**Total Estimated Time**: 10-15 hours

## Next Steps
1. ✅ Create this plan document
2. ⏳ Create ProgressDialog component
3. ⏳ Create ResultDialog component
4. ⏳ Create InlineError component
5. ⏳ Start Phase 1: Add delete confirmations
6. ⏳ Continue with remaining phases
7. ⏳ Test all changes thoroughly
8. ⏳ Commit improvements
