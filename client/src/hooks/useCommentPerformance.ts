import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { UnifiedComment } from '../store/unifiedCommentStore';

interface UseCommentPerformanceOptions {
  virtualizeThreshold?: number;
  searchDebounceMs?: number;
  filterDebounceMs?: number;
}

interface CommentFilters {
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'most_liked';
  showReplies?: boolean;
  userFilter?: string;
}

export const useCommentPerformance = (
  comments: UnifiedComment[],
  options: UseCommentPerformanceOptions = {}
) => {
  const {
    virtualizeThreshold = 50,
    searchDebounceMs = 300,
    filterDebounceMs = 100
  } = options;

  const [filters, setFilters] = useState<CommentFilters>({
    sortBy: 'newest',
    showReplies: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const filterTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounce search term
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, searchDebounceMs);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, searchDebounceMs]);

  // Flatten comments for searching (includes replies)
  const flattenComments = useCallback((comments: UnifiedComment[]): UnifiedComment[] => {
    const flattened: UnifiedComment[] = [];
    
    const flatten = (comment: UnifiedComment, depth = 0) => {
      flattened.push({ ...comment, depth } as UnifiedComment & { depth: number });
      if (comment.replies) {
        comment.replies.forEach(reply => flatten(reply, depth + 1));
      }
    };
    
    comments.forEach(comment => flatten(comment));
    return flattened;
  }, []);

  // Filter and sort comments
  const processedComments = useMemo(() => {
    let result = [...comments];

    // Filter by search term
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      result = result.filter(comment => {
        const contentMatch = comment.content.toLowerCase().includes(searchLower);
        const userMatch = (
          comment.user.username?.toLowerCase().includes(searchLower) ||
          comment.user.full_name?.toLowerCase().includes(searchLower)
        );
        
        // Also check replies if showing them
        const replyMatch = filters.showReplies && comment.replies?.some(reply =>
          reply.content.toLowerCase().includes(searchLower) ||
          reply.user.username?.toLowerCase().includes(searchLower) ||
          reply.user.full_name?.toLowerCase().includes(searchLower)
        );
        
        return contentMatch || userMatch || replyMatch;
      });
    }

    // Filter by user
    if (filters.userFilter) {
      result = result.filter(comment => 
        comment.user.id === filters.userFilter ||
        comment.replies?.some(reply => reply.user.id === filters.userFilter)
      );
    }

    // Sort comments
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'most_liked':
          return b.likes_count - a.likes_count;
        default:
          return 0;
      }
    });

    // Filter out replies if not showing them (keep only top-level comments)
    if (!filters.showReplies) {
      result = result.filter(comment => !comment.parent_comment_id);
    }

    return result;
  }, [comments, debouncedSearchTerm, filters]);

  // Determine if virtualization should be used
  const shouldVirtualize = useMemo(() => {
    const totalComments = filters.showReplies 
      ? flattenComments(comments).length 
      : comments.filter(c => !c.parent_comment_id).length;
    return totalComments >= virtualizeThreshold;
  }, [comments, filters.showReplies, virtualizeThreshold, flattenComments]);

  // Performance metrics
  const metrics = useMemo(() => ({
    totalComments: comments.length,
    filteredComments: processedComments.length,
    shouldVirtualize,
    searchActive: !!debouncedSearchTerm,
    filtersActive: !!(filters.userFilter || filters.sortBy !== 'newest')
  }), [comments.length, processedComments.length, shouldVirtualize, debouncedSearchTerm, filters]);

  // Update filters with debouncing
  const updateFilters = useCallback((newFilters: Partial<CommentFilters>) => {
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }
    
    filterTimeoutRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, ...newFilters }));
    }, filterDebounceMs);
  }, [filterDebounceMs]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFilters({
      sortBy: 'newest',
      showReplies: true
    });
  }, []);

  // Search handlers
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
  }, []);

  return {
    // Processed data
    comments: processedComments,
    
    // State
    filters,
    searchTerm,
    debouncedSearchTerm,
    
    // Actions
    updateFilters,
    clearFilters,
    handleSearch,
    clearSearch,
    
    // Performance
    shouldVirtualize,
    metrics,
    
    // Utilities
    flattenComments: useCallback(() => flattenComments(processedComments), [flattenComments, processedComments])
  };
};

export default useCommentPerformance;
