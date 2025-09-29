import React from 'react';

export function StatCard({ 
  label, 
  value, 
  hint 
}: { 
  label: string; 
  value?: string | number; 
  hint?: string 
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold leading-none text-gray-900">
        {value ?? "—"}
      </p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default StatCard;
