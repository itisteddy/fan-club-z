import React from 'react';
import { cn } from '../../utils/cn';

type Tab = { key: string; label: string; count?: number };

export function SegmentedTabs({ 
  value, 
  onChange, 
  tabs 
}: {
  value: string; 
  onChange: (v: string) => void; 
  tabs: Tab[];
}) {
  return (
    <div className="px-4 mx-auto max-w-screen-md">
      <div className="mt-2 mb-2 grid grid-cols-3 rounded-xl bg-gray-100 p-1">
        {tabs.map(t => {
          const active = value === t.key;
          return (
            <button
              key={t.key}
              className={cn(
                "h-9 rounded-lg text-sm font-medium transition-all",
                active ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-800"
              )}
              onClick={() => onChange(t.key)}
              aria-pressed={active}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const currentIndex = tabs.findIndex(tab => tab.key === value);
                  const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                  onChange(tabs[prevIndex].key);
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  const currentIndex = tabs.findIndex(tab => tab.key === value);
                  const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                  onChange(tabs[nextIndex].key);
                }
              }}
            >
              <span className="px-3">
                {t.label}{typeof t.count === "number" && <span className="ml-1 text-xs">({t.count})</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SegmentedTabs;
