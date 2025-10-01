/**
 * User display utilities
 */

type UserLike = {
  full_name?: string | null;
  username?: string | null;
  displayName?: string | null;
  handle?: string | null;
};

/**
 * Get display name for a user/creator
 * Priority: full_name > displayName > @username > @handle > "Anonymous"
 */
export const displayNameFor = (user?: UserLike): string => {
  if (!user) return 'Anonymous';
  
  // Try full_name first
  if (user.full_name && user.full_name.trim()) {
    return user.full_name.trim();
  }
  
  // Try displayName
  if (user.displayName && user.displayName.trim()) {
    return user.displayName.trim();
  }
  
  // Try username (with @ prefix)
  if (user.username && user.username.trim()) {
    return `@${user.username.trim()}`;
  }
  
  // Try handle (with @ prefix)
  if (user.handle && user.handle.trim()) {
    return `@${user.handle.trim()}`;
  }
  
  return 'Anonymous';
};

/**
 * Alias for compatibility
 */
export const creatorDisplay = displayNameFor;

