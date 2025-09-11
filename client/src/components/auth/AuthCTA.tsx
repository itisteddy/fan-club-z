import { FC } from "react";
import { User, Wallet, Target } from "lucide-react";

type AuthCTAProps = {
  icon?: "profile" | "wallet" | "target";
  title: string;
  subtitle: string;
  onGoogle: () => void;
  testId?: string;
};

export const AuthCTA: FC<AuthCTAProps> = ({ icon = "profile", title, subtitle, onGoogle, testId }) => {
  const IconComponent = icon === "wallet" ? Wallet : icon === "target" ? Target : User;
  
  return (
    <div className="px-5 pb-safe pt-8 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
        <IconComponent className="w-8 h-8" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>

      <button
        data-testid={testId}
        onClick={onGoogle}
        className="mt-6 w-full rounded-2xl h-12 font-medium bg-[#0F9D58] text-white active:opacity-90 transition-opacity"
      >
        Continue with Google →
      </button>
    </div>
  );
};
