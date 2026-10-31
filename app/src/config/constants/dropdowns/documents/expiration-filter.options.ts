import { lazyOption } from "./lazy-option";

export const ExpirationFilterOptions: { id: string; label: string }[] = [
  lazyOption("any", "documents:filters.expiration.any"),
  lazyOption("expired", "documents:filters.expiration.expired"),
  lazyOption("30d", "documents:filters.expiration.30d"),
  lazyOption("90d", "documents:filters.expiration.90d"),
  lazyOption("none", "documents:filters.expiration.none"),
];
