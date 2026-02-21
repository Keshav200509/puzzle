export type LogLevel = 'info' | 'warn' | 'error';

type LogPayload = {
  route: string;
  method: string;
  status: number;
  code?: string;
  user?: string;
  details?: Record<string, unknown>;
};

function stringify(payload: LogPayload) {
  return JSON.stringify({
    at: new Date().toISOString(),
    ...payload
  });
}

export function logApi(level: LogLevel, payload: LogPayload) {
  const message = stringify(payload);
  if (level === 'error') {
    console.error(message);
    return;
  }
  if (level === 'warn') {
    console.warn(message);
    return;
  }
  console.info(message);
}

export function reportApiError(route: string, method: string, error: unknown, details?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logApi('error', {
    route,
    method,
    status: 500,
    code: 'UNHANDLED_ERROR',
    details: { ...details, message }
  });
}
