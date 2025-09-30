import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface Category {
  id: string;
  label: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
}) => {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex gap-2 pb-2" data-tour="category-chips">
        {categories.map((category) => (
          <motion.button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'flex-shrink-0 inline-flex items-center px-3 h-[25px] rounded-full text-sm font-medium',
              'transition-all duration-200 whitespace-nowrap',
              selectedCategory === category.id
                ? 'bg-purple-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
            whileTap={{ scale: 0.96 }}
            data-tour="category-chips-item"
          >
            {category.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
};
