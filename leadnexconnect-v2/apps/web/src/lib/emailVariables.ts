/**
 * Email Variable Management System
 * Centralized variable definitions and management
 */

export interface EmailVariable {
  key: string;
  label: string;
  value: string; // Template format: {{key}}
  category: 'lead' | 'company' | 'link' | 'custom';
  description?: string;
  defaultValue?: string;
  isEditable?: boolean;
}

/**
 * Singleton Email Variable Manager
 * Manages all email variables across the application
 */
export class EmailVariableManager {
  private static instance: EmailVariableManager;
  private variables: Map<string, EmailVariable> = new Map();
  private customVariables: Map<string, EmailVariable> = new Map();
  private isLoadingCustom: boolean = false;
  private customVariablesLoaded: boolean = false;

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
      {
        key: 'companyName',
        label: 'Company Name',
        value: '{{companyName}}',
        category: 'lead',
        description: 'Recipient company name',
        defaultValue: 'your company',
        isEditable: false,
      },
      {
        key: 'contactName',
        label: 'Contact Name',
        value: '{{contactName}}',
        category: 'lead',
        description: 'Recipient contact name',
        defaultValue: 'there',
        isEditable: false,
      },
      {
        key: 'email',
        label: 'Email',
        value: '{{email}}',
        category: 'lead',
        description: 'Recipient email address',
        defaultValue: '',
        isEditable: false,
      },
      {
        key: 'website',
        label: 'Website',
        value: '{{website}}',
        category: 'lead',
        description: 'Recipient website URL',
        defaultValue: '',
        isEditable: false,
      },
      {
        key: 'industry',
        label: 'Industry',
        value: '{{industry}}',
        category: 'lead',
        description: 'Recipient industry',
        defaultValue: '',
        isEditable: false,
      },
      {
        key: 'city',
        label: 'City',
        value: '{{city}}',
        category: 'lead',
        description: 'Recipient city',
        defaultValue: '',
        isEditable: false,
      },
      {
        key: 'country',
        label: 'Country',
        value: '{{country}}',
        category: 'lead',
        description: 'Recipient country',
        defaultValue: '',
        isEditable: false,
      },
      {
        key: 'jobTitle',
        label: 'Job Title',
        value: '{{jobTitle}}',
        category: 'lead',
        description: 'Recipient job title',
        defaultValue: '',
        isEditable: false,
      },
      {
        key: 'companySize',
        label: 'Company Size',
        value: '{{companySize}}',
        category: 'lead',
        description: 'Recipient company size',
        defaultValue: '',
        isEditable: false,
      },

      // Company Info
      {
        key: 'ourCompanyName',
        label: 'Our Company Name',
        value: '{{ourCompanyName}}',
        category: 'company',
        description: 'Your company name (BookNex)',
        defaultValue: 'BookNex Solutions',
        isEditable: true,
      },
      {
        key: 'ourEmail',
        label: 'Our Email',
        value: '{{ourEmail}}',
        category: 'company',
        description: 'Your support email',
        defaultValue: 'support@booknexsolutions.com',
        isEditable: true,
      },
      {
        key: 'ourWebsite',
        label: 'Our Website',
        value: '{{ourWebsite}}',
        category: 'company',
        description: 'Your website URL',
        defaultValue: 'https://www.booknexsolutions.com',
        isEditable: true,
      },

      // Links
      {
        key: 'signUpLink',
        label: 'Sign Up Link',
        value: '{{signUpLink}}',
        category: 'link',
        description: 'Link to signup page',
        defaultValue: 'https://booknexsolutions.com/sign-up/',
        isEditable: true,
      },
      {
        key: 'featuresLink',
        label: 'Features Link',
        value: '{{featuresLink}}',
        category: 'link',
        description: 'Link to features page',
        defaultValue: 'https://booknexsolutions.com/features/',
        isEditable: true,
      },
      {
        key: 'pricingLink',
        label: 'Pricing Link',
        value: '{{pricingLink}}',
        category: 'link',
        description: 'Link to pricing page',
        defaultValue: 'https://booknexsolutions.com/pricing/',
        isEditable: true,
      },
      {
        key: 'howToStartLink',
        label: 'How To Start Link',
        value: '{{howToStartLink}}',
        category: 'link',
        description: 'Link to getting started guide',
        defaultValue: 'https://booknexsolutions.com/how-to-start/',
        isEditable: true,
      },
      {
        key: 'integrationsLink',
        label: 'Integrations Link',
        value: '{{integrationsLink}}',
        category: 'link',
        description: 'Link to integrations page',
        defaultValue: 'https://booknexsolutions.com/integrations/',
        isEditable: true,
      },
      {
        key: 'demoLink',
        label: 'Demo Link',
        value: '{{demoLink}}',
        category: 'link',
        description: 'Link to book a demo',
        defaultValue: 'https://booknexsolutions.com/demo/',
        isEditable: true,
      },
      {
        key: 'websiteLink',
        label: 'Website Link',
        value: '{{websiteLink}}',
        category: 'link',
        description: 'Main website link',
        defaultValue: 'https://www.booknexsolutions.com',
        isEditable: true,
      },

      // Special
      {
        key: 'signature',
        label: 'Email Signature',
        value: '{{signature}}',
        category: 'company',
        description: 'Professional email signature with logo',
        defaultValue: '',
        isEditable: true,
      },
    ];

    defaults.forEach((v) => this.variables.set(v.key, v));
  }

  /**
   * Get all variables (default + custom)
   */
  getAllVariables(): EmailVariable[] {
    return [
      ...Array.from(this.variables.values()),
      ...Array.from(this.customVariables.values()),
    ];
  }

  /**
   * Load custom variables from API
   */
  async loadCustomVariables(): Promise<void> {
    if (this.isLoadingCustom) return;
    
    this.isLoadingCustom = true;
    try {
      const response = await fetch('/api/custom-variables?isActive=true');
      if (!response.ok) {
        throw new Error('Failed to load custom variables');
      }
      
      const customVars = await response.json();
      
      // Clear existing custom variables
      this.customVariables.clear();
      
      // Add loaded custom variables
      customVars.forEach((cv: any) => {
        const variable: EmailVariable = {
          key: cv.key,
          label: cv.label,
          value: cv.value,
          category: cv.category || 'custom',
          description: cv.description || undefined,
          defaultValue: cv.defaultValue || undefined,
          isEditable: true,
        };
        this.customVariables.set(cv.key, variable);
      });
      
      this.customVariablesLoaded = true;
      console.log(`[EmailVariableManager] Loaded ${customVars.length} custom variables`);
    } catch (error) {
      console.error('[EmailVariableManager] Failed to load custom variables:', error);
    } finally {
      this.isLoadingCustom = false;
    }
  }

  /**
   * Check if custom variables are loaded
   */
  areCustomVariablesLoaded(): boolean {
    return this.customVariablesLoaded;
  }

  /**
   * Reload custom variables (call after creating/updating/deleting)
   */
  async reloadCustomVariables(): Promise<void> {
    this.customVariablesLoaded = false;
    await this.loadCustomVariables();
  }

  /**
   * Get variables by category
   */
  getByCategory(category: EmailVariable['category']): EmailVariable[] {
    return this.getAllVariables().filter((v) => v.category === category);
  }

  /**
   * Get variable by key
   */
  getVariable(key: string): EmailVariable | undefined {
    return this.variables.get(key) || this.customVariables.get(key);
  }

  /**
   * Add custom variable
   */
  addCustomVariable(
    variable: Omit<EmailVariable, 'category' | 'value'> & { category?: 'custom' }
  ): void {
    const customVar: EmailVariable = {
      ...variable,
      category: 'custom',
      value: `{{${variable.key}}}`,
      isEditable: true,
    };
    this.customVariables.set(variable.key, customVar);
  }

  /**
   * Remove custom variable
   */
  removeCustomVariable(key: string): void {
    this.customVariables.delete(key);
  }

  /**
   * Update variable default value
   */
  updateVariable(key: string, updates: Partial<EmailVariable>): void {
    const variable = this.getVariable(key);
    if (variable && variable.isEditable) {
      const updated = { ...variable, ...updates };
      if (this.customVariables.has(key)) {
        this.customVariables.set(key, updated);
      } else if (this.variables.has(key)) {
        this.variables.set(key, updated);
      }
    }
  }

  /**
   * Export variables for backend sync
   */
  exportForBackend(): Record<string, string> {
    const result: Record<string, string> = {};
    this.getAllVariables().forEach((v) => {
      result[v.key] = v.defaultValue || '';
    });
    return result;
  }

  /**
   * Get variables grouped by category
   */
  getGroupedVariables(): Record<string, EmailVariable[]> {
    return {
      lead: this.getByCategory('lead'),
      company: this.getByCategory('company'),
      link: this.getByCategory('link'),
      custom: this.getByCategory('custom'),
    };
  }
}

// Export singleton instance
export const emailVariableManager = EmailVariableManager.getInstance();

// Convenience exports
export const getAllEmailVariables = () => emailVariableManager.getAllVariables();
export const getEmailVariablesByCategory = (category: EmailVariable['category']) =>
  emailVariableManager.getByCategory(category);
export const getGroupedEmailVariables = () => emailVariableManager.getGroupedVariables();
