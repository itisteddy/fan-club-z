/**
 * Comment models - predictions only (no club references)
 */
export interface Comment {
  id: string;
  user_id: string;
  prediction_id?: string | null;
  parent_id?: string | null;
  content: string;
  created_at?: string;
  updated_at?: string;
  reply_count?: number;
  reaction_counts?: Record<string, number>;
  author?: {
    id: string;
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  };
  [key: string]: unknown;
}

export interface CreateComment {
  prediction_id?: string;
  parent_id?: string;
  parent_comment_id?: string | null;
  content: string;
}

export interface Reaction {
  id: string;
  comment_id: string;
  user_id: string;
  type: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateReaction {
  comment_id: string;
  type: string;
  prediction_id?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  cursor?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
    cursor?: string | null;
  };
}

