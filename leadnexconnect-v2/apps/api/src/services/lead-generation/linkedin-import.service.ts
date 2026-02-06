import { parse } from 'csv-parse/sync';
import { logger } from '../../utils/logger';
import type { Lead } from '@leadnex/shared';

interface LinkedInCSVRow {
  'First Name'?: string;
  'Last Name'?: string;
  'Company'?: string;
  'Title'?: string;
  'Email'?: string;
  'Phone'?: string;
  'Website'?: string;
  'LinkedIn Profile'?: string;
  'Location'?: string;
  'Industry'?: string;
  'Company Size'?: string;
}

export class LinkedInImportService {
  /**
   * Parse LinkedIn Sales Navigator CSV export
   */
  async importCSV(csvContent: string, industry: string): Promise<Lead[]> {
    try {
      logger.info('[LinkedInImport] Parsing CSV', {
        size: csvContent.length,
        industry,
      });

      const records: LinkedInCSVRow[] = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      logger.info('[LinkedInImport] Parsed CSV records', { count: records.length });

      const leads: Lead[] = records.map((row) => {
        const location = this.parseLocation(row.Location || '');

        const lead: Partial<Lead> = {
          companyName: row.Company || 'Unknown Company',
          website: row.Website,
          email: row.Email,
          phone: row.Phone,
          contactName: `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim(),
          jobTitle: row.Title,
          city: location.city,
          country: location.country,
          industry: row.Industry || industry,
          companySize: this.normalizeCompanySize(row['Company Size']),
          source: 'linkedin',
          qualityScore: 0,
          verificationStatus: 'unverified',
          status: 'new',
          followUpStage: 'initial',
          emailsSent: 0,
          emailsOpened: 0,
          emailsClicked: 0,
          linkedinUrl: row['LinkedIn Profile'],
          linkedinSalesNavData: row as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return lead as Lead;
      });

      logger.info('[LinkedInImport] Converted to leads', { count: leads.length });

      return leads;
    } catch (error: any) {
      logger.error('[LinkedInImport] Error importing CSV', {
        error: error.message,
      });
      throw new Error(`Failed to import LinkedIn CSV: ${error.message}`);
    }
  }

  private parseLocation(location: string): { city?: string; country?: string } {
    if (!location) return {};

    const parts = location.split(',').map(p => p.trim());
    
    if (parts.length >= 2) {
      return {
        city: parts[0],
        country: parts[parts.length - 1],
      };
    }

    return { country: location };
  }

  private normalizeCompanySize(size?: string): string {
    if (!size) return '1-10';

    const sizeMap: Record<string, string> = {
      '1-10': '1-10',
      '11-50': '11-50',
      '51-200': '51-200',
      '201-500': '201-500',
      '501-1000': '501-1000',
      '1001-5000': '1000+',
      '5001-10000': '1000+',
      '10001+': '1000+',
    };

    return sizeMap[size] || '1-10';
  }
}

export const linkedInImportService = new LinkedInImportService();
