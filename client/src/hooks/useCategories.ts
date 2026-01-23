import { useState, useEffect } from 'react';
import { getApiUrl } from '@/utils/environment';

export interface Category {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  sortOrder: number;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`${getApiUrl()}/api/v2/categories`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.status}`);
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        } else {
          throw new Error('Invalid categories response format');
        }
      } catch (err) {
        console.error('[useCategories] Error fetching categories:', err);
        setError(err instanceof Error ? err : new Error('Failed to load categories'));
        // Fallback to empty array on error
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, isLoading, error };
}
