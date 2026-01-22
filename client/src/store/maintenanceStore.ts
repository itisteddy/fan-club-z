import { create } from 'zustand';

type MaintenanceState = {
  active: boolean;
  message: string;
  setMaintenance: (message: string) => void;
  clear: () => void;
};

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  active: false,
  message: 'The platform is currently under maintenance. Please check back soon.',
  setMaintenance: (message) =>
    set({
      active: true,
      message: message || 'The platform is currently under maintenance. Please check back soon.',
    }),
  clear: () => set({ active: false }),
}));

