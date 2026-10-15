import { NextResponse } from 'next/server';

/** An error that maps to an HTTP response; thrown inside transactions to roll them back. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Turns an HttpError into a JSON response; anything else is an unexpected failure and is rethrown. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}

/** Parses the request body, answering 400 (not 500) when it is not valid JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'El cuerpo de la petición no es un JSON válido');
  }
}

export function formatCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}
