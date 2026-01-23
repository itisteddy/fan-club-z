import React, { useState, useEffect } from 'react';
import { Category } from '@/hooks/useCategories';
import { ChevronDown, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/utils/cn';

interface CategorySelectorProps {
  value: string | null; // categoryId
  onChange: (categoryId: string) => void;
  categories: Category[];
  isLoading?: boolean;
}

/**
 * CategorySelector - chip-based selector with "More" sheet
 * Matches existing app design language (Discover filter style)
 */
export function CategorySelector({
  value,
  onChange,
  categories,
  isLoading = false,
}: CategorySelectorProps) {
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  // Auto-select "general" category if value is null
  useEffect(() => {
    if (!value && categories.length > 0) {
      const general = categories.find((c) => c.slug === 'general') || categories[0];
      if (general) {
        onChange(general.id);
      }
    }
  }, [value, categories, onChange]);

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-7 w-20 bg-gray-200 rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  // Show top 6 categories as chips, rest in "More" sheet
  const topCategories = categories.slice(0, 6);
  const moreCategories = categories.slice(6);
  const selectedCategory = categories.find((c) => c.id === value);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {topCategories.map((category) => {
          const isSelected = value === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange(category.id)}
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

        {/* "More" button if there are additional categories */}
        {moreCategories.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMoreSheet(true)}
            style={{
              height: '28px',
              minHeight: '28px',
              padding: '0 12px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontSize: '13px',
              fontWeight: 500,
              lineHeight: 1,
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.2s',
              backgroundColor: '#f1f5f9',
              color: '#475569',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
            }}
          >
            More
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* More categories sheet */}
      {moreCategories.length > 0 && (
        <Dialog.Root open={showMoreSheet} onOpenChange={setShowMoreSheet}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[12000]" />
            <Dialog.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[12001] max-h-[calc(100vh-5rem-env(safe-area-inset-bottom))] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10">
                <Dialog.Title className="text-lg font-semibold text-gray-900">Select Category</Dialog.Title>
                <Dialog.Close className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-500" />
                </Dialog.Close>
              </div>
              <div className="px-4 py-4 space-y-2">
                {categories.map((category) => {
                  const isSelected = value === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        onChange(category.id);
                        setShowMoreSheet(false);
                      }}
                      className={cn(
                        'w-full text-left px-4 py-3 rounded-xl transition-colors',
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                      )}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  );
}
