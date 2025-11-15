export interface DatabaseUser {
  id: string;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

