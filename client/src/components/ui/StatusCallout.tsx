import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatusTone = 'warning' | 'error' | 'info';

interface StatusCalloutProps {
  tone?: StatusTone;
  title?: string;
  message: ReactNode;
  actions?: ReactNode;
  className?: string;
}

const toneConfig: Record<
  StatusTone,
  {
    bg: string;
    border: string;
    text: string;
    icon: typeof AlertTriangle;
  }
> = {
  warning: {
    bg: 'bg-amber-25 dark:bg-amber-950/40',
    border: 'border border-amber-100 dark:border-amber-900/60',
    text: 'text-amber-900 dark:text-amber-100',
    icon: AlertTriangle,
  },
  error: {
    bg: 'bg-rose-25 dark:bg-rose-950/40',
    border: 'border border-rose-100 dark:border-rose-900/60',
    text: 'text-rose-900 dark:text-rose-100',
    icon: AlertOctagon,
  },
  info: {
    bg: 'bg-blue-25 dark:bg-blue-950/40',
    border: 'border border-blue-100 dark:border-blue-900/60',
    text: 'text-blue-900 dark:text-blue-100',
    icon: Info,
  },
};

export function StatusCallout({
  tone = 'warning',
  title,
  message,
  actions,
  className,
}: StatusCalloutProps) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-xl px-3 py-3 text-sm shadow-sm',
        config.bg,
        config.border,
        config.text,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-white/60 p-1.5 text-xs text-current shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 space-y-1">
          {title && <p className="text-sm font-semibold leading-tight">{title}</p>}
          <div className="text-sm leading-relaxed text-current/90">{message}</div>
          {actions && <div className="pt-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export default StatusCallout;

