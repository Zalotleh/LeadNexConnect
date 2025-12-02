# GrapeJS Email Editor - Installation & Setup Guide

## 📦 Installation

### 1. Install GrapeJS Dependencies

```bash
cd apps/web
npm install grapesjs grapesjs-preset-newsletter grapesjs-blocks-basic
```

### 2. Install CSS Loaders (if not already installed)

GrapeJS requires CSS imports. If you encounter CSS import errors, install:

```bash
npm install --save-dev @next/font
```

## 🚀 Quick Start

### Option 1: Use Enhanced Editor (Recommended)

Replace your existing `EmailEditor` imports with the new `EnhancedEmailEditor`:

```tsx
// Before:
import EmailEditor from '@/components/EmailEditor';

// After:
import { EnhancedEmailEditor } from '@/components/EmailEditor';

// Usage:
<EnhancedEmailEditor
  label="Email Body"
  value={emailBody}
  onChange={setEmailBody}
  enableVisualEditor={true}  // Toggle visual editor feature
  rows={10}
  required
/>
```

### Option 2: Use Visual Editor Directly

```tsx
import { GrapeJSEmailEditor } from '@/components/EmailEditor';

const [showEditor, setShowEditor] = useState(false);

// Open modal:
<GrapeJSEmailEditor
  value={emailHtml}
  onChange={setEmailHtml}
  onClose={() => setShowEditor(false)}
  variables={EMAIL_VARIABLES}
/>
```

## 🔧 Implementation Steps

### Step 1: Update Workflow Email Editor

**File:** `apps/web/src/pages/workflows/[id].tsx`

```tsx
// Line 5 - Update import
import { EnhancedEmailEditor } from '@/components/EmailEditor';

// Line 441 - Replace EmailEditor with EnhancedEmailEditor
<EnhancedEmailEditor
  label="Email Body"
  value={editingStep.body}
  onChange={(value) => setEditingStep({ ...editingStep, body: value })}
  placeholder="Email body with variables..."
  rows={12}
  required
  enableVisualEditor={true}
/>
```

### Step 2: Update Campaign Creation Modal

**File:** `apps/web/src/components/leads/CreateCampaignModal.tsx`

```tsx
// Line 4 - Update import
import { EnhancedEmailEditor } from '../EmailEditor';

// Line 134 - Replace EmailEditor with EnhancedEmailEditor
<EnhancedEmailEditor
  label="Email Body"
  value={formData.emailBody}
  onChange={(value) => setFormData({ ...formData, emailBody: value })}
  placeholder="Write your email body here..."
  rows={10}
  required
  enableVisualEditor={true}
/>
```

### Step 3: Add CSS to Global Styles (Optional)

**File:** `apps/web/src/styles/globals.css`

Add at the end:

```css
/* GrapeJS Email Editor Styles */
@import 'grapesjs/dist/css/grapes.min.css';
@import 'grapesjs-preset-newsletter/dist/grapesjs-preset-newsletter.min.css';

/* Custom GrapeJS Styling */
.gjs-cv-canvas {
  background-color: #f3f4f6 !important;
}

.gjs-toolbar {
  background-color: #6366f1 !important;
}

.gjs-toolbar .gjs-toolbar-item {
  color: white !important;
}

.gjs-block {
  min-height: 50px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background-color: white;
}

.gjs-block:hover {
  border-color: #6366f1;
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.1);
}
```

## 🎨 Features Available

### Visual Editor Features:
- ✅ **Drag & Drop Components**: Text, images, buttons, columns, dividers
- ✅ **Style Manager**: Fonts, colors, sizes, spacing, borders
- ✅ **Device Preview**: Desktop and mobile views
- ✅ **Code Editor**: Toggle between visual and HTML/CSS code
- ✅ **Variable Blocks**: Insert variables as draggable blocks
- ✅ **Responsive Design**: Automatic mobile-friendly layouts
- ✅ **Image Upload**: Add and customize images
- ✅ **Pre-built Templates**: Newsletter templates included
- ✅ **Undo/Redo**: Full history management
- ✅ **Export Clean HTML**: Production-ready email HTML

### Variable Support:
All your existing variables are automatically available:
- `{{companyName}}`, `{{contactName}}`, `{{email}}`
- `{{signUpLink}}`, `{{featuresLink}}`, `{{pricingLink}}`
- `{{signature}}`, `{{ourWebsite}}`, etc.

## 📱 User Experience Flow

1. **User opens workflow step editor**
2. **Sees two mode options**: Simple (textarea) or Visual (GrapeJS)
3. **Clicks "Visual" mode**
4. **Clicks "Open Visual Editor" button**
5. **Full-screen modal opens with GrapeJS**
6. **User designs email with drag-and-drop**
7. **Preview on desktop/mobile**
8. **Save & Close** → HTML saved to workflow step

## 🐛 Troubleshooting

### Issue: CSS Import Errors

**Solution:** Add to `next.config.js`:

```js
module.exports = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader'],
    });
    return config;
  },
};
```

### Issue: "window is not defined" Error

**Solution:** The editor uses lazy loading and Suspense to avoid SSR issues. Make sure you're using the `EnhancedEmailEditor` wrapper, not direct GrapeJS import.

### Issue: Editor Not Loading

**Solution:** Check browser console for errors. Ensure all dependencies are installed:

```bash
npm list grapesjs grapesjs-preset-newsletter
```

## 🎯 Testing

### Test Visual Editor:
1. Go to Workflows page
2. Click on any workflow
3. Edit a workflow step
4. Toggle to "Visual" mode
5. Click "Open Visual Editor"
6. Try drag-and-drop components
7. Test desktop/mobile preview
8. Save and verify HTML is saved

### Test Variables:
1. Open visual editor
2. Drag a "Text" component
3. Type or paste: `{{companyName}}`
4. Save and check the output HTML contains the variable

## 📊 Comparison: Before vs After

| Feature | Before (Simple) | After (GrapeJS) |
|---------|----------------|-----------------|
| Editor Type | Textarea | Visual + Code |
| Formatting | Plain text | Rich HTML/CSS |
| Fonts | System default | Custom fonts |
| Colors | No control | Full color picker |
| Layout | Linear | Columns, tables, flex |
| Preview | None | Desktop + Mobile |
| Images | Text URLs only | Upload + embed |
| Responsive | Manual | Automatic |
| Learning Curve | Easy | Medium |
| Output Quality | Basic | Professional |

## 🔄 Migration Path

### Phase 1: Install & Test (Now)
1. Install dependencies
2. Test on development environment
3. Verify existing emails still work

### Phase 2: Gradual Rollout
1. Enable for new workflows only
2. Keep simple editor as default
3. Let users opt-in to visual editor

### Phase 3: Full Adoption
1. Make visual editor default
2. Keep simple editor for quick edits
3. Train users on new features

## 💡 Pro Tips

1. **Start with Templates**: GrapeJS includes pre-built email templates
2. **Use Components**: Reusable blocks save time
3. **Mobile First**: Always test mobile view before saving
4. **Variable Blocks**: Create custom blocks for frequently used variables
5. **Export Templates**: Save successful designs as templates

## 📞 Support

If you encounter issues:
1. Check GrapeJS documentation: https://grapesjs.com/docs/
2. Newsletter preset docs: https://github.com/artf/grapesjs-preset-newsletter
3. Community forum: https://github.com/GrapesJS/grapesjs/discussions

## ✅ Next Steps

After installation:
1. Test the editor with sample email
2. Create 2-3 email templates
3. Train team on new features
4. Gather feedback
5. Iterate and improve

---

**Created:** December 2, 2025  
**Status:** Ready for implementation  
**Estimated Setup Time:** 15-30 minutes
