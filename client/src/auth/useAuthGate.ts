import { useState, useEffect } from 'react';
import { useAuthGate as useAuthGateAdapter } from './authGateAdapter';
import { AuthIntent, IntentMeta } from './authIntents';

export interface UseAuthGateReturn {
  isOpen: boolean;
  pendingIntent?: AuthIntent;
  intentMeta?: IntentMeta;
  payload?: any;
}

/**
 * React hook to subscribe to auth gate state
 * Used by AuthGateModal and any components that need to react to auth gate state
 */
export const useAuthGate = (): UseAuthGateReturn => {
  // Use the adapter's useAuthGate hook directly
  const adapterResult = useAuthGateAdapter();
  return {
    isOpen: adapterResult.isOpen,
    pendingIntent: adapterResult.pendingIntent ?? undefined,
    intentMeta: adapterResult.intentMeta ?? undefined,
    payload: adapterResult.payload,
  };
};