import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiError } from "@/shared/api/errors";

/**
 * Copies API field errors (`errors: [{ field, message }]`) onto the matching
 * React Hook Form fields. Returns the message to show as a form-level alert
 * when nothing could be attached to a field (or null when all were).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: ReadonlyArray<Path<T>>,
  fieldForCode: Partial<Record<string, Path<T>>> = {},
): string | null {
  if (!isApiError(error)) {
    return error instanceof Error ? error.message : "Something went wrong.";
  }

  let attached = 0;
  for (const fieldError of error.fieldErrors) {
    const field = fields.find((name) => name === fieldError.field);
    if (field) {
      setError(field, { type: "server", message: fieldError.message });
      attached += 1;
    }
  }

  // Some business errors map to one field without a field list (e.g. 409 email taken).
  const codeField = fieldForCode[error.code] ?? fieldForCode[String(error.status)];
  if (!attached && codeField) {
    setError(codeField, { type: "server", message: error.message });
    return null;
  }

  return attached ? null : error.message;
}
