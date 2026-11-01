import {
  ClientImportField,
  ClientImportMapping,
} from '../utils/client-import.utils';

export interface ClientImportColumn {
  index: number;
  header: string;
  samples: string[];
}

export interface ClientImportPreview {
  file_name: string;
  format: 'xlsx' | 'csv';
  sheet_name: string | null;
  total_rows: number;
  columns: ClientImportColumn[];
  /** Fields the user can map columns to. */
  fields: readonly ClientImportField[];
  /** Best guess from the header names; the user confirms or changes it. */
  suggested_mapping: ClientImportMapping;
}

/** Why a single value could not be used. The frontend turns these codes into plain-language messages. */
export type ClientImportProblemCode =
  | 'REQUIRED'
  | 'SINGLE_WORD_NAME'
  | 'INVALID_EMAIL'
  | 'INVALID_COUNTRY'
  | 'TOO_LONG'
  | 'INVALID';

export interface ClientImportProblem {
  field: ClientImportField;
  /** Header of the spreadsheet column the value came from. */
  column: string;
  code: ClientImportProblemCode;
  /** The offending cell value (trimmed, shortened). */
  value: string;
}

export type ClientImportSkipReason =
  'INVALID' | 'DUPLICATE_EXISTING' | 'DUPLICATE_IN_FILE';

/** A contact from the file that was not added, and why. */
export interface ClientImportSkippedRow {
  /** 1-based spreadsheet row. */
  row: number;
  /** Who this row is (name, else email, else empty) so the user can find it. */
  contact: string;
  reason: ClientImportSkipReason;
  /** The email that clashed (duplicates only). */
  email?: string;
  problems: ClientImportProblem[];
}

export type ClientImportWarningCode =
  'EMAIL_COLUMN_NOT_EMAILS' | 'LOOKS_LIKE_EMAIL';

/** The mapping looks wrong for the data in a column. Nothing is imported until the user confirms. */
export interface ClientImportWarning {
  code: ClientImportWarningCode;
  field: ClientImportField;
  column: string;
  /** Values that look like email addresses vs. all non-empty values in the column. */
  valid: number;
  total: number;
  example: string;
}

export interface ClientImportResult {
  total: number;
  created: number;
  skipped_duplicates: number;
  failed: number;
  /** Created clients that have an email, so the user can invite them to the portal right away. */
  invitable_client_ids: string[];
  /** True when the import was held back because of `warnings`; nothing was created. */
  blocked: boolean;
  warnings: ClientImportWarning[];
  /** Rows that were not added, with reasons (capped; the counts above are always complete). */
  skipped: ClientImportSkippedRow[];
}

export interface ClientInvitationsResult {
  sent: number;
  failed: number;
}
