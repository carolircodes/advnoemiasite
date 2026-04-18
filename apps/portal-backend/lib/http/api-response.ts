import { NextResponse } from "next/server.js";
import { ZodError } from "zod";

type JsonErrorOptions = {
  code?: string;
  details?: Record<string, unknown>;
};

export function jsonError(
  error: string,
  status: number,
  options: JsonErrorOptions = {}
) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(options.code ? { code: options.code } : {}),
      ...(options.details ? { details: options.details } : {})
    },
    { status }
  );
}

export function extractErrorMessage(
  error: unknown,
  fallback: string
) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message || fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

export function extractValidationDetails(error: ZodError) {
  const flattened = error.flatten();

  return {
    fieldErrors: flattened.fieldErrors,
    formErrors: flattened.formErrors
  };
}
