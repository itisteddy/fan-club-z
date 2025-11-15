import { noop, emptyArray } from '../lib/void';

type LikeStore = {
  initializeLikes: () => void;
  toggleLike: (predictionId: string) => void;
  checkIfLiked: (predictionId: string) => boolean;
  getLikeCount: (predictionId: string) => number;
  likes: readonly string[];
};

export const useLikeStore = (): LikeStore => ({
  initializeLikes: noop,
  toggleLike: noop,
  checkIfLiked: () => false,
  getLikeCount: () => 0,
  likes: emptyArray,
});

