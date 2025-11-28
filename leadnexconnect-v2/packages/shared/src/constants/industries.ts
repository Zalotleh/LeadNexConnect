/**
 * Shared industry constants for lead generation and campaigns
 * These match the Google Places API search terms for optimal results
 */

export interface IndustryOption {
  value: string;
  label: string;
  category: string;
  googlePlacesKeyword?: string; // Optional: specific Google Places search term
}

export const INDUSTRY_CATEGORIES = {
  HOSPITALITY: 'Hospitality & Food',
  HEALTHCARE: 'Healthcare & Wellness',
  PROFESSIONAL: 'Professional Services',
  FITNESS: 'Fitness & Beauty',
  RETAIL: 'Retail & Services',
  TECHNOLOGY: 'Technology & Finance',
  OTHER: 'Other Industries',
};

export const INDUSTRIES: IndustryOption[] = [
  // Hospitality & Food
  { value: 'restaurant', label: 'Restaurant', category: INDUSTRY_CATEGORIES.HOSPITALITY, googlePlacesKeyword: 'restaurant' },
  { value: 'hotel', label: 'Hotel', category: INDUSTRY_CATEGORIES.HOSPITALITY, googlePlacesKeyword: 'hotel' },
  { value: 'cafe', label: 'Cafe / Coffee Shop', category: INDUSTRY_CATEGORIES.HOSPITALITY, googlePlacesKeyword: 'cafe' },
  { value: 'bar', label: 'Bar / Pub', category: INDUSTRY_CATEGORIES.HOSPITALITY, googlePlacesKeyword: 'bar' },
  { value: 'bakery', label: 'Bakery', category: INDUSTRY_CATEGORIES.HOSPITALITY, googlePlacesKeyword: 'bakery' },
  { value: 'catering', label: 'Catering', category: INDUSTRY_CATEGORIES.HOSPITALITY, googlePlacesKeyword: 'catering service' },
  
  // Healthcare & Wellness
  { value: 'clinic', label: 'Medical Clinic', category: INDUSTRY_CATEGORIES.HEALTHCARE, googlePlacesKeyword: 'medical clinic' },
  { value: 'dental', label: 'Dental Clinic', category: INDUSTRY_CATEGORIES.HEALTHCARE, googlePlacesKeyword: 'dental clinic' },
  { value: 'pharmacy', label: 'Pharmacy', category: INDUSTRY_CATEGORIES.HEALTHCARE, googlePlacesKeyword: 'pharmacy' },
  { value: 'veterinary', label: 'Veterinary Clinic', category: INDUSTRY_CATEGORIES.HEALTHCARE, googlePlacesKeyword: 'veterinary clinic' },
  { value: 'hospital', label: 'Hospital', category: INDUSTRY_CATEGORIES.HEALTHCARE, googlePlacesKeyword: 'hospital' },
  { value: 'medical_spa', label: 'Medical Spa', category: INDUSTRY_CATEGORIES.HEALTHCARE, googlePlacesKeyword: 'medical spa' },
  
  // Professional Services
  { value: 'legal', label: 'Law Firm / Legal Services', category: INDUSTRY_CATEGORIES.PROFESSIONAL, googlePlacesKeyword: 'law firm' },
  { value: 'accounting', label: 'Accounting / CPA', category: INDUSTRY_CATEGORIES.PROFESSIONAL, googlePlacesKeyword: 'accounting firm' },
  { value: 'consulting', label: 'Consulting', category: INDUSTRY_CATEGORIES.PROFESSIONAL, googlePlacesKeyword: 'consulting' },
  { value: 'marketing', label: 'Marketing Agency', category: INDUSTRY_CATEGORIES.PROFESSIONAL, googlePlacesKeyword: 'marketing agency' },
  { value: 'real_estate', label: 'Real Estate', category: INDUSTRY_CATEGORIES.PROFESSIONAL, googlePlacesKeyword: 'real estate agency' },
  { value: 'insurance', label: 'Insurance Agency', category: INDUSTRY_CATEGORIES.PROFESSIONAL, googlePlacesKeyword: 'insurance agency' },
  { value: 'tours', label: 'Tours & Travel', category: INDUSTRY_CATEGORIES.PROFESSIONAL, googlePlacesKeyword: 'tour operator' },
  { value: 'education', label: 'Education / Training', category: INDUSTRY_CATEGORIES.PROFESSIONAL, googlePlacesKeyword: 'education center' },
  
  // Fitness & Beauty
  { value: 'fitness', label: 'Gym / Fitness Center', category: INDUSTRY_CATEGORIES.FITNESS, googlePlacesKeyword: 'gym' },
  { value: 'yoga', label: 'Yoga Studio', category: INDUSTRY_CATEGORIES.FITNESS, googlePlacesKeyword: 'yoga studio' },
  { value: 'spa', label: 'Spa / Wellness Center', category: INDUSTRY_CATEGORIES.FITNESS, googlePlacesKeyword: 'spa' },
  { value: 'beauty', label: 'Beauty Salon', category: INDUSTRY_CATEGORIES.FITNESS, googlePlacesKeyword: 'beauty salon' },
  { value: 'barbershop', label: 'Barbershop', category: INDUSTRY_CATEGORIES.FITNESS, googlePlacesKeyword: 'barbershop' },
  { value: 'nail_salon', label: 'Nail Salon', category: INDUSTRY_CATEGORIES.FITNESS, googlePlacesKeyword: 'nail salon' },
  { value: 'massage', label: 'Massage Therapy', category: INDUSTRY_CATEGORIES.FITNESS, googlePlacesKeyword: 'massage' },
  
  // Retail & Services
  { value: 'retail', label: 'Retail Store', category: INDUSTRY_CATEGORIES.RETAIL, googlePlacesKeyword: 'retail store' },
  { value: 'automotive', label: 'Auto Repair / Service', category: INDUSTRY_CATEGORIES.RETAIL, googlePlacesKeyword: 'auto repair' },
  { value: 'car_wash', label: 'Car Wash / Detailing', category: INDUSTRY_CATEGORIES.RETAIL, googlePlacesKeyword: 'car wash' },
  { value: 'repair', label: 'Repair Services', category: INDUSTRY_CATEGORIES.RETAIL, googlePlacesKeyword: 'repair service' },
  { value: 'laundry', label: 'Laundry / Dry Cleaning', category: INDUSTRY_CATEGORIES.RETAIL, googlePlacesKeyword: 'laundry' },
  { value: 'pet_services', label: 'Pet Services / Grooming', category: INDUSTRY_CATEGORIES.RETAIL, googlePlacesKeyword: 'pet grooming' },
  { value: 'cleaning', label: 'Cleaning Services', category: INDUSTRY_CATEGORIES.RETAIL, googlePlacesKeyword: 'cleaning service' },
  { value: 'storage', label: 'Storage Facility', category: INDUSTRY_CATEGORIES.RETAIL, googlePlacesKeyword: 'storage facility' },
  
  // Technology & Finance
  { value: 'technology', label: 'Technology / IT Services', category: INDUSTRY_CATEGORIES.TECHNOLOGY, googlePlacesKeyword: 'technology company' },
  { value: 'software', label: 'Software Company', category: INDUSTRY_CATEGORIES.TECHNOLOGY, googlePlacesKeyword: 'software company' },
  { value: 'finance', label: 'Financial Services', category: INDUSTRY_CATEGORIES.TECHNOLOGY, googlePlacesKeyword: 'financial services' },
  { value: 'bank', label: 'Bank / Credit Union', category: INDUSTRY_CATEGORIES.TECHNOLOGY, googlePlacesKeyword: 'bank' },
  { value: 'construction', label: 'Construction', category: INDUSTRY_CATEGORIES.TECHNOLOGY, googlePlacesKeyword: 'construction company' },
  { value: 'manufacturing', label: 'Manufacturing', category: INDUSTRY_CATEGORIES.TECHNOLOGY, googlePlacesKeyword: 'manufacturing' },
  { value: 'logistics', label: 'Logistics / Transportation', category: INDUSTRY_CATEGORIES.TECHNOLOGY, googlePlacesKeyword: 'logistics' },
  
  // Other
  { value: 'event_venue', label: 'Event Venue', category: INDUSTRY_CATEGORIES.OTHER, googlePlacesKeyword: 'event venue' },
  { value: 'photography', label: 'Photography Studio', category: INDUSTRY_CATEGORIES.OTHER, googlePlacesKeyword: 'photography' },
  { value: 'florist', label: 'Florist', category: INDUSTRY_CATEGORIES.OTHER, googlePlacesKeyword: 'florist' },
  { value: 'other', label: 'Other', category: INDUSTRY_CATEGORIES.OTHER },
];

/**
 * Get industries grouped by category for UI display
 */
export const getIndustriesByCategory = (): Record<string, IndustryOption[]> => {
  const grouped: Record<string, IndustryOption[]> = {};
  
  INDUSTRIES.forEach(industry => {
    if (!grouped[industry.category]) {
      grouped[industry.category] = [];
    }
    grouped[industry.category].push(industry);
  });
  
  return grouped;
};

/**
 * Get Google Places search keyword for an industry value
 */
export const getGooglePlacesKeyword = (industryValue: string): string => {
  const industry = INDUSTRIES.find(ind => ind.value === industryValue);
  return industry?.googlePlacesKeyword || industry?.label || industryValue;
};

/**
 * Get industry label by value
 */
export const getIndustryLabel = (industryValue: string): string => {
  const industry = INDUSTRIES.find(ind => ind.value === industryValue);
  return industry?.label || industryValue;
};

/**
 * Legacy industry list for backward compatibility
 */
export const LEGACY_INDUSTRIES = INDUSTRIES.map(ind => ind.label);
