export function isManagePredictionSettledState(pred: any): boolean {
  if (!pred) return false;
  const status = String(pred.status || '').toLowerCase();
  return status === 'settled' || pred.settled_at != null || pred.settledAt != null;
}
