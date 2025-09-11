// client/src/lib/predictionStats.ts
export type AnyPrediction = {
  id: string;
  status?: string;              // "open" | "live" | "closed" | "settled" | etc.
  closesAt?: string | number | Date;
  resolvedAt?: string | null;
  participantCount?: number;
  participants?: { id: string }[];
  createdById?: string;
  stats?: { uniqueUsers?: number }; // optional, if present
  totalVolume?: number | string;    // per prediction, live-side volume if available
  // If volume is per-bet, adapt below using your bet shape.
};

export function isActivePrediction(p: AnyPrediction, now = Date.now()): boolean {
  const status = (p.status ?? "").toLowerCase();
  if (status === "closed" || status === "settled" || status === "resolved" || status === "ended") return false;

  if (p.resolvedAt) return false;
  if (p.closesAt) {
    const end = typeof p.closesAt === "string" || typeof p.closesAt === "number"
      ? new Date(p.closesAt).getTime()
      : (p.closesAt as Date).getTime?.() ?? Number.NaN;
    if (!Number.isNaN(end) && end < now) return false;
  }
  // Treat unknown statuses as active unless proven ended.
  return true;
}

export function computeActiveStats(predictions: AnyPrediction[]) {
  const active = predictions.filter((p) => isActivePrediction(p));
  const liveCount = active.length;

  // Volume: prefer p.totalVolume if that's the live side. If totalVolume is all-time, you may need bet-level sums.
  const volume = active.reduce((sum, p) => {
    const v = typeof p.totalVolume === "string" ? parseFloat(p.totalVolume) : (p.totalVolume ?? 0);
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);

  // Players: try explicit participants; fallback to participantCount; fallback to createdById as minimal set.
  const playerIds = new Set<string>();
  for (const p of active) {
    if (Array.isArray(p.participants) && p.participants.length) {
      p.participants.forEach((u) => u?.id && playerIds.add(u.id));
    } else if (typeof p.participantCount === "number" && p.participantCount > 0) {
      // We can't derive exact IDs; conservatively approximate with prediction id bucket.
      playerIds.add(p.id); // approximation to avoid 0
    } else if (p.createdById) {
      playerIds.add(p.createdById);
    } else if (p.stats?.uniqueUsers && p.stats.uniqueUsers > 0) {
      // last-resort approximation
      playerIds.add(`${p.id}-stats`);
    }
  }
  const players = playerIds.size;

  return { volume, liveCount, players, active };
}
