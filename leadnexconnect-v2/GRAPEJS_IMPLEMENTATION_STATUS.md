# GrapeJS Email Editor - Implementation Status & Testing Guide

## ✅ Phase 1: COMPLETE - Core Setup & Integration

### What's Been Implemented:

#### 1. **Variable Management System** ✅
- **File:** `apps/web/src/lib/emailVariables.ts`
- **Features:**
  - EmailVariableManager singleton class
  - Centralized variable definitions
  - Support for lead, company, link, and custom variables
  - Methods to add/remove/update variables
  - Export for backend sync
  - Grouped variable retrieval

#### 2. **GrapeJS Visual Editor** ✅
- **File:** `apps/web/src/components/EmailEditor/GrapeJSEmailEditor.tsx`
- **Features:**
  - Full drag-and-drop email builder
  - Dynamic variable blocks from EmailVariableManager
  - Desktop/mobile preview toggle
  - Code editor mode
  - Real-time HTML/CSS export
  - Save & close functionality
  - Professional UI with modals

#### 3. **Enhanced Email Editor Wrapper** ✅
- **File:** `apps/web/src/components/EmailEditor/EnhancedEmailEditor.tsx`
- **Features:**
  - Toggle between Simple (textarea) and Visual (GrapeJS) modes
  - Lazy loading to avoid SSR issues
  - Loading states with Suspense
  - Content preview before opening visual editor
  - Backward compatible with existing simple editor

#### 4. **Workflow Integration** ✅
- **File:** `apps/web/src/pages/workflows/[id].tsx`
- **Changes:**
  - Replaced EmailEditor with EnhancedEmailEditor
  - Added enableVisualEditor={true} prop
  - Type-safe onChange handler
  - Works with existing workflow system

#### 5. **Campaign Creation Integration** ✅
- **File:** `apps/web/src/components/leads/CreateCampaignModal.tsx`
- **Changes:**
  - Replaced EmailEditor with EnhancedEmailEditor
  - Added enableVisualEditor={true} prop
  - Type-safe onChange handler
  - Compatible with AI generation

#### 6. **Professional CSS Styling** ✅
- **File:** `apps/web/src/styles/globals.css`
- **Features:**
  - GrapeJS core and newsletter preset CSS imported
  - Custom theme matching LeadNexConnect brand
  - Variable blocks with purple gradient
  - Hover effects and transitions
  - Responsive design
  - Custom scrollbars
  - Professional color scheme

---

## 🧪 Testing Guide

### Prerequisites:
```bash
# Make sure you're on the latest code
cd /path/to/leadnexconnect-v2
git pull origin main

# Install dependencies (already done)
cd apps/web
npm install

# Start development server
npm run dev
```

### Test 1: Workflow Email Editor

**Steps:**
1. Navigate to `/workflows`
2. Click on any existing workflow (or create a new one)
3. Click "Add Step" or edit an existing step
4. Look for the "Email Body" section
5. You should see a toggle: **Simple** / **Visual**

**Expected Behavior:**
- ✅ Simple mode shows the old textarea editor
- ✅ Visual mode shows "Launch Visual Editor" button
- ✅ Clicking button opens full-screen GrapeJS modal
- ✅ Variable blocks appear in left panel grouped by category
- ✅ Can drag components to canvas
- ✅ Can insert variables by dragging or typing {{variableName}}
- ✅ Desktop/Mobile preview buttons work
- ✅ Save & Close saves HTML to workflow step
- ✅ Saved HTML persists after page reload

**Test Cases:**
- [ ] Toggle between simple and visual modes
- [ ] Open visual editor
- [ ] Drag a text block
- [ ] Insert {{companyName}} variable
- [ ] Change font color
- [ ] Add a button component
- [ ] Preview on mobile
- [ ] Save and close
- [ ] Verify HTML saved correctly

### Test 2: Campaign Creation with Visual Editor

**Steps:**
1. Navigate to `/leads`
2. Click "Create Campaign"
3. Fill in campaign name
4. In the email section, look for Simple/Visual toggle

**Expected Behavior:**
- ✅ Can choose between workflow or custom email
- ✅ When using custom email, see Simple/Visual toggle
- ✅ Visual editor opens properly
- ✅ Can design email visually
- ✅ Save campaign with HTML email
- ✅ Campaign executes correctly with visual email

**Test Cases:**
- [ ] Create campaign with workflow (should work as before)
- [ ] Create campaign with custom email - simple mode
- [ ] Create campaign with custom email - visual mode
- [ ] Design email with multiple variables
- [ ] Add images and buttons
- [ ] Save campaign
- [ ] Execute campaign and verify email sent correctly

### Test 3: Variable System

**Steps:**
1. Open visual editor
2. Check left panel for variable blocks
3. Look for categories: Lead, Company, Link

**Expected Behavior:**
- ✅ Variables grouped by category
- ✅ Lead variables: companyName, contactName, email, etc.
- ✅ Company variables: ourCompanyName, ourEmail, etc.
- ✅ Link variables: signUpLink, featuresLink, etc.
- ✅ Each variable renders as {{variableName}}
- ✅ Variables styled with purple gradient background

**Test Cases:**
- [ ] Verify all lead variables present
- [ ] Verify all company variables present
- [ ] Verify all link variables present
- [ ] Drag variable block to canvas
- [ ] Type variable manually: {{companyName}}
- [ ] Check variable format in HTML export

### Test 4: Desktop/Mobile Preview

**Steps:**
1. Open visual editor
2. Design an email
3. Click desktop/mobile toggle buttons

**Expected Behavior:**
- ✅ Desktop view shows full width
- ✅ Mobile view shows ~320px width
- ✅ Email layout adjusts responsively
- ✅ Can switch between views seamlessly
- ✅ Design preserved when switching

**Test Cases:**
- [ ] Design email in desktop view
- [ ] Switch to mobile view
- [ ] Verify layout adjusts
- [ ] Switch back to desktop
- [ ] Verify design preserved

### Test 5: HTML Export Quality

**Steps:**
1. Design email in visual editor
2. Save and close
3. Check the saved HTML in database/workflow

**Expected Behavior:**
- ✅ HTML is clean and well-formatted
- ✅ Variables preserved as {{variableName}}
- ✅ Inline CSS included
- ✅ Email client compatible (table-based layout)
- ✅ No broken tags or syntax errors

**Test Cases:**
- [ ] Design complex email with multiple components
- [ ] Save and inspect HTML
- [ ] Verify all variables present
- [ ] Check CSS is inline
- [ ] Test in email client preview (if available)

### Test 6: Backward Compatibility

**Steps:**
1. Open existing workflow with old plain text emails
2. Edit a step
3. Switch to visual mode
4. Verify content loads

**Expected Behavior:**
- ✅ Old plain text emails load correctly
- ✅ Can convert plain text to visual HTML
- ✅ Variables preserved during conversion
- ✅ Can switch back to simple mode
- ✅ No data loss

**Test Cases:**
- [ ] Load old plain text email
- [ ] Switch to visual editor
- [ ] Verify content appears
- [ ] Edit and save
- [ ] Verify original variables still work

---

## 🐛 Known Issues & Limitations

### Current Limitations:
1. **AI Generation → Visual Editor**: AI-generated content loads as text, needs manual conversion to visual components (Phase 2)
2. **Custom Variables UI**: No settings page yet to add custom variables (Phase 4)
3. **Email Preview with Data**: No preview with actual lead data replacement (Phase 3)
4. **Template Library**: No saved templates yet (Future enhancement)

### Expected Behavior (Not Bugs):
- GrapeJS modal takes 1-2 seconds to load (lazy loading, normal)
- CSS import warnings in linter (Tailwind syntax, harmless)
- Simple editor still default (intentional for gradual rollout)

---

## 📊 Implementation Checklist

### ✅ Phase 1: Core Setup (COMPLETE)
- [x] Install GrapeJS packages
- [x] Create EmailVariableManager
- [x] Update GrapeJSEmailEditor with variables
- [x] Create EnhancedEmailEditor wrapper
- [x] Integrate with workflow editor
- [x] Integrate with campaign creation
- [x] Add CSS styling
- [x] Test compilation (no errors)
- [x] Commit and push to GitHub

### 🔄 Phase 2: AI Integration (NEXT)
- [ ] Update AI email generator to output HTML
- [ ] Parse AI response into GrapeJS format
- [ ] Load AI content into visual editor
- [ ] Test AI generation → visual editing flow
- [ ] Preserve variables in AI output

### 🔄 Phase 3: Enhanced Features (UPCOMING)
- [ ] Create EmailViewer component
- [ ] Create EmailEditModal component
- [ ] Add preview with sample data
- [ ] Add edit capability to sent emails
- [ ] Add template save/load functionality

### 🔄 Phase 4: Variable Management (UPCOMING)
- [ ] Create settings page for variables
- [ ] Add custom variable CRUD
- [ ] Database schema for custom variables
- [ ] Backend API for variables
- [ ] Sync frontend/backend variables

---

## 🚀 How to Test Right Now

### Quick Test Workflow:

1. **Start dev server:**
   ```bash
   cd apps/web
   npm run dev
   ```

2. **Open browser:** `http://localhost:3000`

3. **Navigate to Workflows:** `/workflows`

4. **Click any workflow** or create new one

5. **Add or edit a step**

6. **Look for the Email Body section**

7. **Click the "Visual" toggle**

8. **Click "Open Visual Editor"**

9. **Test the editor:**
   - Drag text component from left panel
   - Type some content
   - Insert {{companyName}} variable
   - Change text color (click text → right panel → Typography → color)
   - Add a button component
   - Preview on mobile (top buttons)
   - Click "Save & Close"

10. **Verify saved:**
    - Check that email body now contains HTML
    - Refresh page
    - Edit step again
    - Content should load in visual editor

---

## 💡 Tips for Testing

### Best Practices:
1. **Start Simple**: Test with basic text and variables first
2. **Progressive Complexity**: Then add images, buttons, columns
3. **Test on Real Data**: Create a test campaign and send to yourself
4. **Check Variables**: Verify {{variables}} are replaced correctly
5. **Mobile First**: Always test mobile view before saving
6. **Browser DevTools**: Check console for any errors

### Common Issues & Solutions:

**Issue**: Visual editor not opening
- **Solution**: Check browser console for errors, ensure GrapeJS packages installed

**Issue**: Variables not showing
- **Solution**: Refresh page, check EmailVariableManager initialization

**Issue**: CSS not loading
- **Solution**: Hard refresh browser (Ctrl+Shift+R), check globals.css imported

**Issue**: HTML not saving
- **Solution**: Check onChange handler, verify API endpoint working

---

## 📞 Next Steps

### Immediate:
1. ✅ Test workflow email editing with visual editor
2. ✅ Test campaign creation with visual editor
3. ✅ Verify variables work correctly
4. ✅ Check desktop/mobile preview

### Short-term (Phase 2):
1. Integrate AI generation with visual editor
2. Allow users to generate email, then customize in visual editor
3. Test AI → Visual → Save flow

### Medium-term (Phase 3-4):
1. Add settings page for custom variables
2. Create reusable email templates
3. Add email preview with actual data
4. Enhance variable management

---

## 🎉 Success Criteria

The implementation is successful if:
- ✅ Users can open visual editor from workflows
- ✅ Users can drag components and design emails
- ✅ Variables work in both simple and visual modes
- ✅ Emails save correctly and send properly
- ✅ No breaking changes to existing functionality
- ✅ UI is intuitive and responsive
- ✅ Performance is acceptable (<2s load time)

---

**Status:** Phase 1 Complete ✅
**Ready for Testing:** YES
**Last Updated:** December 2, 2025
**Next Phase:** AI Integration (Phase 2)
