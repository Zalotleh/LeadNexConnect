import axios from 'axios';
import { db, apiUsage } from '@leadnex/database';
import { logger } from '../../utils/logger';
import type { Lead, LeadSource } from '@leadnex/shared';
import { getGooglePlacesKeyword } from '@leadnex/shared';
import { settingsService } from '../settings.service';

const GOOGLE_PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

/**
 * Keyword variants per industry — rotating through these across runs ensures
 * Google Places returns different result sets for the same location.
 */
const INDUSTRY_QUERY_VARIANTS: Record<string, string[]> = {
  hotel: ['hotels', 'luxury hotels', 'boutique hotels', 'resorts', 'bed and breakfast', 'inn', 'lodging'],
  restaurant: ['restaurants', 'fine dining', 'bistro', 'eatery', 'diner', 'cafe', 'brasserie'],
  spa: ['spa', 'day spa', 'wellness center', 'massage therapy', 'beauty spa', 'relaxation center'],
  gym: ['gym', 'fitness center', 'health club', 'CrossFit', 'personal training studio', 'pilates studio'],
  dental: ['dentist', 'dental clinic', 'dental office', 'cosmetic dentistry', 'orthodontist'],
  real_estate: ['real estate agency', 'property management', 'realtor', 'estate agent', 'realty'],
  law: ['law firm', 'attorney', 'legal services', 'solicitor', 'barrister'],
  accounting: ['accounting firm', 'accountant', 'CPA', 'bookkeeping', 'tax consultant'],
  tours: ['tour operator', 'travel agency', 'guided tours', 'excursion company', 'sightseeing tours'],
  massage: ['massage therapy', 'massage parlor', 'therapeutic massage', 'sports massage', 'deep tissue massage'],
  barbershop: ['barbershop', 'barber', 'hair salon', 'men grooming', 'haircut'],
  veterinary: ['veterinary clinic', 'animal hospital', 'vet', 'pet clinic', 'veterinarian'],
};

interface PlacesSearchParams {
  industry: string;
  country?: string;
  city?: string;
  maxResults?: number;
  /** 0-based index used to pick a keyword variant and page offset for this run */
  queryVariantIndex?: number;
}

export class GooglePlacesService {
  private async getApiKey(): Promise<string> {
    const apiKey = await settingsService.get('googlePlacesApiKey', process.env.GOOGLE_PLACES_API_KEY);
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY is not configured. Please set it in Settings or .env file');
    }
    return apiKey;
  }

  /**
   * Search for business leads using Google Places API.
   * Fetches up to 3 pages (60 results) per call using next_page_token.
   * Rotates keyword variants via queryVariantIndex to get fresh results across runs.
   */
  async searchLeads(params: PlacesSearchParams): Promise<Lead[]> {
    try {
      const apiKey = await this.getApiKey();

      const query = this.buildSearchQuery(params);
      const location = params.city 
        ? `${params.city}, ${params.country || ''}` 
        : params.country || 'United States';

      logger.info('[GooglePlaces] Search query', { query, location, queryVariantIndex: params.queryVariantIndex });

      // Step 1: Collect places across up to 3 pages (max 60 results)
      const allPlaceResults: any[] = [];
      let nextPageToken: string | undefined;
      let pagesFetched = 0;
      const maxPages = 3;
      const maxResults = params.maxResults || 50;

      do {
        // Google requires a 2-second delay before using a next_page_token
        if (nextPageToken) {
          await this.delay(2000);
        }

        const requestParams: Record<string, any> = { key: apiKey };
        if (nextPageToken) {
          requestParams.pagetoken = nextPageToken;
        } else {
          requestParams.query = `${query} in ${location}`;
        }

        const searchResponse = await axios.get(
          `${GOOGLE_PLACES_API_BASE}/textsearch/json`,
          { params: requestParams, timeout: 15000 }
        );

        const status = searchResponse.data.status;

        if (status === 'REQUEST_DENIED') {
          throw new Error(`Google Places API error: ${searchResponse.data.error_message || 'Invalid API key or API not enabled'}`);
        }

        if (status === 'INVALID_REQUEST' && nextPageToken) {
          // Token not ready yet — retry once more after extra delay
          await this.delay(2000);
          const retryResponse = await axios.get(
            `${GOOGLE_PLACES_API_BASE}/textsearch/json`,
            { params: requestParams, timeout: 15000 }
          );
          if (retryResponse.data.results) {
            allPlaceResults.push(...retryResponse.data.results);
            nextPageToken = retryResponse.data.next_page_token;
          } else {
            nextPageToken = undefined;
          }
          pagesFetched++;
          continue;
        }

        if (status === 'ZERO_RESULTS' || !searchResponse.data.results || searchResponse.data.results.length === 0) {
          if (pagesFetched === 0) {
            logger.warn('[GooglePlaces] No places found for query', { query, location });
            return [];
          }
          break;
        }

        allPlaceResults.push(...searchResponse.data.results);
        nextPageToken = searchResponse.data.next_page_token;
        pagesFetched++;

        logger.info(`[GooglePlaces] Page ${pagesFetched}: got ${searchResponse.data.results.length} results, hasNextPage=${!!nextPageToken}`);

      } while (nextPageToken && pagesFetched < maxPages && allPlaceResults.length < maxResults);

      const places = allPlaceResults.slice(0, maxResults);
      logger.info(`[GooglePlaces] Total places collected: ${places.length} across ${pagesFetched} page(s)`);

      // Step 2: Get details for each place
      const leads: Lead[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (const place of places) {
        try {
          const detailsResponse = await axios.get(
            `${GOOGLE_PLACES_API_BASE}/details/json`,
            {
              params: {
                place_id: place.place_id,
                fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,international_phone_number',
                key: apiKey,
              },
              timeout: 10000,
            }
          );

          if (detailsResponse.data.status !== 'OK') {
            logger.warn('[GooglePlaces] Failed to get place details', { 
              placeId: place.place_id, 
              status: detailsResponse.data.status 
            });
            errorCount++;
            continue;
          }

          const details = detailsResponse.data.result;

          const lead: Partial<Lead> = {
            companyName: details.name || place.name,
            website: details.website,
            phone: details.formatted_phone_number || details.international_phone_number,
            address: details.formatted_address || place.formatted_address,
            city: params.city || this.extractCity(details.formatted_address || place.formatted_address),
            country: params.country || 'United States',
            industry: params.industry,
            source: 'google_places' as LeadSource,
            qualityScore: 0,
            verificationStatus: 'unverified',
            status: 'new',
            followUpStage: 'initial',
            emailsSent: 0,
            emailsOpened: 0,
            emailsClicked: 0,
            customFields: {
              googleRating: details.rating,
              googleReviewCount: details.user_ratings_total,
              placeId: place.place_id,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          leads.push(lead as Lead);
          successCount++;

          // Small delay to avoid rate limits (100ms between requests)
          await this.delay(100);
        } catch (error: any) {
          logger.error('[GooglePlaces] Error fetching place details', {
            placeId: place.place_id,
            error: error.message,
          });
          errorCount++;
        }
      }

      logger.info('[GooglePlaces] Successfully fetched leads', {
        totalPlaces: places.length,
        successCount,
        errorCount,
        industry: params.industry,
        location,
      });

      // Track API usage
      await this.trackApiUsage(successCount);

      return leads;
    } catch (error: any) {
      logger.error('[GooglePlaces] Error searching leads', {
        error: error.message,
        params,
      });
      throw new Error(`Google Places API error: ${error.message}`);
    }
  }

  /** Returns how many keyword variants exist for the given industry */
  getVariantCount(industry: string): number {
    const variants = INDUSTRY_QUERY_VARIANTS[industry?.toLowerCase()];
    return variants ? variants.length : 1;
  }

  private buildSearchQuery(params: PlacesSearchParams): string {
    const industryKey = params.industry?.toLowerCase();
    const variants = INDUSTRY_QUERY_VARIANTS[industryKey];

    if (variants && variants.length > 0) {
      const variantIndex = (params.queryVariantIndex ?? 0) % variants.length;
      const chosen = variants[variantIndex];
      logger.info(`[GooglePlaces] Using keyword variant [${variantIndex}/${variants.length - 1}]: "${chosen}"`);
      return chosen;
    }

    // Fallback: shared industry mapping for industries not in the variants table
    return getGooglePlacesKeyword(params.industry);
  }

  private extractCity(address: string): string {
    const parts = address.split(',');
    return parts.length > 1 ? parts[parts.length - 3]?.trim() || '' : '';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Track API usage in database
   */
  private async trackApiUsage(leadsFetched: number): Promise<void> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      await db.insert(apiUsage).values({
        service: 'google_places',
        requestsMade: leadsFetched,
        periodStart: startOfDay,
        periodEnd: endOfDay,
        createdAt: new Date(),
      });
    } catch (error: any) {
      logger.error('[GooglePlaces] Error tracking API usage', {
        error: error.message,
      });
    }
  }
}

export const googlePlacesService = new GooglePlacesService();
