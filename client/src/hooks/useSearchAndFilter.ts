import React, { useMemo, useCallback } from 'react';

export const useSearchAndFilter = (
  items: any[],
  searchQuery: string,
  selectedCategory: string,
  searchFields: string[] = ['title', 'description', 'category']
) => {
  return useMemo(() => {
    if (!items || items.length === 0) return [];

    return items.filter(item => {
      // Category filter
      const matchesCategory = selectedCategory === 'all' || 
                             item.category?.toLowerCase() === selectedCategory.toLowerCase();

      // Search filter
      const matchesSearch = !searchQuery || 
        searchFields.some(field => {
          const value = item[field];
          return value && value.toLowerCase().includes(searchQuery.toLowerCase());
        });

      return matchesCategory && matchesSearch;
    });
  }, [items, searchQuery, selectedCategory, searchFields]);
};

export const useDebouncedValue = (value: string, delay: number = 300) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Performance optimization for large lists
export const useVirtualizedList = (items: any[], containerHeight: number, itemHeight: number) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, scrollTop, itemHeight, containerHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    handleScroll,
    totalHeight: visibleItems.totalHeight
  };
};
