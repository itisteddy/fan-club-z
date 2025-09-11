import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

type Props = {
  size?: "lg" | "md";
  title: string;
  subtitle?: string;
  trailing?: ReactNode; // avatar or empty
  showBack?: boolean;
  onBack?: () => void;
};

export function AppHeader({ size="md", title, subtitle, trailing, showBack, onBack }: Props) {
  const isLg = size === "lg";
  
  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className={`pt-safe px-5 ${isLg ? "py-4" : "py-3"} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          {showBack ? (
            <button 
              aria-label="Back" 
              className="p-2 -ml-2 rounded-xl active:bg-muted"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : null}
          <div>
            <h1 className={`${isLg ? "text-3xl" : "text-xl"} font-bold`}>{title}</h1>
            {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        <div>{trailing}</div>
      </div>
    </header>
  );
}
