import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstall(false);
    }
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium mb-1">Install Fan Club Z</p>
          <p className="text-xs opacity-90">Get the full app experience!</p>
        </div>
        <div className="flex gap-2 ml-4">
          <button 
            onClick={handleInstall}
            className="bg-white text-purple-600 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100"
          >
            Install
          </button>
          <button 
            onClick={() => setShowInstall(false)}
            className="text-white px-3 py-2 text-sm hover:opacity-80"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
