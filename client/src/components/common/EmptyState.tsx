import type { ReactNode } from 'react'

type Props = {
  icon?: ReactNode
  title: string
  description?: string
  primaryCta?: string
  onPrimary?: () => void | Promise<void>
  secondaryCta?: string
  onSecondary?: () => void
  testId?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  primaryCta,
  onPrimary,
  secondaryCta,
  onSecondary,
  testId,
}: Props) {
  return (
    <div data-testid={testId} className="flex flex-col items-center gap-3 py-10 text-center">
      {icon ? <div className="mb-1">{icon}</div> : null}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="text-sm text-muted-foreground max-w-[28rem]">{description}</p> : null}
      {(primaryCta || secondaryCta) ? (
        <div className="mt-2 flex items-center gap-3">
          {primaryCta ? (
            <button onClick={onPrimary} className="rounded-xl px-4 py-2 border">
              {primaryCta}
            </button>
          ) : null}
          {secondaryCta ? (
            <button onClick={onSecondary} className="text-sm underline">
              {secondaryCta}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
