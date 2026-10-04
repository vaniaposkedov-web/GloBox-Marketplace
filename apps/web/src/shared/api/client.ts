/**
 * Тонкий fetch-клиент для API.
 * Используем Next.js rewrites (/api/* → http://localhost:4000/api/*),
 * поэтому на клиенте достаточно относительных путей.
 */

export interface ApiErrorPayload {
  message: string;
  issues?: Array<{ path: string; message: string }>;
  attemptsLeft?: number;
  statusCode?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly payload: ApiErrorPayload;
  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.status = status;
    this.payload = payload;
  }
}

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("mp.token");
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";
  const token = readToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const payload: ApiErrorPayload =
      typeof data === "object" && data !== null
        ? (data as ApiErrorPayload)
        : { message: `HTTP ${res.status}` };
    throw new ApiError(res.status, payload);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
