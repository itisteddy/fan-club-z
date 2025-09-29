// Seeded selection logic for deterministic image selection

export function seededIndex(seed: string, length: number): number {
  if (length <= 0) return 0;
  
  let hash = 2166136261; // FNV-1a hash initial value
  
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  
  return Math.abs(hash) % length;
}

export function selectImage<T>(items: T[], seed: string): T | null {
  if (!items || items.length === 0) return null;
  
  const index = seededIndex(seed, items.length);
  return items[index];
}

export function selectImages<T>(items: T[], seed: string, count: number): T[] {
  if (!items || items.length === 0) return [];
  
  const startIndex = seededIndex(seed, items.length);
  const selected: T[] = [];
  
  for (let i = 0; i < Math.min(count, items.length); i++) {
    const index = (startIndex + i) % items.length;
    selected.push(items[index]);
  }
  
  return selected;
}
