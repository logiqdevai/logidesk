-- Existing accounts default to Greek; new sign-ups keep the column default ('en') unless they choose otherwise.
UPDATE "users" SET "language" = 'el' WHERE "language" <> 'el';
