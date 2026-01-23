import React from 'react';

/**
 * Category UI helpers - single source of truth for category display
 * Backward compatible with existing prediction payloads
 */

/**
 * Get category label from prediction (backward compatible)
 */
export function getCategoryLabel(pred: any): string | null {
  if (!pred) return null;

  // New format: category object
  if (pred.categoryObj && typeof pred.categoryObj === 'object' && pred.categoryObj.label) {
    return pred.categoryObj.label;
  }

  // Alternative: categoryLabel string
  if (pred.categoryLabel && typeof pred.categoryLabel === 'string') {
    return pred.categoryLabel;
  }

  // Legacy: category string (slug)
  if (pred.category && typeof pred.category === 'string') {
    // Capitalize and format slug
    return pred.category
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return null;
}

/**
 * Get category ID from prediction (backward compatible)
 */
export function getCategoryId(pred: any): string | null {
  if (!pred) return null;

  // New format: category object
  if (pred.categoryObj && typeof pred.categoryObj === 'object' && pred.categoryObj.id) {
    return pred.categoryObj.id;
  }

  // Alternative: categoryId
  if (pred.categoryId && typeof pred.categoryId === 'string') {
    return pred.categoryId;
  }

  // Legacy: category_id
  if (pred.category_id && typeof pred.category_id === 'string') {
    return pred.category_id;
  }

  return null;
}

/**
 * Get category slug from prediction (backward compatible)
 */
export function getCategorySlug(pred: any): string | null {
  if (!pred) return null;

  // New format: category object
  if (pred.categoryObj && typeof pred.categoryObj === 'object' && pred.categoryObj.slug) {
    return pred.categoryObj.slug;
  }

  // Legacy: category string (slug)
  if (pred.category && typeof pred.category === 'string') {
    return pred.category;
  }

  return null;
}

/**
 * Render category chip using existing app chip style
 * Must match the style used in DiscoverPage CategoryFilters
 */
export function renderCategoryChip(label: string, isSelected = false): React.ReactElement {
  const className = isSelected
    ? 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-600 text-white'
    : 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700';
  
  return React.createElement('span', { className }, label);
}
