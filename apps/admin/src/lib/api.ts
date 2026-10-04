const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin.token") : null;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message ?? `Error ${res.status}`);
  return json as T;
}

export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, b?: unknown) => request<T>("POST", p, b),
  patch: <T>(p: string, b?: unknown) => request<T>("PATCH", p, b),
  delete: <T>(p: string) => request<T>("DELETE", p),
};
