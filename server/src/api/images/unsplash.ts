import { ImageProvider, StockImage } from './types';

export class UnsplashProvider implements ImageProvider {
  private accessKey: string;
  private baseUrl = 'https://api.unsplash.com';

  constructor(accessKey: string) {
    this.accessKey = accessKey;
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

      // Add content filter for safe search
      if (safeSearch) {
        params.append('content_filter', 'high');
      }

      const response = await fetch(`${this.baseUrl}/search/photos?${params}`, {
        headers: {
          'Authorization': `Client-ID ${this.accessKey}`,
          'User-Agent': 'FanClubZ/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.results?.map((photo: any): StockImage => ({
        url: photo.urls?.regular || photo.urls?.full,
        previewUrl: photo.urls?.thumb || photo.urls?.small,
        width: photo.width || 800,
        height: photo.height || 600,
        photographer: photo.user?.name,
        provider: 'unsplash' as const,
        sourceUrl: photo.links?.html
      })) || [];

    } catch (error) {
      console.error('Unsplash search error:', error);
      return [];
    }
  }
}
