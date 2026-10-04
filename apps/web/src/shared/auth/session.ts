/**
 * Клиентское хранилище JWT и данных пользователя.
 * Используем localStorage + подписку для обновления UI.
 */

export type UserRole = "BUYER" | "SUPPLIER" | "MEDIATOR" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  /** Основная роль (для обратной совместимости и фильтров шапки) */
  role: UserRole;
  /** Полный набор ролей (поддержка совмещения SUPPLIER + MEDIATOR) */
  roles?: UserRole[];
  avatarUrl?: string | null;
}

/** Может ли пользователь создавать/редактировать товары */
export function canSell(role?: UserRole | null, roles?: UserRole[] | null): boolean {
  return role === "SUPPLIER" || role === "ADMIN" || !!roles?.includes("SUPPLIER");
}

/** Является ли пользователь посредником */
export function isMediator(
  role?: UserRole | null,
  roles?: UserRole[] | null,
): boolean {
  if (role === "MEDIATOR") return true;
  return Array.isArray(roles) && roles.includes("MEDIATOR");
}

/** Имеет ли пользователь роль поставщика */
export function isSupplier(
  role?: UserRole | null,
  roles?: UserRole[] | null,
): boolean {
  if (role === "SUPPLIER") return true;
  return Array.isArray(roles) && roles.includes("SUPPLIER");
}

const TOKEN_KEY = "mp.token";
const USER_KEY = "mp.user";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  if (user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  notify();
}

export function updateUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  notify();
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  notify();
}

export function onSessionChange(listener: Listener): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}
