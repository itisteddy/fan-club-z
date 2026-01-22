import { useEffect, useMemo, useState } from 'react';

export function useCountdown(targetTime: Date | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = useMemo(() => {
    if (!targetTime) return 0;
    return Math.max(0, targetTime.getTime() - now);
  }, [targetTime, now]);

  const isActive = remainingMs > 0;

  const formatted = useMemo(() => {
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    return `${pad(minutes)}:${pad(seconds)}`;
  }, [remainingMs]);

  return { remainingMs, isActive, formatted };
}

