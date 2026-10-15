import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';

/** An error that maps to an HTTP response; thrown inside transactions to roll them back. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Turns any error into a JSON response, so the client never gets an empty/HTML 500.
 * Known failures keep a meaningful status; the rest is logged and answered with a generic 500.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  // `request.json()` on a malformed body
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'El cuerpo de la petición no es un JSON válido' }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Ya existe un registro con esos datos' }, { status: 409 });
    if (error.code === 'P2025') return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    if (error.code === 'P2003') return NextResponse.json({ error: 'Referencia inválida' }, { status: 400 });
    // Write conflict / deadlock between two simultaneous operations: safe to retry
    if (error.code === 'P2034') return NextResponse.json({ error: 'La operación coincidió con otra al mismo tiempo. Intenta de nuevo.' }, { status: 409 });
  }
  // Can't reach the database (down, restarting, connection refused or dropped)
  if (isDatabaseUnreachable(error)) {
    console.error('[api] database unreachable:', (error as Error).message.split('\n').filter(Boolean).pop());
    return NextResponse.json({ error: 'Servicio no disponible. Intenta de nuevo en unos minutos.' }, { status: 503 });
  }
  console.error('[api]', error);
  return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
}

// Class names and `instanceof` don't survive Next's production bundle for these errors,
// but Prisma's connection-failure messages are stable.
const DB_UNREACHABLE = /can't reach database server|closed the connection|timed out fetching a new connection|error in postgresql connection|econnrefused|connection (reset|terminated)/i;

function isDatabaseUnreachable(error: unknown): boolean {
  return error instanceof Error && DB_UNREACHABLE.test(error.message);
}

/** True when `error` is a Prisma error with the given code (e.g. P2002 = unique violation). */
export function isPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

/**
 * Wraps a route handler so that anything it throws (HttpError, bad JSON, database
 * failures) becomes a JSON error response instead of an unhandled 500.
 */
export function api<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Parses the request body, answering 400 (not 500) when it is not valid JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'El cuerpo de la petición no es un JSON válido');
  }
}

/** Reads and validates the body against a zod schema; throws a 400 with the first message. */
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Datos inválidos');
  }
  return parsed.data;
}

export function formatCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}
