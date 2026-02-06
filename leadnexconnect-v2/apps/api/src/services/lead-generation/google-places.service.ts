import axios from 'axios';
import { db, apiUsage } from '@leadnex/database';
import { logger } from '../../utils/logger';
import type { Lead, LeadSource } from '@leadnex/shared';
import { getGooglePlacesKeyword } from '@leadnex/shared';
import { settingsService } from '../settings.service';

const GOOGLE_PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

interface PlacesSearchParams {
  industry: string;
  country?: string;
  city?: string;
  maxResults?: number;
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
   * Search for business leads using Google Places API
   */
  async searchLeads(params: PlacesSearchParams): Promise<Lead[]> {
    try {
      const apiKey = await this.getApiKey();
      logger.info('[GooglePlaces] Searching for leads', { params });

      const query = this.buildSearchQuery(params);
      const location = params.city 
        ? `${params.city}, ${params.country || ''}` 
        : params.country || 'United States';

      logger.info('[GooglePlaces] Search query', { query, location });

      // Step 1: Text search to find places
      const searchResponse = await axios.get(
        `${GOOGLE_PLACES_API_BASE}/textsearch/json`,
        {
          params: {
            query: `${query} in ${location}`,
            key: apiKey,
          },
          timeout: 15000,
        }
      );

      // Check for API errors
      if (searchResponse.data.status === 'REQUEST_DENIED') {
        throw new Error(`Google Places API error: ${searchResponse.data.error_message || 'Invalid API key or API not enabled'}`);
      }

      if (searchResponse.data.status === 'ZERO_RESULTS' || !searchResponse.data.results || searchResponse.data.results.length === 0) {
        logger.warn('[GooglePlaces] No places found for query', { query, location });
        return [];
      }

      const places = searchResponse.data.results.slice(0, params.maxResults || 50);
      logger.info(`[GooglePlaces] Found ${places.length} places, fetching details...`);

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

  private buildSearchQuery(params: PlacesSearchParams): string {
    // Use the shared industry mapping for consistent Google Places searches
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
