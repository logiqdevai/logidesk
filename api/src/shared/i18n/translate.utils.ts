import { EL_MESSAGES, EL_PATTERNS } from './el-messages';

/** Translates one message to Greek: exact match first, then the interpolated patterns; unknown text is returned as is. */
export function translateToGreek(message: string): string {
  const exact = EL_MESSAGES[message];
  if (exact) return exact;
  for (const [pattern, replacement] of EL_PATTERNS) {
    if (pattern.test(message)) return message.replace(pattern, replacement);
  }
  return message;
}

function translateValue(value: unknown): unknown {
  if (typeof value === 'string') return translateToGreek(value);
  if (Array.isArray(value)) return value.map(translateValue);
  return value;
}

/** Translates the `message` and `errors` of an error body, keeping every other field (`code`, `statusCode`, ...) untouched. */
export function translateErrorBody<T>(body: T): T {
  if (!body || typeof body !== 'object') return body;
  const result: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  if ('message' in result) result.message = translateValue(result.message);
  const errors = result.errors;
  if (Array.isArray(errors)) {
    result.errors = errors.map((e) =>
      e && typeof e === 'object' && typeof (e as { message?: unknown }).message === 'string'
        ? { ...e, message: translateToGreek((e as { message: string }).message) }
        : translateValue(e),
    );
  } else if (errors && typeof errors === 'object') {
    result.errors = Object.fromEntries(Object.entries(errors).map(([key, value]) => [key, translateValue(value)]));
  }
  return result as T;
}
