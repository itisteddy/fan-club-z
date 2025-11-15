export type MediaItem = {
  id: string;            // provider image id or 'fallback'/'hint'
  url: string;           // final URL to use in <img>
  alt: string;           // accessible alt
  provider: 'unsplash' | 'pexels' | 'fallback' | 'hint';
};

type Listener = () => void;

const state = new Map<string, MediaItem>();      // key = prediction.id
const inflight = new Map<string, Promise<MediaItem>>();
const listeners = new Set<Listener>();

function notify() { listeners.forEach((l) => l()); }

export const mediaStore = {
  get(id: string) {
    return state.get(id);
  },
  set(id: string, item: MediaItem) {
    state.set(id, item);
    notify();
  },
  has(id: string) {
    return state.has(id);
  },
  peekInflight(id: string) {
    return inflight.get(id);
  },
  setInflight(id: string, p: Promise<MediaItem>) {
    inflight.set(id, p);
  },
  clearInflight(id: string) {
    inflight.delete(id);
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  reset() {
    state.clear();
    inflight.clear();
    notify();
  },
};

export type { Listener };
