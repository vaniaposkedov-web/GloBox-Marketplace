"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

// ── Module-level cache shared across all hook instances ──────────────────────

let _cache = { orders: 0, chats: 0, fetchedAt: 0 };
let _fetching = false;

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nav-badges", { detail: { ..._cache } }));
  }
}

function safeLS(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

async function doFetch() {
  if (_fetching) return;
  const userId = typeof window !== "undefined" ? safeLS("mediator.userId") : null;
  const token = typeof window !== "undefined" ? safeLS("mediator.token") : null;
  if (!userId || !token) return;

  _fetching = true;
  try {
    const ordersLastSeen = parseInt(safeLS("mediator_orders_new_last_seen") ?? "0", 10);
    const chatsLastSeen = parseInt(safeLS("mediator_chats_last_seen") ?? "0", 10);

    const [orders, chats, broadcastChats] = await Promise.all([
      api.get<any[]>("/order-requests").catch(() => []),
      api.get<any[]>("/order-requests/chats").catch(() => []),
      api.get<any[]>("/mediator-orders/mediator/chats").catch(() => []),
    ]);

    // New direct requests — CREATED and unseen
    const newOrders = (orders ?? []).filter((o: any) =>
      o.status === "CREATED" &&
      new Date(o.createdAt).getTime() > ordersLastSeen
    ).length;

    // New chats = direct + broadcast chats with messages NOT sent by mediator, since last visit
    const allChats = [...(chats ?? []), ...(broadcastChats ?? [])];
    const newChats = allChats.filter((c: any) => {
      const lastAt = c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0;
      if (lastAt <= chatsLastSeen) return false;
      // Don't count if mediator sent the last message
      const lastSenderId = c.lastMessage?.senderId ?? c.lastSenderId ?? null;
      if (lastSenderId && lastSenderId === userId) return false;
      return true;
    }).length;

    _cache = { orders: newOrders, chats: newChats, fetchedAt: Date.now() };
    emit();
  } finally {
    _fetching = false;
  }
}

// ── Public helpers called by pages ────────────────────────────────────────────

export function markOrdersNewTabSeen() {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem("mediator_orders_new_last_seen", Date.now().toString()); } catch {}
  _cache = { ..._cache, orders: 0 };
  emit();
}

export function markChatsSeen() {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem("mediator_chats_last_seen", Date.now().toString()); } catch {}
  _cache = { ..._cache, chats: 0 };
  emit();
}

export function triggerBadgeRefetch() {
  _cache.fetchedAt = 0;
  doFetch();
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useNavBadges() {
  const [badges, setBadges] = useState({ orders: 0, chats: 0 });

  useEffect(() => {
    const handler = (e: Event) => {
      const { orders, chats } = (e as CustomEvent<typeof _cache>).detail;
      setBadges({ orders, chats });
    };
    window.addEventListener("nav-badges", handler);

    if (Date.now() - _cache.fetchedAt > 30_000) {
      doFetch();
    } else {
      setBadges({ orders: _cache.orders, chats: _cache.chats });
    }

    const id = setInterval(doFetch, 60_000);
    return () => {
      window.removeEventListener("nav-badges", handler);
      clearInterval(id);
    };
  }, []);

  return badges;
}
