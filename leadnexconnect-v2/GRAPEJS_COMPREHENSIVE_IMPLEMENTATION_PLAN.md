# GrapeJS Email Editor - Comprehensive Implementation Plan

## 🎯 Requirements Analysis

Based on your workflow, the implementation must support:

### ✅ Current Features to Preserve:
1. **AI Email Generation** - Generate subject + body using Claude API
2. **Variable System** - Dynamic {{companyName}}, {{signUpLink}}, etc.
3. **Workflow Integration** - Multi-step email sequences with delays
4. **Edit Anywhere** - Edit emails in workflows, campaigns, email queue
5. **Variable Management** - Add new custom variables to the system
6. **Preview & Testing** - Preview emails before sending

### 🔄 Integration Points:

#### 1. **Workflow Email Editor** (`apps/web/src/pages/workflows/[id].tsx`)
- Edit workflow step emails (subject + body)
- Support both simple text and visual HTML editing
- Preserve variable functionality
- AI generation integration

#### 2. **Campaign Creation** (`apps/web/src/pages/leads.tsx`, `apps/web/src/components/leads/CreateCampaignModal.tsx`)
- Create campaigns with custom emails OR workflows
- AI content generation button
- Variable insertion

#### 3. **Variable Replacement** (`apps/api/src/controllers/campaigns.controller.ts`)
- Backend replaces {{variables}} with actual data
- Signature HTML with logo
- Link generation

#### 4. **Settings/Variables Management** (To be created)
- Define custom variables
- Manage signature template
- Configure link URLs

---

## 📋 Implementation Strategy

### Phase 1: Core GrapeJS Integration (Non-Breaking)

#### Step 1.1: Create Variable Management System

**New File:** `apps/web/src/lib/emailVariables.ts`

```typescript
export interface EmailVariable {
  key: string;
  label: string;
  value: string; // Template format: {{key}}
  category: 'lead' | 'company' | 'link' | 'custom';
  description?: string;
  defaultValue?: string;
  isEditable?: boolean; // Can users edit this variable?
}

export interface VariableDefinition {
  variables: EmailVariable[];
  addCustomVariable: (variable: Omit<EmailVariable, 'category'> & { category?: 'custom' }) => void;
  removeCustomVariable: (key: string) => void;
  getVariablesByCategory: (category: string) => EmailVariable[];
}

// Centralized variable management
export class EmailVariableManager {
  private static instance: EmailVariableManager;
  private variables: Map<string, EmailVariable> = new Map();
  private customVariables: Map<string, EmailVariable> = new Map();

  private constructor() {
    this.initializeDefaultVariables();
  }

  static getInstance(): EmailVariableManager {
    if (!EmailVariableManager.instance) {
      EmailVariableManager.instance = new EmailVariableManager();
    }
    return EmailVariableManager.instance;
  }

  private initializeDefaultVariables() {
    const defaults: EmailVariable[] = [
      // Lead Variables
      { key: 'companyName', label: 'Company Name', value: '{{companyName}}', category: 'lead', description: 'Recipient company name', defaultValue: 'your company', isEditable: false },
      { key: 'contactName', label: 'Contact Name', value: '{{contactName}}', category: 'lead', description: 'Recipient contact name', defaultValue: 'there', isEditable: false },
      { key: 'email', label: 'Email', value: '{{email}}', category: 'lead', description: 'Recipient email address', defaultValue: '', isEditable: false },
      { key: 'website', label: 'Website', value: '{{website}}', category: 'lead', description: 'Recipient website URL', defaultValue: '', isEditable: false },
      { key: 'industry', label: 'Industry', value: '{{industry}}', category: 'lead', description: 'Recipient industry', defaultValue: '', isEditable: false },
      { key: 'city', label: 'City', value: '{{city}}', category: 'lead', description: 'Recipient city', defaultValue: '', isEditable: false },
      { key: 'country', label: 'Country', value: '{{country}}', category: 'lead', description: 'Recipient country', defaultValue: '', isEditable: false },
      { key: 'jobTitle', label: 'Job Title', value: '{{jobTitle}}', category: 'lead', description: 'Recipient job title', defaultValue: '', isEditable: false },
      { key: 'companySize', label: 'Company Size', value: '{{companySize}}', category: 'lead', description: 'Recipient company size', defaultValue: '', isEditable: false },
      
      // Company Info
      { key: 'ourCompanyName', label: 'Our Company Name', value: '{{ourCompanyName}}', category: 'company', description: 'Your company name (BookNex)', defaultValue: 'BookNex Solutions', isEditable: true },
      { key: 'ourEmail', label: 'Our Email', value: '{{ourEmail}}', category: 'company', description: 'Your support email', defaultValue: 'support@booknexsolutions.com', isEditable: true },
      { key: 'ourWebsite', label: 'Our Website', value: '{{ourWebsite}}', category: 'company', description: 'Your website URL', defaultValue: 'https://www.booknexsolutions.com', isEditable: true },
      
      // Links
      { key: 'signUpLink', label: 'Sign Up Link', value: '{{signUpLink}}', category: 'link', description: 'Link to signup page', defaultValue: 'https://booknexsolutions.com/sign-up/', isEditable: true },
      { key: 'featuresLink', label: 'Features Link', value: '{{featuresLink}}', category: 'link', description: 'Link to features page', defaultValue: 'https://booknexsolutions.com/features/', isEditable: true },
      { key: 'pricingLink', label: 'Pricing Link', value: '{{pricingLink}}', category: 'link', description: 'Link to pricing page', defaultValue: 'https://booknexsolutions.com/pricing/', isEditable: true },
      { key: 'howToStartLink', label: 'How To Start Link', value: '{{howToStartLink}}', category: 'link', description: 'Link to getting started guide', defaultValue: 'https://booknexsolutions.com/how-to-start/', isEditable: true },
      { key: 'integrationsLink', label: 'Integrations Link', value: '{{integrationsLink}}', category: 'link', description: 'Link to integrations page', defaultValue: 'https://booknexsolutions.com/integrations/', isEditable: true },
      { key: 'demoLink', label: 'Demo Link', value: '{{demoLink}}', category: 'link', description: 'Link to book a demo', defaultValue: 'https://booknexsolutions.com/demo/', isEditable: true },
      { key: 'websiteLink', label: 'Website Link', value: '{{websiteLink}}', category: 'link', description: 'Main website link', defaultValue: 'https://www.booknexsolutions.com', isEditable: true },
      
      // Special
      { key: 'signature', label: 'Email Signature', value: '{{signature}}', category: 'company', description: 'Professional email signature with logo', defaultValue: '', isEditable: true },
    ];

    defaults.forEach(v => this.variables.set(v.key, v));
  }

  // Get all variables
  getAllVariables(): EmailVariable[] {
    return [
      ...Array.from(this.variables.values()),
      ...Array.from(this.customVariables.values())
    ];
  }

  // Get variables by category
  getByCategory(category: string): EmailVariable[] {
    return this.getAllVariables().filter(v => v.category === category);
  }

  // Add custom variable
  addCustomVariable(variable: Omit<EmailVariable, 'category'> & { category?: 'custom' }): void {
    const customVar: EmailVariable = {
      ...variable,
      category: 'custom',
      value: `{{${variable.key}}}`,
      isEditable: true
    };
    this.customVariables.set(variable.key, customVar);
  }

  // Remove custom variable
  removeCustomVariable(key: string): void {
    this.customVariables.delete(key);
  }

  // Get variable by key
  getVariable(key: string): EmailVariable | undefined {
    return this.variables.get(key) || this.customVariables.get(key);
  }

  // Export for backend sync
  exportForBackend(): Record<string, string> {
    const result: Record<string, string> = {};
    this.getAllVariables().forEach(v => {
      result[v.key] = v.defaultValue || '';
    });
    return result;
  }
}

// Export singleton instance
export const emailVariableManager = EmailVariableManager.getInstance();

// Convenience export
export const getAllEmailVariables = () => emailVariableManager.getAllVariables();
```

#### Step 1.2: Enhanced GrapeJS Editor with Variable Support

**Update File:** `apps/web/src/components/EmailEditor/GrapeJSEmailEditor.tsx`

Key enhancements:
- Dynamic variable blocks from `emailVariableManager`
- Custom block for each variable category
- Toolbar with variable insertion buttons
- Preview mode with sample data replacement
- Export clean HTML compatible with backend

#### Step 1.3: Settings Page for Variable Management

**New File:** `apps/web/src/pages/settings/variables.tsx`

```typescript
// Page to manage custom variables and edit default values
// - List all variables by category
// - Add/edit/delete custom variables
// - Edit link URLs
// - Edit signature template
// - Preview signature rendering
```

---

### Phase 2: AI Integration with Visual Editor

#### Step 2.1: AI-Generated Content to Visual Editor

**Flow:**
1. User clicks "Generate with AI" in workflow or campaign
2. AI generates subject + body (plain text/simple HTML)
3. Content loaded into GrapeJS editor
4. User can further customize visually
5. Save to workflow/campaign

**Implementation:**
- Extend `handleGenerateAIContent()` to support visual editor
- Parse AI response and structure as GrapeJS components
- Preserve variables in AI-generated content

#### Step 2.2: AI Prompt Enhancement for HTML Output

**Update:** `apps/api/src/services/outreach/email-generator.service.ts`

Add option to generate HTML-formatted emails:

```typescript
async generateWithAI(params: GenerateEmailParams & {
  outputFormat?: 'text' | 'html'; // NEW
  includeStructure?: boolean; // Generate table-based layout
}): Promise<{
  subject: string;
  bodyText: string;
  bodyHtml: string; // NEW: HTML version for visual editor
}> {
  // ... existing code
  
  if (params.outputFormat === 'html') {
    // Request HTML formatted email from Claude
    // With proper table structure, inline CSS, etc.
  }
}
```

---

### Phase 3: Universal Edit Capability

#### Step 3.1: Email Preview & Edit Component

**New File:** `apps/web/src/components/EmailViewer.tsx`

```typescript
interface EmailViewerProps {
  subject: string;
  body: string;
  isHtml: boolean;
  onEdit?: () => void;
  editable?: boolean;
  sampleData?: Record<string, string>; // For preview with replaced variables
}

// Shows email with:
// - Subject line
// - Body (rendered HTML or plain text)
// - Variables highlighted
// - Edit button (opens visual editor modal)
// - Preview with sample data
```

#### Step 3.2: Edit Email Modal (Reusable)

**New File:** `apps/web/src/components/EmailEditModal.tsx`

```typescript
interface EmailEditModalProps {
  initialSubject: string;
  initialBody: string;
  onSave: (subject: string, body: string) => void;
  onClose: () => void;
  enableAIGeneration?: boolean;
  enableVisualEditor?: boolean;
}

// Modal that includes:
// - Subject input
// - Body editor (simple or visual toggle)
// - AI generation button
// - Save & Cancel buttons
```

#### Step 3.3: Integration Points

**Update these files to use EmailEditModal:**

1. **Workflow Step Editor** (`apps/web/src/pages/workflows/[id].tsx`)
   - Replace inline form with EmailEditModal
   - Support both simple and visual editing

2. **Campaign Email** (`apps/web/src/components/leads/CreateCampaignModal.tsx`)
   - Use EmailEditModal for email content

3. **Email Queue View** (if exists)
   - Add edit button to queued emails
   - Allow last-minute edits before sending

---

### Phase 4: Backend Variable System

#### Step 4.1: Database Schema for Custom Variables

**Add to:** `packages/database/src/schema/index.ts`

```typescript
export const customVariables = pgTable('custom_variables', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  label: varchar('label', { length: 255 }).notNull(),
  defaultValue: text('default_value'),
  description: text('description'),
  category: varchar('category', { length: 50 }).default('custom'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

#### Step 4.2: Variable Replacement Enhancement

**Update:** `apps/api/src/controllers/campaigns.controller.ts`

```typescript
private async replaceTemplateVariables(
  text: string, 
  lead: any,
  customVars?: Record<string, string> // NEW
): Promise<string> {
  // Load custom variables from database
  const customVariables = await db.select().from(customVariables).where(eq(customVariables.isActive, true));
  
  let result = text;
  
  // Replace default variables (existing code)
  result = this.replaceDefaultVariables(result, lead);
  
  // Replace custom variables
  customVariables.forEach(cv => {
    const regex = new RegExp(`\\{\\{${cv.key}\\}\\}`, 'g');
    result = result.replace(regex, cv.defaultValue || '');
  });
  
  // Override with provided custom values
  if (customVars) {
    Object.entries(customVars).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    });
  }
  
  return result;
}
```

---

## 🎯 Implementation Checklist

### Phase 1: Core Setup ✅
- [ ] Install GrapeJS packages
- [ ] Create `EmailVariableManager` class
- [ ] Update `GrapeJSEmailEditor` with variable blocks
- [ ] Create `EnhancedEmailEditor` wrapper
- [ ] Test simple text → visual editor conversion
- [ ] Test visual editor → HTML export

### Phase 2: Workflow Integration 🔄
- [ ] Update workflow step editor to use `EnhancedEmailEditor`
- [ ] Preserve existing variable insertion
- [ ] Test workflow email creation
- [ ] Test workflow email editing
- [ ] Verify emails are sent correctly

### Phase 3: Campaign Integration 🔄
- [ ] Update campaign modal to use `EnhancedEmailEditor`
- [ ] Connect AI generation to visual editor
- [ ] Test campaign creation with visual editor
- [ ] Test campaign execution

### Phase 4: AI Integration 🤖
- [ ] Update AI prompt to support HTML output
- [ ] Parse AI response into GrapeJS format
- [ ] Test AI-generated content in visual editor
- [ ] Preserve variables in AI output

### Phase 5: Variable Management 🎨
- [ ] Create settings page for variables
- [ ] Add custom variable CRUD
- [ ] Edit signature template
- [ ] Edit link URLs
- [ ] Sync with backend

### Phase 6: Backend Support 🔧
- [ ] Add database schema for custom variables
- [ ] Create API endpoints for variable management
- [ ] Update variable replacement logic
- [ ] Test custom variables in emails

### Phase 7: Universal Edit 📝
- [ ] Create `EmailViewer` component
- [ ] Create `EmailEditModal` component
- [ ] Add edit capability to workflow emails
- [ ] Add edit capability to campaign emails
- [ ] Add edit capability to queued emails (if applicable)

### Phase 8: Testing & Polish ✨
- [ ] Test all variable replacements
- [ ] Test responsive email templates
- [ ] Test across different email clients
- [ ] Add tooltips and help text
- [ ] Performance optimization
- [ ] Error handling

---

## 🚀 Migration Plan

### Week 1: Foundation
- Set up GrapeJS
- Create variable management system
- Basic visual editor working

### Week 2: Integration
- Integrate with workflows
- Integrate with campaigns
- AI generation support

### Week 3: Variables & Backend
- Custom variables system
- Settings page
- Backend API

### Week 4: Polish & Testing
- Universal edit capability
- Testing
- Bug fixes
- Documentation

---

## 📊 Testing Strategy

### Unit Tests:
- Variable replacement logic
- Email HTML generation
- AI content parsing

### Integration Tests:
- Workflow email creation → sending
- Campaign email creation → sending
- Variable replacement end-to-end

### Manual Tests:
- Create email with visual editor
- Insert all variable types
- Preview email
- Send test email
- Verify rendering in Gmail, Outlook, etc.

---

## 🎯 Success Criteria

✅ Users can create emails with visual editor  
✅ All existing variables work in visual editor  
✅ Users can add custom variables  
✅ AI-generated content works with visual editor  
✅ Emails can be edited anywhere they appear  
✅ Email rendering is consistent across clients  
✅ No breaking changes to existing workflows  
✅ Performance is acceptable (<2s editor load)  

---

## 💡 Future Enhancements

- Email template library (save reusable templates)
- A/B testing for email content
- Email analytics (open rates, click rates)
- Spam score checker
- Email preview in multiple clients
- Collaborative editing
- Version history
- Email scheduling from editor

---

## 📞 Support & Rollback Plan

### If Issues Arise:
1. Keep simple editor as fallback
2. Feature flag for visual editor
3. Gradual rollout (opt-in first)
4. Monitor error rates
5. Quick rollback capability

### Rollback Steps:
1. Disable visual editor feature flag
2. Revert to simple textarea editor
3. Investigate issues
4. Fix and re-deploy

---

**Created:** December 2, 2025  
**Status:** Ready for implementation  
**Estimated Timeline:** 4 weeks  
**Priority:** High  
**Risk Level:** Medium (with proper testing)
