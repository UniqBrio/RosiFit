import { CORS_HEADERS } from './cors.ts';

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/** Thrown by any handler to produce a client-facing error with a status code.
 *  Never let a raw Postgres/GoTrue error message reach the client -- catch it,
 *  decide what's safe to say, and raise this instead. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorJson(err: unknown): Response {
  if (err instanceof HttpError) {
    return json({ error: { message: err.message } }, err.status);
  }
  console.error(err);
  return json({ error: { message: 'Something went wrong. Please try again.' } }, 500);
}
