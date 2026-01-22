import React from 'react';
import { Wrench, RefreshCcw } from 'lucide-react';
import { useMaintenanceStore } from '@/store/maintenanceStore';

export function MaintenanceOverlay() {
  const { active, message } = useMaintenanceStore();

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[2147483646] bg-white">
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Wrench className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Maintenance mode</h1>
          <p className="mt-2 text-sm text-gray-600">{message}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <RefreshCcw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

