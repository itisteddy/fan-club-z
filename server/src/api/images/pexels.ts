import { ImageProvider, StockImage } from './types';

export class PexelsProvider implements ImageProvider {
  private apiKey: string;
  private baseUrl = 'https://api.pexels.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, options: {
    orientation?: 'landscape' | 'portrait' | 'square';
    perPage?: number;
    safeSearch?: boolean;
  } = {}): Promise<StockImage[]> {
    const {
      orientation = 'landscape',
      perPage = 20,
      safeSearch = true
    } = options;

    try {
      const params = new URLSearchParams({
        query: query.trim(),
        orientation,
        per_page: perPage.toString(),
        page: '1'
      });

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: {
          'Authorization': this.apiKey,
          'User-Agent': 'FanClubZ/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
      }

      type PexelsPhoto = {
        src?: {
          large?: string;
          original?: string;
          small?: string;
          tiny?: string;
        };
        width?: number;
        height?: number;
        photographer?: string;
        url?: string;
      };

      type PexelsResponse = {
        photos?: PexelsPhoto[];
      };

      const data = (await response.json()) as PexelsResponse;
      
      return (data.photos ?? []).map((photo): StockImage => ({
        url: photo.src?.large || photo.src?.original || '',
        previewUrl: photo.src?.small || photo.src?.tiny || '',
        width: photo.width || 800,
        height: photo.height || 600,
        photographer: photo.photographer ?? 'Unknown',
        provider: 'pexels' as const,
        sourceUrl: photo.url || ''
      }));

    } catch (error) {
      console.error('Pexels search error:', error);
      return [];
    }
  }
}
