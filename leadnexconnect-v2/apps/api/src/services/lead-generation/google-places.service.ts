import axios from 'axios';
import { db, apiUsage } from '@leadnex/database';
import { logger } from '../../utils/logger';
import type { Lead, LeadSource } from '@leadnex/shared';
import { settingsService } from '../settings.service';

const GOOGLE_PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

interface PlacesSearchParams {
  industry: string;
  country?: string;
  city?: string;
  maxResults?: number;
}

export class GooglePlacesService {
  private async getApiKey(): Promise<string | null> {
    return await settingsService.get('googlePlacesApiKey', process.env.GOOGLE_PLACES_API_KEY || '');
  }

  /**
   * Search for business leads using Google Places API
   */
  async searchLeads(params: PlacesSearchParams): Promise<Lead[]> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        logger.warn('[GooglePlaces] API key not configured');
        return [];
      }

      logger.info('[GooglePlaces] Searching for leads', { params });

      const query = this.buildSearchQuery(params);
      const location = params.city 
        ? `${params.city}, ${params.country || ''}` 
        : params.country || '';

      // Step 1: Text search to find places
      const searchResponse = await axios.get(
        `${GOOGLE_PLACES_API_BASE}/textsearch/json`,
        {
          params: {
            query: `${query} in ${location}`,
            key: apiKey,
          },
        }
      );

      if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
        logger.warn('[GooglePlaces] No places found');
        return [];
      }

      const places = searchResponse.data.results.slice(0, params.maxResults || 50);

      // Step 2: Get details for each place
      const leads: Lead[] = [];

      for (const place of places) {
        try {
          const detailsResponse = await axios.get(
            `${GOOGLE_PLACES_API_BASE}/details/json`,
            {
              params: {
                place_id: place.place_id,
                fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total',
                key: apiKey,
              },
            }
          );

          const details = detailsResponse.data.result;

          const lead: Partial<Lead> = {
            companyName: details.name || place.name,
            website: details.website,
            phone: details.formatted_phone_number,
            address: details.formatted_address || place.formatted_address,
            city: params.city || this.extractCity(details.formatted_address),
            country: params.country,
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

          // Small delay to avoid rate limits
          await this.delay(100);
        } catch (error: any) {
          logger.error('[GooglePlaces] Error fetching place details', {
            placeId: place.place_id,
            error: error.message,
          });
        }
      }

      logger.info('[GooglePlaces] Successfully fetched leads', {
        count: leads.length,
        industry: params.industry,
      });

      // Track API usage
      await this.trackApiUsage(leads.length);

      return leads;
    } catch (error: any) {
      logger.error('[GooglePlaces] Error searching leads', {
        error: error.message,
      });
      throw error;
    }
  }

  private buildSearchQuery(params: PlacesSearchParams): string {
    const industryKeywords: Record<string, string[]> = {
      spa: ['spa', 'massage', 'wellness center'],
      clinic: ['medical clinic', 'healthcare', 'doctor'],
      tours: ['tour operator', 'tours', 'travel agency'],
      education: ['tutoring', 'education center', 'training'],
      fitness: ['gym', 'fitness center', 'yoga studio'],
      repair: ['repair service', 'maintenance'],
      consultancy: ['consultant', 'consulting firm'],
      beauty: ['beauty salon', 'hair salon', 'barber'],
      activities: ['activity center', 'entertainment'],
    };

    const keywords = industryKeywords[params.industry] || [params.industry];
    return keywords[0];
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
