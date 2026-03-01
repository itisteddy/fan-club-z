type MoneyMutationLog = {
  action: string;
  source: string;
  userId?: string | null;
  predictionId?: string | null;
  entryId?: string | null;
  amount?: number | null;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

const enabled =
  process.env.NODE_ENV !== 'production' ||
  process.env.FCZ_DEBUG_MONEY_MUTATIONS === '1' ||
  process.env.FCZ_DEBUG_MONEY_MUTATIONS === 'true';

function maskUserId(userId?: string | null): string | null {
  if (!userId) return null;
  if (userId.length <= 8) return userId;
  return `${userId.slice(0, 8)}…`;
}

export function logMoneyMutation(event: MoneyMutationLog): void {
  if (!enabled) return;

  const payload = {
    ts: new Date().toISOString(),
    action: event.action,
    source: event.source,
    userId: maskUserId(event.userId),
    predictionId: event.predictionId ?? null,
    entryId: event.entryId ?? null,
    amount: event.amount ?? null,
    before: event.before ?? null,
    after: event.after ?? null,
    meta: event.meta ?? null,
  };

  console.log('[MONEY_MUTATION]', JSON.stringify(payload));
}

