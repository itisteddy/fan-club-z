// Canonical User type for Fan Club Z
export interface User {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  is_verified?: boolean;
}

// Extended user types for specific contexts
export interface ExtendedUser extends User {
  displayName?: string;
  avatarUrl?: string; // Alternative naming convention
}

// User profile data
export interface UserProfile extends User {
  bio?: string;
  location?: string;
  website?: string;
  social_links?: Record<string, string>;
  stats?: {
    total_predictions: number;
    correct_predictions: number;
    total_winnings: number;
    win_rate: number;
  };
}
