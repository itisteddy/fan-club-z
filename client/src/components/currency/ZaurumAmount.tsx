import React from "react";
import { cn } from "@/utils/cn";
import { ZaurumMark } from "./ZaurumMark";

interface ZaurumAmountProps {
  value: number | string;
  compact?: boolean;
  className?: string;
  markClassName?: string;
  markSize?: "xs" | "sm" | "md" | "lg" | "xl";
}

function formatLocalZaurumNumber(n: number | string, compact: boolean): string {
  const num = typeof n === "string" ? Number(n) : n;
  if (compact) {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num || 0);
  }

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num || 0);
}

export function ZaurumAmount({ value, compact = false, className, markClassName, markSize = "sm" }: ZaurumAmountProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <ZaurumMark size={markSize} className={markClassName} />
      <span>{formatLocalZaurumNumber(value, compact)}</span>
    </span>
  );
}

export default ZaurumAmount;
