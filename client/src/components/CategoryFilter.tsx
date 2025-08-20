import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface Category {
  id: string;
  label: string;
  icon: string;
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
      <div className="flex gap-2 pb-2">
        {categories.map((category) => (
          <motion.button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "relative shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
              "flex items-center gap-2 min-w-fit",
              selectedCategory === category.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-sm">{category.icon}</span>
            <span>{category.label}</span>
            
            {selectedCategory === category.id && (
              <motion.div
                layoutId="categoryIndicator"
                className="absolute inset-0 bg-primary rounded-full -z-10"
                initial={false}
                transition={{ type: "spring", duration: 0.3 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};
