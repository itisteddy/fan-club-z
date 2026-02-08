import React, { useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { Category } from '@/hooks/useCategories';

interface CategorySelectorProps {
  value: string | null; // categoryId
  onChange: (categoryId: string) => void;
  categories: Category[];
  isLoading?: boolean;
}

/**
 * CategorySelector - scrollable chip rail (no dropdown)
 * Matches existing app design language (Discover filter style)
 */
export function CategorySelector({
  value,
  onChange,
  categories,
  isLoading = false,
}: CategorySelectorProps) {
  const chipRefs = useRef(new Map<string, HTMLButtonElement | null>());

  const setChipRef = useCallback(
    (key: string) => (el: HTMLButtonElement | null) => {
      chipRefs.current.set(key, el);
    },
    []
  );

  // Auto-select "general" category if value is null
  useEffect(() => {
    if (!value && categories.length > 0) {
      const general = categories.find((c) => c.slug === 'general') || categories[0];
      if (general) {
        onChange(general.id);
      }
    }
  }, [value, categories, onChange]);

  useLayoutEffect(() => {
    const fallbackId = categories.find((c) => c.slug === 'general')?.id;
    const key = value ?? fallbackId ?? 'general';
    const chip = chipRefs.current.get(key);
    if (!chip) return;
    chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [value, categories.length]);

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-7 w-20 bg-gray-200 rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto overflow-y-hidden scrollbar-hide flex-nowrap w-full">
        {categories.map((category) => {
          const isSelected = value === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange(category.id)}
              ref={setChipRef(category.id)}
              aria-pressed={isSelected}
              style={{
                height: '28px',
                minHeight: '28px',
                padding: '0 12px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 500,
                lineHeight: 1,
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s',
                backgroundColor: isSelected ? '#7B2FF7' : '#f1f5f9',
                color: isSelected ? '#ffffff' : '#475569',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = '#e2e8f0';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }
              }}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
