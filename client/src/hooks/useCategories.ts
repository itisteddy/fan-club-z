import { useState, useEffect } from 'react';
import { getApiUrl } from '@/utils/environment';
import { CATEGORIES, CATEGORY_ORDER } from '@/constants/categories';

export interface Category {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  sortOrder: number;
  isFallback?: boolean;
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
          const apiCategories = data.data as Category[];
          const apiBySlug = new Map(apiCategories.map((cat) => [cat.slug, cat]));

          const ordered = CATEGORIES.map((def) => {
            const apiCat = apiBySlug.get(def.slug);
            if (apiCat) return apiCat;
            return {
              id: def.slug,
              slug: def.slug,
              label: def.label,
              icon: null,
              sortOrder: def.sortOrder,
              isFallback: true,
            };
          });

          const remaining = apiCategories
            .filter((cat) => !CATEGORY_ORDER.has(cat.slug))
            .sort((a, b) => {
              const orderA = a.sortOrder ?? 9999;
              const orderB = b.sortOrder ?? 9999;
              if (orderA !== orderB) return orderA - orderB;
              return a.label.localeCompare(b.label);
            });

          setCategories([...ordered, ...remaining]);
        } else {
          throw new Error('Invalid categories response format');
        }
      } catch (err) {
        console.error('[useCategories] Error fetching categories:', err);
        setError(err instanceof Error ? err : new Error('Failed to load categories'));
        setCategories(
          CATEGORIES.map((def) => ({
            id: def.slug,
            slug: def.slug,
            label: def.label,
            icon: null,
            sortOrder: def.sortOrder,
            isFallback: true,
          }))
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, isLoading, error };
}
