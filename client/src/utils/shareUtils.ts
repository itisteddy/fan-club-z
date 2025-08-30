import { Prediction } from '../types';

export interface ShareContent {
  title: string;
  text: string;
  url: string;
  fullMessage: string;
}

export interface ShareOptions {
  includeDescription?: boolean;
  includeBranding?: boolean;
  customPrefix?: string;
  platform?: 'twitter' | 'whatsapp' | 'telegram' | 'general';
}

/**
 * Creates properly formatted share content for predictions
 * Follows social media best practices and includes all necessary information
 */
export function createShareContent(
  prediction: Pick<Prediction, 'id' | 'title' | 'category'> & { description?: string },
  options: ShareOptions = {}
): ShareContent {
  const {
    includeDescription = true,
    includeBranding = true,
    customPrefix,
    platform = 'general'
  } = options;

  // Create the prediction URL
  const baseUrl = window.location.origin;
  const url = `${baseUrl}/predictions/${prediction.id}`;

  // Clean and format the title
  const title = prediction.title?.trim() || 'Untitled Prediction';
  
  // Clean and format the description
  const description = prediction.description?.trim();
  const hasDescription = includeDescription && description && description.length > 0;

  // Create category emoji mapping for better visual appeal
  const categoryEmojis: Record<string, string> = {
    sports: '⚽',
    pop_culture: '🎬',
    politics: '🗳️',
    esports: '🎮',
    celebrity_gossip: '⭐',
    custom: '🎯'
  };

  const emoji = categoryEmojis[prediction.category] || '🎯';

  // Platform-specific formatting
  let text: string;
  let fullMessage: string;

  switch (platform) {
    case 'twitter':
      // Twitter optimized format (character limit friendly)
      text = customPrefix || `${emoji} Will this happen?`;
      fullMessage = [
        text,
        `"${title}"`,
        hasDescription && description!.length <= 100 ? description : '',
        '🔮 Make your prediction on Fan Club Z!',
        url
      ].filter(Boolean).join('\n\n');
      break;

    case 'whatsapp':
      // WhatsApp optimized format (more casual)
      text = customPrefix || `${emoji} Check this out!`;
      fullMessage = [
        text,
        `*${title}*`,
        hasDescription ? `_${description}_` : '',
        includeBranding ? '🎯 Join the prediction on Fan Club Z!' : '',
        url
      ].filter(Boolean).join('\n\n');
      break;

    case 'telegram':
      // Telegram optimized format (supports markdown)
      text = customPrefix || `${emoji} New Prediction Alert!`;
      fullMessage = [
        `**${text}**`,
        `📊 ${title}`,
        hasDescription ? `💭 ${description}` : '',
        includeBranding ? '🚀 Make your prediction on Fan Club Z!' : '',
        `🔗 ${url}`
      ].filter(Boolean).join('\n\n');
      break;

    default:
      // General format for copy/paste and native sharing
      text = customPrefix || `${emoji} Prediction: ${title}`;
      fullMessage = [
        `${emoji} **${title}**`,
        hasDescription ? `📝 ${description}` : '',
        '',
        includeBranding ? '🎯 Make your prediction and compete with friends!' : '',
        '🔗 Join at: ' + url
      ].filter(Boolean).join('\n');
      break;
  }

  return {
    title: `${emoji} ${title}`,
    text,
    url,
    fullMessage
  };
}

/**
 * Enhanced share function with analytics and fallbacks
 */
export async function shareContent(
  shareContent: ShareContent,
  options: {
    trackingId?: string;
    analyticsCallback?: (method: string, success: boolean) => void;
  } = {}
): Promise<boolean> {
  const { trackingId, analyticsCallback } = options;

  // Try native sharing first (mobile devices)
  if (navigator.share && navigator.canShare) {
    try {
      await navigator.share({
        title: shareContent.title,
        text: shareContent.text,
        url: shareContent.url,
      });
      
      analyticsCallback?.('native_share', true);
      return true;
    } catch (error) {
      // User cancelled or sharing failed
      console.log('Native sharing cancelled or failed:', error);
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(shareContent.fullMessage);
    analyticsCallback?.('clipboard', true);
    return true;
  } catch (error) {
    // Final fallback for older browsers
    console.error('Clipboard API failed:', error);
    
    try {
      const textArea = document.createElement('textarea');
      textArea.value = shareContent.fullMessage;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      analyticsCallback?.('fallback_copy', success);
      return success;
    } catch (execError) {
      console.error('execCommand failed:', execError);
      analyticsCallback?.('fallback_copy', false);
      return false;
    }
  }
}

/**
 * Create platform-specific share URLs
 */
export function createPlatformShareUrl(
  shareContent: ShareContent,
  platform: 'twitter' | 'whatsapp' | 'telegram' | 'facebook'
): string {
  const encodedText = encodeURIComponent(shareContent.text);
  const encodedUrl = encodeURIComponent(shareContent.url);
  const encodedFullMessage = encodeURIComponent(shareContent.fullMessage);

  switch (platform) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    
    case 'whatsapp':
      return `https://wa.me/?text=${encodedFullMessage}`;
    
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
    
    default:
      return shareContent.url;
  }
}

/**
 * Generate a shareable image text overlay (for future image sharing)
 */
export function createImageShareText(
  prediction: Pick<Prediction, 'title' | 'category'>,
  options: { compact?: boolean } = {}
): string {
  const { compact = false } = options;
  const emoji = {
    sports: '⚽',
    pop_culture: '🎬',
    politics: '🗳️',
    esports: '🎮',
    celebrity_gossip: '⭐',
    custom: '🎯'
  }[prediction.category] || '🎯';

  if (compact) {
    return `${emoji} ${prediction.title}`;
  }

  return [
    `${emoji} PREDICTION`,
    '',
    prediction.title,
    '',
    '🎯 fanclubz.com'
  ].join('\n');
}
