export const API_LIMITS = {
  APOLLO: {
    FREE_TIER: 100,
    PERIOD: 'monthly',
  },
  PEOPLE_DATA_LABS: {
    FREE_TIER: 100,
    PERIOD: 'monthly',
  },
  HUNTER: {
    FREE_TIER: 50,
    PERIOD: 'monthly',
  },
  GOOGLE_PLACES: {
    FREE_CREDIT: 200, // USD
    APPROX_REQUESTS: 40000,
    PERIOD: 'monthly',
  },
} as const;

export const EMAIL_LIMITS = {
  DAILY_LIMIT: 50,
  HOURLY_LIMIT: 20,
  FOLLOW_UP_1_DELAY_DAYS: 3,
  FOLLOW_UP_2_DELAY_DAYS: 5,
} as const;

export const LEAD_SCORING = {
  EMAIL_VERIFIED: 40,
  WEBSITE_EXISTS: 15,
  PHONE_NUMBER: 10,
  LINKEDIN_PROFILE: 15,
  COMPANY_SIZE_MATCH: 20,
} as const;

export const SCRAPING_SOURCES = {
  YELP: 'yelp',
  YELLOW_PAGES: 'yellowpages',
  TRIPADVISOR: 'tripadvisor',
} as const;

export const FOLLOW_UP_STAGES = {
  INITIAL: 'initial',
  FOLLOW_UP_1: 'follow_up_1',
  FOLLOW_UP_2: 'follow_up_2',
} as const;

export const INDUSTRY_KEYWORDS = {
  spa: ['spa', 'massage', 'wellness', 'beauty salon', 'nail salon'],
  clinic: ['clinic', 'medical', 'healthcare', 'doctor', 'dentist'],
  tours: ['tour', 'travel', 'excursion', 'sightseeing', 'tourism'],
  education: ['tutor', 'education', 'training', 'courses', 'lessons'],
  fitness: ['gym', 'fitness', 'yoga', 'pilates', 'personal training'],
  repair: ['repair', 'service', 'maintenance', 'fix'],
  consultancy: ['consultant', 'consulting', 'advisory', 'coaching'],
  beauty: ['beauty', 'hairdresser', 'barber', 'makeup'],
  activities: ['activities', 'events', 'entertainment', 'recreation'],
} as const;

export const ERROR_CODES = {
  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // API Limits
  API_LIMIT_REACHED: 'API_LIMIT_REACHED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Lead Generation
  NO_LEADS_FOUND: 'NO_LEADS_FOUND',
  ENRICHMENT_FAILED: 'ENRICHMENT_FAILED',
  DUPLICATE_LEAD: 'DUPLICATE_LEAD',
  
  // Campaign
  CAMPAIGN_INACTIVE: 'CAMPAIGN_INACTIVE',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  
  // Email
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  INVALID_EMAIL: 'INVALID_EMAIL',
} as const;

export const SUCCESS_MESSAGES = {
  LEAD_CREATED: 'Lead created successfully',
  LEADS_IMPORTED: 'Leads imported successfully',
  CAMPAIGN_CREATED: 'Campaign created successfully',
  CAMPAIGN_STARTED: 'Campaign started successfully',
  CAMPAIGN_PAUSED: 'Campaign paused successfully',
  EMAIL_SENT: 'Email sent successfully',
  SETTINGS_UPDATED: 'Settings updated successfully',
} as const;
