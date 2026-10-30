import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => Math.max(1, v ? parseInt(v, 10) || 1 : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(200, Math.max(1, v ? parseInt(v, 10) || 25 : 25))),
});

export interface Paginated<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export function paginate<T>(data: T[], total: number, page: number, limit: number): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };
}

export const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v !== 'all' ? v : undefined));
