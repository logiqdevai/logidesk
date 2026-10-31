import { isAxiosError } from "axios";
import i18n from "@/i18n";

/** Error thrown by service functions; carries field-level errors returned by the API. */
export class ApiError extends Error {
  fieldErrors: Record<string, string>;
  status?: number;
  code?: string;

  constructor(message: string, fieldErrors: Record<string, string> = {}, status?: number, code?: string) {
    super(message);
    this.fieldErrors = fieldErrors;
    this.status = status;
    this.code = code;
  }
}

/** Converts any thrown value into a human-readable ApiError. */
export function toApiError(error: unknown, fallback: string): ApiError {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[]; errors?: Record<string, string> | Array<{ field: string; message: string }>; code?: string } | undefined;
    const message = Array.isArray(data?.message) ? data?.message[0] : data?.message;
    let fieldErrors: Record<string, string> = {};
    if (Array.isArray(data?.errors)) fieldErrors = Object.fromEntries(data.errors.map((e) => [e.field, e.message]));
    else if (data?.errors) fieldErrors = data.errors;
    if (!error.response) return new ApiError(i18n.t("ui:apiError.network"));
    if (error.response.status >= 500) return new ApiError(fallback, {}, error.response.status);
    return new ApiError(message || fallback, fieldErrors, error.response.status, data?.code);
  }
  if (error instanceof ApiError) return error;
  return new ApiError(fallback);
}
