import { qaLog } from './devQa';
import { buildPredictionCanonicalUrl } from '@/lib/predictionUrls';

export interface DeepLinkInfo {
  type: 'prediction' | 'profile' | 'discover' | 'unknown';
  id?: string;
  path: string;
  isValid: boolean;
}

/**
 * Parse a URL path to extract deep link information
 */
export const parseDeepLink = (path: string): DeepLinkInfo => {
  qaLog('[DeepLink] Parsing path:', path);

  // Remove leading slash and split into segments
  const segments = path.replace(/^\//, '').split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return {
      type: 'discover',
      path: '/',
      isValid: true,
    };
  }

  // Prediction details: /p/:id, /p/:id/:slug, /prediction/:id, /predictions/:id
  if (segments[0] === 'p' || segments[0] === 'prediction' || segments[0] === 'predictions') {
    if (segments.length >= 2 && segments[1]) {
      return {
        type: 'prediction',
        id: segments[1],
        path,
        isValid: true,
      };
    }
    return {
      type: 'prediction',
      path,
      isValid: false,
    };
  }

  // Profile: /profile/:userId
  if (segments[0] === 'profile') {
    if (segments.length >= 2 && segments[1]) {
      return {
        type: 'profile',
        id: segments[1],
        path,
        isValid: true,
      };
    }
    return {
      type: 'profile',
      path,
      isValid: false,
    };
  }

  // Discover page: /discover
  if (segments[0] === 'discover') {
    return {
      type: 'discover',
      path: '/discover',
      isValid: true,
    };
  }

  // Unknown path
  return {
    type: 'unknown',
    path,
    isValid: false,
  };
};

/**
 * Validate if a prediction ID is in the correct format
 */
export const isValidPredictionId = (id: string): boolean => {
  // UUID v4 format or similar alphanumeric ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const alphanumericRegex = /^[a-zA-Z0-9_-]{8,}$/;
  
  return uuidRegex.test(id) || alphanumericRegex.test(id);
};

/**
 * Validate if a user ID is in the correct format
 */
export const isValidUserId = (id: string): boolean => {
  // Similar validation as prediction ID
  return isValidPredictionId(id);
};

/**
 * Generate a shareable canonical URL for a prediction (always from id/title; ignores baseUrl).
 */
export const generatePredictionUrl = (predictionId: string, title?: string): string => {
  return buildPredictionCanonicalUrl(predictionId, title);
};

/**
 * Generate a shareable URL for a profile
 */
export const generateProfileUrl = (userId: string, baseUrl?: string): string => {
  const base = baseUrl || window.location.origin;
  return `${base}/profile/${userId}`;
};

/**
 * Extract prediction ID from various URL formats
 */
export const extractPredictionId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Try different patterns
    const patterns = [
      /\/prediction\/([^\/]+)/,
      /\/predictions\/([^\/]+)/,
      /\/p\/([^\/]+)/, // Short format
    ];
    
    for (const pattern of patterns) {
      const match = path.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  } catch (error) {
    qaLog('[DeepLink] Error extracting prediction ID:', error);
    return null;
  }
};

/**
 * Extract user ID from various URL formats
 */
export const extractUserId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Try different patterns
    const patterns = [
      /\/profile\/([^\/]+)/,
      /\/user\/([^\/]+)/,
      /\/u\/([^\/]+)/, // Short format
    ];
    
    for (const pattern of patterns) {
      const match = path.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  } catch (error) {
    qaLog('[DeepLink] Error extracting user ID:', error);
    return null;
  }
};

/**
 * Handle deep link navigation with proper error handling
 */
export const handleDeepLink = (
  path: string,
  navigate: (path: string) => void,
  fallbackPath: string = '/'
): boolean => {
  const linkInfo = parseDeepLink(path);
  
  qaLog('[DeepLink] Handling deep link:', linkInfo);
  
  if (!linkInfo.isValid) {
    qaLog('[DeepLink] Invalid deep link, redirecting to fallback:', fallbackPath);
    navigate(fallbackPath);
    return false;
  }
  
  // Validate ID format if present
  if (linkInfo.id) {
    if (linkInfo.type === 'prediction' && !isValidPredictionId(linkInfo.id)) {
      qaLog('[DeepLink] Invalid prediction ID format:', linkInfo.id);
      navigate(fallbackPath);
      return false;
    }
    
    if (linkInfo.type === 'profile' && !isValidUserId(linkInfo.id)) {
      qaLog('[DeepLink] Invalid user ID format:', linkInfo.id);
      navigate(fallbackPath);
      return false;
    }
  }
  
  // Navigate to the parsed path
  navigate(linkInfo.path);
  return true;
};

/**
 * Check if the current URL is a deep link
 */
export const isDeepLink = (path: string): boolean => {
  const linkInfo = parseDeepLink(path);
  return linkInfo.type !== 'discover' && linkInfo.isValid;
};

/**
 * Get the canonical path for a given deep link
 */
export const getCanonicalPath = (path: string): string => {
  const linkInfo = parseDeepLink(path);
  
  if (!linkInfo.isValid) {
    return '/';
  }
  
  // Normalize prediction paths to canonical /p/:id
  if (linkInfo.type === 'prediction' && linkInfo.id) {
    return `/p/${linkInfo.id}`;
  }
  
  // Normalize profile paths to use /profile/:id
  if (linkInfo.type === 'profile' && linkInfo.id) {
    return `/profile/${linkInfo.id}`;
  }
  
  return linkInfo.path;
};
