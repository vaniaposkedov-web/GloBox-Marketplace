"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/shared/auth";
import { getCart } from "./api";

/** Глобальное события обновления корзины — чтобы header и корзина синхронизировались. */
const CART_EVENT = "mp:cart-changed";

export function emitCartChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_EVENT));
  }
}

export function useCartCount(): number | null {
  const { user, hydrated } = useSession();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      setCount(0);
      return;
    }

    let cancelled = false;
    const load = () => {
      getCart()
        .then((c) => {
          if (!cancelled) setCount(c.count);
        })
        .catch(() => {
          if (!cancelled) setCount(0);
        });
    };
    load();

    const handler = () => load();
    window.addEventListener(CART_EVENT, handler);
    return () => {
      cancelled = true;
      window.removeEventListener(CART_EVENT, handler);
    };
  }, [user, hydrated]);

  return count;
}

export function useFavoriteIds() {
  const { user, hydrated } = useSession();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!hydrated || !user) {
      setIds(new Set());
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFavoriteIds } = require("./api") as typeof import("./api");
    getFavoriteIds()
      .then((arr) => setIds(new Set(arr)))
      .catch(() => setIds(new Set()));
  }, [user, hydrated]);

  return {
    has: (id: string) => ids.has(id),
    toggle: (id: string, isFav: boolean) => {
      setIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(id);
        else next.delete(id);
        return next;
      });
    },
  };
}
