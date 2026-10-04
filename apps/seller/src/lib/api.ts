const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
export const API_BASE = API.replace(/\/api$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  timeoutMs = 20_000,
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("seller.token") : null;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === "AbortError")
      throw new ApiError(0, "Сервер не отвечает. Проверьте соединение.", null);
    throw e;
  }
  clearTimeout(timer);

  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message: unknown }).message)
        : `Ошибка ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

export const api = {
  get:    <T>(p: string)              => request<T>("GET",    p),
  post:   <T>(p: string, b?: unknown) => request<T>("POST",   p, b),
  patch:  <T>(p: string, b?: unknown) => request<T>("PATCH",  p, b),
  delete: <T>(p: string)              => request<T>("DELETE", p),
};
