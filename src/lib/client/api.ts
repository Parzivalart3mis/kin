import type { ErrorCode } from "@/lib/errors";

export class ApiError extends Error {
  readonly code: ErrorCode | "NETWORK";
  readonly status: number;

  constructor(code: ErrorCode | "NETWORK", message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

interface ErrorBody {
  error?: { code?: ErrorCode; message?: string };
}

/** fetch wrapper that understands the `{ error: { code, message } }` shape. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("NETWORK", "You're offline", 0);
  }

  if (!res.ok) {
    let body: ErrorBody = {};
    try {
      body = (await res.json()) as ErrorBody;
    } catch {
      /* non-JSON error page */
    }
    throw new ApiError(
      body.error?.code ?? "INTERNAL",
      body.error?.message ?? `Request failed (${res.status})`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

export const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });
