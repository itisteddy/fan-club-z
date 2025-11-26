import type { PredictionContext } from '@/features/images/queries';
import { buildImageQuery as buildSemanticQuery } from '@/features/images/queries';

export type SemanticImageContext = PredictionContext;

function normalizeInput(
  input: string | (SemanticImageContext & { title: string }),
  legacyCategory?: string
): SemanticImageContext {
  if (typeof input === 'string') {
    return { title: input, category: legacyCategory };
  }

  return {
    ...input,
    category: input.category ?? legacyCategory,
  };
}

/**
 * Build a semantic image query using the richer prediction context.
 * Accepts either the legacy signature (title, category) or the new object form.
 */
export function buildImageQuery(
  input: string | (SemanticImageContext & { title: string }),
  legacyCategory?: string
): string {
  const context = normalizeInput(input, legacyCategory);
  return buildSemanticQuery(context);
}
