import { z } from 'zod';

export const SearchQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim().slice(0, 100)),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 5;
      return Number.isFinite(n) ? Math.min(Math.max(n, 1), 10) : 5;
    }),
});

export type SearchQueryType = z.infer<typeof SearchQuerySchema>;
