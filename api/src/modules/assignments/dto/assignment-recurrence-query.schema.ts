import { RecurrenceStatus } from 'generated/prisma';
import { z } from 'zod';

export const AssignmentRecurrenceQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(1, parseInt(v, 10) || 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(100, Math.max(1, parseInt(v, 10) || 20)) : 20)),
  client_id: z.string().uuid().optional(),
  form_id: z.string().uuid().optional(),
  status: z.nativeEnum(RecurrenceStatus).optional(),
});

export type AssignmentRecurrenceQueryType = z.infer<typeof AssignmentRecurrenceQuerySchema>;
