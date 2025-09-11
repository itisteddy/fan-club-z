// Image generation service with feature flag support
// Integrates with Google Nano Banana APIs or other image generation services

interface ImageGenerationOptions {
  prompt: string;
  style?: 'realistic' | 'artistic' | 'minimal';
  size?: 'small' | 'medium' | 'large';
}

interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

class ImageGenerationService {
  private isEnabled: boolean;
  private apiKey?: string;
  private baseUrl?: string;

  constructor() {
    // Feature flag: Enable/disable image generation
    this.isEnabled = import.meta.env.VITE_IMAGE_GENERATION_ENABLED === 'true';
    this.apiKey = import.meta.env.VITE_IMAGE_GENERATION_API_KEY;
    this.baseUrl = import.meta.env.VITE_IMAGE_GENERATION_BASE_URL;
  }

  /**
   * Generate an image for a prediction
   * @param options Image generation options
   * @returns Promise with image URL or error
   */
  async generatePredictionImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    // Skip if feature is disabled
    if (!this.isEnabled) {
      console.log('🖼️ Image generation disabled via feature flag');
      return { success: false, error: 'Image generation is disabled' };
    }

    // Skip if API key is not configured
    if (!this.apiKey || !this.baseUrl) {
      console.log('🖼️ Image generation API not configured');
      return { success: false, error: 'Image generation API not configured' };
    }

    try {
      console.log('🖼️ Generating image for prompt:', options.prompt);
      
      // TODO: Implement actual API call to image generation service
      // This is a placeholder implementation
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: options.prompt,
          style: options.style || 'realistic',
          size: options.size || 'medium',
        }),
      });

      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        imageUrl: data.imageUrl,
      };
    } catch (error) {
      console.error('🖼️ Image generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Generate a prediction-specific prompt from prediction data
   */
  generatePromptFromPrediction(prediction: {
    title: string;
    description?: string;
    category?: string;
  }): string {
    const basePrompt = `A professional, clean illustration representing: ${prediction.title}`;
    
    if (prediction.description) {
      return `${basePrompt}. ${prediction.description}`;
    }
    
    if (prediction.category) {
      return `${basePrompt} in the ${prediction.category} category`;
    }
    
    return basePrompt;
  }

  /**
   * Check if image generation is available
   */
  isAvailable(): boolean {
    return this.isEnabled && !!this.apiKey && !!this.baseUrl;
  }
}

// Export singleton instance
export const imageGenService = new ImageGenerationService();

// Export types
export type { ImageGenerationOptions, ImageGenerationResult };
