"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Header } from "@/components/Header";

interface Stats {
  buyers: number;
  suppliers: number;
  pending: number;
  approved: number;
  rejected: number;
  mediators: number;
  mediatorPending: number;
  mediatorApproved: number;
  mediatorRejected: number;
}

interface ChangeRequest {
  id: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string;
  reason: string;
  supportingFiles?: string | null;
  status: string;
  createdAt: string;
}

interface Mediator {
  id: string;
  userId: string;
  email: string | null;
  phone: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  commissionRate: number;
  minOrderAmount: number;
  avatarUrl?: string | null;
  passportPhotoUrl?: string | null;
  passSelfiePhotoUrl?: string | null;
  passPhotoUrl?: string | null;
  status: string;
  rejectionReason?: string | null;
  rating?: number | null;
  completedOrdersCount?: number;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  accountExpiresAt?: string | null;
  changeRequests?: ChangeRequest[];
  createdAt: string;
}

interface DbMediatorUser {
  id: string | null;
  userId: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName?: string | null;
  commissionRate: number | null;
  minOrderAmount: number | null;
  avatarUrl?: string | null;
  passportPhotoUrl?: string | null;
  passSelfiePhotoUrl?: string | null;
  passPhotoUrl?: string | null;
  status: string;
  rejectionReason?: string | null;
  rating?: number | null;
  completedOrdersCount?: number;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  accountExpiresAt?: string | null;
  changeRequests?: ChangeRequest[];
  createdAt: string;
  userFirstName?: string | null;
  userLastName?: string | null;
  userPhone?: string | null;
  userAvatarUrl?: string | null;
  userCreatedAt?: string | null;
  blockedAt?: string | null;
}

interface DbMediatorUsersResponse {
  items: DbMediatorUser[];
  total: number;
  page: number;
  pages: number;
}

interface MediatorsResponse {
  items: Mediator[];
  total: number;
  page: number;
  pages: number;
}

interface Supplier {
  id: string;
  userId: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  location: { id: string; name: string };
  pavilionNumber: string;
  entityType: string;
  categories: { id: string; name: string }[];
  inn?: string;
  ogrnip?: string;
  status: string;
  rejectionReason?: string;
  submittedAt?: string;
  createdAt: string;
  passPhotoUrl?: string | null;
  passSelfiePhotoUrl?: string | null;
  passportPhotoUrl?: string | null;
  avatarUrl?: string | null;
  clarification?: string | null;
  accountExpiresAt?: string | null;
}

interface SuppliersResponse {
  items: Supplier[];
  total: number;
  page: number;
  pages: number;
}

interface Buyer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  emailVerified: boolean;
  createdAt: string;
}

interface BuyersResponse {
  items: Buyer[];
  total: number;
  page: number;
  pages: number;
}

interface SupplierUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  createdAt: string;
  blockedAt?: string | null;
  profileStatus: string;
  profileId: string | null;
  pavilionNumber?: string | null;
  locationName?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
}

interface SupplierUsersResponse {
  items: SupplierUser[];
  total: number;
  page: number;
  pages: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NO_PROFILE: { label: "Без профиля", color: "text-gray-500 bg-gray-100" },
  PENDING: { label: "На рассмотрении", color: "text-amber-600 bg-amber-50" },
  NEEDS_REVISION: { label: "Правки", color: "text-orange-600 bg-orange-50" },
  APPROVED: { label: "Одобрен", color: "text-green-600 bg-green-50" },
  FROZEN: { label: "Заморожен", color: "text-blue-600 bg-blue-50" },
  REJECTED: { label: "Отклонён", color: "text-red-600 bg-red-50" },
};

const ENTITY_LABELS: Record<string, string> = {
  INDIVIDUAL: "Физлицо",
  SELF_EMPLOYED: "Самозанятый",
  IP: "ИП",
  OOO: "ООО",
};

interface SupportTicket {
  id: string;
  subject: string;
  status: "OPEN" | "WAITING_USER" | "WAITING_ADMIN" | "CLOSED";
  authorRole: string;
  lastMessageAt: string;
  createdAt: string;
  author: { id: string; email: string; firstName: string; lastName: string; role: string };
  _count?: { messages: number };
}

interface SupportMessage {
  id: string;
  sender: "USER" | "ADMIN" | "SYSTEM";
  text: string;
  createdAt: string;
}

interface SupportTicketDetail {
  id: string;
  subject: string;
  status: "OPEN" | "WAITING_USER" | "WAITING_ADMIN" | "CLOSED";
  messages: SupportMessage[];
  author: { id: string; email: string; firstName: string; lastName: string; role: string };
}

const TICKET_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "🤖 AI-бот", color: "text-blue-600 bg-blue-50" },
  WAITING_USER: { label: "Оператор", color: "text-green-600 bg-green-50" },
  WAITING_ADMIN: { label: "Ждёт оператора", color: "text-red-600 bg-red-50" },
  CLOSED: { label: "Закрыт", color: "text-gray-500 bg-gray-100" },
};

type Tab = "stats" | "suppliers" | "mediators" | "buyers" | "categories" | "ai";

// Компонент для фото-превью с обработкой 404
function PhotoThumb({ url, label, onPreview }: { url: string | null | undefined; label: string; onPreview?: (u: string) => void }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <div className="w-full aspect-[4/3] rounded-xl border border-dashed border-border flex items-center justify-center bg-gray-50">
        <p className="text-[10px] text-muted text-center px-1">{label} — нет</p>
      </div>
    );
  }
  return (
    <button type="button" onClick={() => onPreview?.(url)} className="group block text-left w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="w-full aspect-[4/3] object-cover rounded-xl border border-border group-hover:ring-2 group-hover:ring-primary/40 transition" onError={() => setBroken(true)} />
      <p className="text-[10px] text-muted text-center mt-1 group-hover:text-primary">{label}</p>
    </button>
  );
}

// Аватар с инициалами как fallback при 404
function AvatarImg({ src, initials, className }: { src: string | null | undefined; initials: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className={`rounded-full bg-accent text-muted font-semibold flex items-center justify-center text-xs shrink-0 ${className ?? "w-10 h-10"}`}>
        {initials}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`rounded-full object-cover bg-accent shrink-0 ${className ?? "w-10 h-10"}`} onError={() => setBroken(true)} />
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [suppliers, setSuppliers] = useState<SuppliersResponse | null>(null);
  const [mediators, setMediators] = useState<MediatorsResponse | null>(null);
  const [buyers, setBuyers] = useState<BuyersResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierSubTab, setSupplierSubTab] = useState<"applications" | "chats" | "database">("applications");
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());
  const [supplierUsers, setSupplierUsers] = useState<SupplierUsersResponse | null>(null);
  const [supplierUserSearch, setSupplierUserSearch] = useState("");
  const [supplierTickets, setSupplierTickets] = useState<SupportTicket[]>([]);
  const [supplierTicketTotal, setSupplierTicketTotal] = useState(0);
  const [selectedSupplierTicket, setSelectedSupplierTicket] = useState<SupportTicketDetail | null>(null);
  const [supplierReplyText, setSupplierReplyText] = useState("");
  const [supplierReplySending, setSupplierReplySending] = useState(false);
  const [supplierTicketFilter, setSupplierTicketFilter] = useState("");
  const supplierChatRef = useRef<HTMLDivElement>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [selectedMediator, setSelectedMediator] = useState<string | null>(null);
  const [expandedMediators, setExpandedMediators] = useState<Set<string>>(new Set());
  const [mediatorStatusFilter, setMediatorStatusFilter] = useState("");
  const [mediatorSubTab, setMediatorSubTab] = useState<"applications" | "chats" | "database">("applications");
  const [mediatorTickets, setMediatorTickets] = useState<SupportTicket[]>([]);
  const [mediatorTicketTotal, setMediatorTicketTotal] = useState(0);
  const [selectedMediatorTicket, setSelectedMediatorTicket] = useState<SupportTicketDetail | null>(null);
  const [mediatorReplyText, setMediatorReplyText] = useState("");
  const [mediatorReplySending, setMediatorReplySending] = useState(false);
  const [mediatorTicketFilter, setMediatorTicketFilter] = useState("");
  const mediatorChatRef = useRef<HTMLDivElement>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [decisionModal, setDecisionModal] = useState<{ type: "supplier" | "mediator"; id: string } | null>(null);
  const [expiryModal, setExpiryModal] = useState<{ id: string; currentValue: string } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dbSearch, setDbSearch] = useState("");
  const [dbUsers, setDbUsers] = useState<DbMediatorUsersResponse | null>(null);
  const [dbStatusFilter, setDbStatusFilter] = useState("");
  const [mediatorProfilePanel, setMediatorProfilePanel] = useState<any>(null);
  const [supplierProfilePanel, setSupplierProfilePanel] = useState<Supplier | null>(null);
  const [expandedSupplierDbUsers, setExpandedSupplierDbUsers] = useState<Set<string>>(new Set());
  const [supplierStatusModal, setSupplierStatusModal] = useState<{ user: SupplierUser; profile: Supplier | null } | null>(null);
  const [supplierEditModal, setSupplierEditModal] = useState<{
    userId: string; profileId: string | null;
    field: string; label: string;
    value: string; type: "text" | "email" | "phone" | "select" | "categories";
    options?: { value: string; label: string }[];
    selectedCategories?: string[];
  } | null>(null);
  const [supplierEditLoading, setSupplierEditLoading] = useState(false);
  const [supplierEditValue, setSupplierEditValue] = useState("");
  const [supplierEditCategories, setSupplierEditCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [allCategories, setAllCategories] = useState<{ id: string; name: string }[]>([]);
  const [mediatorEditModal, setMediatorEditModal] = useState<{
    userId: string; profileId: string | null;
    field: string; label: string; value: string;
    type: "text" | "email" | "phone" | "number" | "date";
    suffix?: string; min?: number; max?: number; step?: number;
    presets?: { label: string; value: string }[];
  } | null>(null);
  const [mediatorEditLoading, setMediatorEditLoading] = useState(false);
  const [mediatorEditValue, setMediatorEditValue] = useState("");

  // Support
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportTotal, setSupportTotal] = useState(0);
  const [supportTicketFilter, setSupportTicketFilter] = useState("");
  const [selectedSupportTicket, setSelectedSupportTicket] = useState<SupportTicketDetail | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = localStorage.getItem("admin.token");
    if (!t) {
      router.replace("/login");
      return;
    }
    api.get<Stats>("/admin/stats").then(s => { setStats(s); setPendingCount((s.pending ?? 0) + (s.mediatorPending ?? 0)); }).catch(() => {
      localStorage.removeItem("admin.token");
      router.replace("/login");
    });
    api.get<{ count: number }>("/admin/support/unread-count").then((r) => setUnreadCount(r.count)).catch(() => {});
  }, [router]);

  useEffect(() => {
    if (tab === "suppliers") {
      // Always load ALL suppliers — filtering is done client-side so the total count stays stable
      api.get<SuppliersResponse>(`/admin/suppliers`).then(setSuppliers).catch(() => {});
      api.get<SupplierUsersResponse>(`/admin/supplier-users?limit=100`).then(setSupplierUsers).catch(() => {});
      api.get<{ items: SupportTicket[]; total: number }>(`/admin/support/tickets?role=SUPPLIER&limit=100`).then((r) => {
        setSupplierTickets(r.items);
        setSupplierTicketTotal(r.total);
      }).catch(() => {});
      api.get<{ id: string; name: string }[]>(`/admin/locations`).then(setLocations).catch(() => {});
      api.get<{ id: string; name: string }[]>(`/admin/top-categories`).then(setAllCategories).catch(() => {});
    }
    if (tab === "mediators") {
      api.get<MediatorsResponse>("/admin/mediators?limit=200").then(setMediators).catch(() => {});
      const tq = mediatorTicketFilter ? `?role=MEDIATOR&status=${mediatorTicketFilter}` : "?role=MEDIATOR";
      api.get<{ items: SupportTicket[]; total: number }>(`/admin/support/tickets${tq}&limit=100`).then((r) => {
        setMediatorTickets(r.items);
        setMediatorTicketTotal(r.total);
      }).catch(() => {});
    }
    if (tab === "buyers") {
      api.get<BuyersResponse>("/admin/buyers").then(setBuyers).catch(() => {});
    }
  }, [tab, mediatorTicketFilter]);

  // Fetch DB users for database sub-tab
  const fetchDbUsers = useCallback(() => {
    const params = new URLSearchParams();
    if (dbStatusFilter) params.set("status", dbStatusFilter);
    if (dbSearch.trim()) params.set("search", dbSearch.trim());
    params.set("limit", "200");
    api.get<DbMediatorUsersResponse>(`/admin/mediator-users?${params}`).then(setDbUsers).catch(() => {});
  }, [dbStatusFilter, dbSearch]);

  useEffect(() => {
    if (tab === "mediators" && mediatorSubTab === "database") {
      fetchDbUsers();
    }
  }, [tab, mediatorSubTab, dbStatusFilter, fetchDbUsers]);

  // Сбрасываем фильтр при смене вкладки
  useEffect(() => {
    setStatusFilter("");
    setSupplierSubTab("applications");
    setExpandedSuppliers(new Set());
    setExpandedSupplierDbUsers(new Set());
    setSupplierStatusModal(null);
    setSupplierUsers(null);
    setSupplierUserSearch("");
    setSupplierTickets([]);
    setSelectedSupplierTicket(null);
    setSupplierReplyText("");
    setSupplierReplySending(false);
    setSupplierTicketFilter("");
    setSelectedSupplier(null);
    setSelectedMediator(null);
    setExpandedMediators(new Set());
    setMediatorStatusFilter("");
    setMediatorSubTab("applications");
    setSelectedMediatorTicket(null);
    setMediatorReplyText("");
    setMediatorTicketFilter("");
    setReason("");
    setSelectedSupportTicket(null);
    setSupportTicketFilter("");
    setReplyText("");
    setDbSearch("");
    setDbStatusFilter("");
    setDbUsers(null);
  }, [tab]);

  const handleAction = async (id: string, action: "approve" | "reject" | "revision") => {
    setActionLoading(true);
    try {
      if (action === "approve") {
        await api.post(`/admin/suppliers/${id}/approve`);
      } else if (action === "reject") {
        await api.post(`/admin/suppliers/${id}/reject`, { reason });
      } else {
        await api.post(`/admin/suppliers/${id}/revision`, { reason });
      }
      setReason("");
      setSelectedSupplier(null);
      // Refresh
      api.get<SuppliersResponse>(`/admin/suppliers`).then(setSuppliers);
      api.get<Stats>("/admin/stats").then(s => { setStats(s); setPendingCount((s.pending ?? 0) + (s.mediatorPending ?? 0)); });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMediatorAction = async (
    id: string,
    action: "approve" | "reject" | "revision",
  ) => {
    setActionLoading(true);
    try {
      if (action === "approve") {
        await api.post(`/admin/mediators/${id}/approve`);
      } else if (action === "reject") {
        await api.post(`/admin/mediators/${id}/reject`, { reason });
      } else {
        await api.post(`/admin/mediators/${id}/revision`, { reason });
      }
      setReason("");
      setSelectedMediator(null);
      api.get<MediatorsResponse>("/admin/mediators?limit=200").then(setMediators);
      api.get<Stats>("/admin/stats").then(setStats);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openSupplierTicket = async (id: string) => {
    const detail = await api.get<SupportTicketDetail>(`/admin/support/tickets/${id}`).catch(() => null);
    if (detail) setSelectedSupplierTicket(detail);
    // mark as waiting-user
    api.patch(`/admin/support/tickets/${id}`, { status: "WAITING_USER" }).catch(() => {});
    // refresh tickets
    api.get<{ items: SupportTicket[]; total: number }>(`/admin/support/tickets?role=SUPPLIER&limit=100`).then((r) => { setSupplierTickets(r.items); setSupplierTicketTotal(r.total); }).catch(() => {});
  };

  const sendSupplierReply = async () => {
    if (!selectedSupplierTicket || !supplierReplyText.trim()) return;
    setSupplierReplySending(true);
    try {
      await api.post(`/admin/support/tickets/${selectedSupplierTicket.id}/messages`, { text: supplierReplyText.trim() });
      setSupplierReplyText("");
      const detail = await api.get<SupportTicketDetail>(`/admin/support/tickets/${selectedSupplierTicket.id}`);
      setSelectedSupplierTicket(detail);
      setTimeout(() => supplierChatRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { /* ignore */ } finally {
      setSupplierReplySending(false);
    }
  };

  const closeSupplierTicket = async () => {
    if (!selectedSupplierTicket) return;
    await api.patch(`/admin/support/tickets/${selectedSupplierTicket.id}`, { status: "CLOSED" }).catch(() => {});
    const detail = await api.get<SupportTicketDetail>(`/admin/support/tickets/${selectedSupplierTicket.id}`).catch(() => null);
    if (detail) setSelectedSupplierTicket(detail);
    api.get<{ items: SupportTicket[]; total: number }>(`/admin/support/tickets?role=SUPPLIER&limit=100`).then((r) => { setSupplierTickets(r.items); setSupplierTicketTotal(r.total); }).catch(() => {});
  };

  const refreshMediators = () => {
    api.get<MediatorsResponse>("/admin/mediators?limit=200").then(setMediators);
    api.get<Stats>("/admin/stats").then(setStats);
  };

  const handleUpdateMediatorField = async (id: string, field: string, value: string) => {
    setActionLoading(true);
    try {
      const data: Record<string, unknown> = {};
      if (field === "commissionRate") data.commissionRate = Number(value);
      if (field === "minOrderAmount") data.minOrderAmount = Number(value);
      if (field === "accountExpiresAt") data.accountExpiresAt = value || null;
      await api.patch(`/admin/mediators/${id}`, data);
      setEditingField(null);
      setEditValue("");
      refreshMediators();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRequest = async (mediatorId: string, requestId: string, decision: "approve" | "reject") => {
    setActionLoading(true);
    try {
      await api.post(`/admin/mediators/${mediatorId}/change-requests/${requestId}/${decision}`);
      refreshMediators();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const addDaysFromNow = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const daysRemaining = (dateStr: string) => {
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  };

  const handleBlockUser = async (userId: string) => {
    if (!confirm("Заблокировать этого пользователя? Он не сможет войти.")) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/users/${userId}/block`);
      fetchDbUsers();
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  const handleUnblockUser = async (userId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/admin/users/${userId}/unblock`);
      fetchDbUsers();
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Удалить пользователя безвозвратно? Все данные будут утеряны. Это действие нельзя отменить.")) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/users/${userId}`);
      fetchDbUsers();
    } catch (e: any) { alert(e.message); }
    finally { setActionLoading(false); }
  };

  const openSupplierProfilePanel = (userId: string) => {
    const s = suppliers?.items.find(x => x.userId === userId);
    if (s) setSupplierProfilePanel(s);
  };

  const enableBotInSupplierTicket = async () => {
    if (!selectedSupplierTicket) return;
    if (!confirm("Включить AI-бота обратно? Ваши сообщения будут удалены из чата.")) return;
    await api.post(`/admin/support/tickets/${selectedSupplierTicket.id}/enable-bot`);
    openSupplierTicket(selectedSupplierTicket.id);
  };

  const openSupplierEdit = (
    userId: string, profileId: string | null,
    field: string, label: string,
    currentValue: string,
    type: "text" | "email" | "phone" | "select" | "categories",
    options?: { value: string; label: string }[],
    selectedCategories?: string[],
  ) => {
    setSupplierEditValue(currentValue);
    setSupplierEditCategories(selectedCategories ?? []);
    setSupplierEditModal({ userId, profileId, field, label, value: currentValue, type, options, selectedCategories });
  };

  const handleSupplierEditSave = async () => {
    if (!supplierEditModal) return;
    setSupplierEditLoading(true);
    const { userId, profileId, field } = supplierEditModal;
    const rawValue = supplierEditValue.trim();
    try {
      // User-only fields
      if (["firstName", "lastName", "middleName", "phone", "email"].includes(field)) {
        await api.patch(`/admin/users/${userId}/data`, { [field]: rawValue || null });
      }
      // Profile-only fields (including synced name fields)
      if (profileId) {
        if (["firstName", "lastName", "middleName"].includes(field)) {
          await api.patch(`/admin/suppliers/${profileId}/profile`, { [field]: rawValue || null });
        } else if (field === "locationId") {
          await api.patch(`/admin/suppliers/${profileId}/profile`, { locationId: rawValue });
        } else if (field === "entityType") {
          await api.patch(`/admin/suppliers/${profileId}/profile`, { entityType: rawValue });
        } else if (field === "pavilionNumber") {
          // Preserve brand name on second line
          const cur = suppliers?.items.find(s => s.id === profileId);
          const brandPart = cur?.pavilionNumber?.includes("\n")
            ? "\n" + cur.pavilionNumber.split("\n").slice(1).join("\n")
            : "";
          await api.patch(`/admin/suppliers/${profileId}/profile`, { pavilionNumber: rawValue + brandPart });
        } else if (field === "brandName") {
          // Preserve pavilion number on first line
          const cur = suppliers?.items.find(s => s.id === profileId);
          const firstLine = cur?.pavilionNumber?.split("\n")[0] ?? "";
          const newPavilion = rawValue ? `${firstLine}\n${rawValue}` : firstLine;
          await api.patch(`/admin/suppliers/${profileId}/profile`, { pavilionNumber: newPavilion });
        } else if (field === "inn" || field === "ogrnip") {
          await api.patch(`/admin/suppliers/${profileId}/profile`, { [field]: rawValue || null });
        } else if (field === "categoryIds") {
          await api.patch(`/admin/suppliers/${profileId}/profile`, { categoryIds: supplierEditCategories });
        }
      }
      // Refresh both lists
      api.get<SuppliersResponse>(`/admin/suppliers`).then(setSuppliers).catch(() => {});
      api.get<SupplierUsersResponse>(`/admin/supplier-users?limit=100`).then(setSupplierUsers).catch(() => {});
      setSupplierEditModal(null);
    } catch (e: any) {
      alert(e.message ?? "Ошибка сохранения");
    } finally {
      setSupplierEditLoading(false);
    }
  };

  const openMediatorEdit = (
    userId: string, profileId: string | null,
    field: string, label: string, currentValue: string,
    type: "text" | "email" | "phone" | "number" | "date",
    opts?: { suffix?: string; min?: number; max?: number; step?: number; presets?: { label: string; value: string }[] },
  ) => {
    setMediatorEditValue(currentValue);
    setMediatorEditModal({ userId, profileId, field, label, value: currentValue, type, ...opts });
  };

  const handleMediatorEditSave = async () => {
    if (!mediatorEditModal) return;
    setMediatorEditLoading(true);
    const { userId, profileId, field } = mediatorEditModal;
    const raw = mediatorEditValue.trim();
    try {
      const userFields = ["firstName", "lastName", "middleName", "phone", "email"];
      if (userFields.includes(field)) {
        await api.patch(`/admin/users/${userId}/data`, { [field]: raw || null });
      }
      if (profileId && ["commissionRate", "minOrderAmount", "accountExpiresAt"].includes(field)) {
        if (field === "commissionRate")   await api.patch(`/admin/mediators/${profileId}`, { commissionRate:   Number(raw) });
        if (field === "minOrderAmount")   await api.patch(`/admin/mediators/${profileId}`, { minOrderAmount:   Number(raw) });
        if (field === "accountExpiresAt") await api.patch(`/admin/mediators/${profileId}`, { accountExpiresAt: raw || null });
      }
      api.get<MediatorsResponse>("/admin/mediators?limit=200").then(setMediators).catch(() => {});
      fetchDbUsers();
      setMediatorEditModal(null);
    } catch (e: any) { alert(e.message ?? "Ошибка"); }
    finally { setMediatorEditLoading(false); }
  };

  const openMediatorProfilePanel = async (userId: string) => {
    try {
      const data = await api.get<any>(`/admin/mediators/by-user/${userId}`);
      setMediatorProfilePanel(data);
    } catch {
      // no profile
    }
  };

  const enableBotInMediatorTicket = async () => {
    if (!selectedMediatorTicket) return;
    if (!confirm("Включить AI-бота обратно? Ваши сообщения будут удалены из чата.")) return;
    await api.post(`/admin/support/tickets/${selectedMediatorTicket.id}/enable-bot`);
    openMediatorTicket(selectedMediatorTicket.id);
  };

  // ——— Support helpers ———
  const openSupportTicket = async (id: string) => {
    const data = await api.get<SupportTicketDetail>(`/admin/support/tickets/${id}`);
    setSelectedSupportTicket(data);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedSupportTicket) return;
    setReplySending(true);
    try {
      await api.post(`/admin/support/tickets/${selectedSupportTicket.id}/reply`, { text: replyText.trim() });
      setReplyText("");
      await openSupportTicket(selectedSupportTicket.id);
      // refresh list
      const q = supportTicketFilter ? `?status=${supportTicketFilter}` : "";
      api.get<{ items: SupportTicket[]; total: number }>(`/admin/support/tickets${q}`).then((r) => {
        setSupportTickets(r.items);
        setSupportTotal(r.total);
      });
      api.get<{ count: number }>("/admin/support/unread-count").then((r) => setUnreadCount(r.count)).catch(() => {});
    } catch {
      // ignore
    } finally {
      setReplySending(false);
    }
  };

  const closeSupportTicket = async () => {
    if (!selectedSupportTicket) return;
    await api.post(`/admin/support/tickets/${selectedSupportTicket.id}/close`);
    setSelectedSupportTicket(null);
    const q = supportTicketFilter ? `?status=${supportTicketFilter}` : "";
    api.get<{ items: SupportTicket[]; total: number }>(`/admin/support/tickets${q}`).then((r) => {
      setSupportTickets(r.items);
      setSupportTotal(r.total);
    });
    api.get<{ count: number }>("/admin/support/unread-count").then((r) => setUnreadCount(r.count)).catch(() => {});
  };

  const enableBotInTicket = async () => {
    if (!selectedSupportTicket) return;
    if (!confirm("Включить AI-бота обратно? Ваши сообщения будут удалены из чата.")) return;
    await api.post(`/admin/support/tickets/${selectedSupportTicket.id}/enable-bot`);
    openSupportTicket(selectedSupportTicket.id);
  };

  // ——— Mediator chat helpers ———
  const refreshMediatorTickets = () => {
    const tq = mediatorTicketFilter ? `?role=MEDIATOR&status=${mediatorTicketFilter}` : "?role=MEDIATOR";
    api.get<{ items: SupportTicket[]; total: number }>(`/admin/support/tickets${tq}&limit=100`).then((r) => {
      setMediatorTickets(r.items);
      setMediatorTicketTotal(r.total);
    }).catch(() => {});
  };

  const openMediatorTicket = async (id: string) => {
    const data = await api.get<SupportTicketDetail>(`/admin/support/tickets/${id}`);
    setSelectedMediatorTicket(data);
    setTimeout(() => mediatorChatRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendMediatorReply = async () => {
    if (!mediatorReplyText.trim() || !selectedMediatorTicket) return;
    setMediatorReplySending(true);
    try {
      await api.post(`/admin/support/tickets/${selectedMediatorTicket.id}/reply`, { text: mediatorReplyText.trim() });
      setMediatorReplyText("");
      await openMediatorTicket(selectedMediatorTicket.id);
      refreshMediatorTickets();
      api.get<{ count: number }>("/admin/support/unread-count").then((r) => setUnreadCount(r.count)).catch(() => {});
    } catch {
      // ignore
    } finally {
      setMediatorReplySending(false);
    }
  };

  const closeMediatorTicket = async () => {
    if (!selectedMediatorTicket) return;
    await api.post(`/admin/support/tickets/${selectedMediatorTicket.id}/close`);
    setSelectedMediatorTicket(null);
    refreshMediatorTickets();
    api.get<{ count: number }>("/admin/support/unread-count").then((r) => setUnreadCount(r.count)).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab={tab} onTabChange={setTab} unreadCount={unreadCount} pendingCount={pendingCount} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Обзор */}
        {tab === "stats" && stats && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
                Покупатели
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Всего" value={stats.buyers} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
                Поставщики
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Всего" value={stats.suppliers} />
                <StatCard label="На рассмотрении" value={stats.pending} color="text-amber-600" />
                <StatCard label="Одобрено" value={stats.approved} color="text-green-600" />
                <StatCard label="Отклонено" value={stats.rejected} color="text-red-600" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
                Посредники
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Всего" value={stats.mediators} />
                <StatCard label="На рассмотрении" value={stats.mediatorPending} color="text-amber-600" />
                <StatCard label="Одобрено" value={stats.mediatorApproved} color="text-green-600" />
                <StatCard label="Отклонено" value={stats.mediatorRejected} color="text-red-600" />
              </div>
            </div>
          </div>
        )}

        {/* Поставщики */}
        {tab === "suppliers" && (
          <div>
            {/* Sub-tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-border">
              {([
                { key: "applications" as const, label: "Заявки", count: suppliers?.total ?? 0 },
                { key: "chats" as const, label: "Чаты", count: supplierTickets.filter(t => t.status === "WAITING_ADMIN").length },
                { key: "database" as const, label: "База данных", count: supplierUsers?.total ?? 0 },
              ] as const).map((st) => (
                <button
                  key={st.key}
                  onClick={() => { setSupplierSubTab(st.key); setSelectedSupplierTicket(null); }}
                  className={`relative px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                    supplierSubTab === st.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {st.label}
                  {st.count > 0 && (
                    <span className={`ml-1.5 text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center ${
                      supplierSubTab === st.key ? "bg-primary text-white" : "bg-red-500 text-white"
                    }`}>{st.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ===== SUB-TAB: Заявки ===== */}
            {supplierSubTab === "applications" && (() => {
              const allItems = suppliers?.items ?? [];
              const FILTER_TABS = [
                { key: "", label: "Все", badgeBg: "bg-gray-500" },
                { key: "PENDING", label: "На рассмотрении", badgeBg: "bg-amber-500" },
                { key: "NEEDS_REVISION", label: "Правки", badgeBg: "bg-orange-500" },
                { key: "APPROVED", label: "Одобренные", badgeBg: "bg-green-600" },
                { key: "REJECTED", label: "Отклонённые", badgeBg: "bg-red-500" },
              ];
              const counts: Record<string, number> = { "": allItems.length, PENDING: 0, NEEDS_REVISION: 0, APPROVED: 0, REJECTED: 0 };
              allItems.forEach(s => { if (counts[s.status] !== undefined) counts[s.status]++; });
              const filtered = statusFilter ? allItems.filter(s => s.status === statusFilter) : allItems;

              const toggleExpand = (id: string) => {
                setExpandedSuppliers(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) { next.delete(id); if (selectedSupplier === id) { setSelectedSupplier(null); setReason(""); } }
                  else next.add(id);
                  return next;
                });
              };

              return (
                <div>
                  {/* Filter tabs */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {FILTER_TABS.map(t => {
                      const c = counts[t.key] ?? 0;
                      const active = statusFilter === t.key;
                      return (
                        <button key={t.key} onClick={() => { setStatusFilter(t.key); setSelectedSupplier(null); setReason(""); setExpandedSuppliers(new Set()); }}
                          className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition font-medium ${active ? "border-primary bg-primary text-white shadow-sm" : "border-border bg-card hover:bg-accent"}`}>
                          {t.label}
                          {c > 0 && <span className={`${active ? "bg-white/25" : t.badgeBg} text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center`}>{c}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {filtered.length > 0 && (
                    <div className="flex items-center gap-3 mb-4 text-xs">
                      <button onClick={() => setExpandedSuppliers(new Set(filtered.map(s => s.id)))} className="text-primary hover:underline">Развернуть все</button>
                      <span className="text-border">|</span>
                      <button onClick={() => { setExpandedSuppliers(new Set()); setSelectedSupplier(null); setReason(""); }} className="text-muted hover:underline">Свернуть все</button>
                      <span className="ml-auto text-muted">{filtered.length} заявок</span>
                    </div>
                  )}
                  {filtered.length === 0 && <p className="text-muted text-center py-12">Нет заявок</p>}

                  {/* Image preview modal */}
                  {imagePreview && (
                    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setImagePreview(null)}>
                      <div className="relative max-w-3xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
                        <button onClick={() => setImagePreview(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <a href={imagePreview} target="_blank" rel="noreferrer" className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white shadow-lg text-xs font-medium text-primary hover:bg-gray-50">Открыть оригинал</a>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {filtered.map(s => {
                      const st = STATUS_LABELS[s.status];
                      const isExpanded = expandedSuppliers.has(s.id);
                      const isActionsOpen = selectedSupplier === s.id;
                      return (
                        <div key={s.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                          {/* Collapsed header */}
                          <button type="button" onClick={() => toggleExpand(s.id)} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-accent/50 transition">
                            {s.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-accent shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-accent text-muted font-semibold flex items-center justify-center text-xs shrink-0">
                                {s.firstName[0]}{s.lastName[0]}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{s.lastName} {s.firstName} {s.middleName ?? ""}</p>
                              <p className="text-xs text-muted truncate">{s.email} · {s.phone}</p>
                            </div>
                            <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full shrink-0 ${st?.color ?? ""}`}>{st?.label ?? s.status}</span>
                            <span className="text-xs text-muted shrink-0 hidden sm:block">{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString("ru-RU") : ""}</span>
                            <svg className={`w-4 h-4 text-muted shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>

                          {/* Expanded body */}
                          {isExpanded && (
                            <div className="border-t border-border px-5 py-4 space-y-4">
                              {/* Main info grid */}
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div><span className="text-muted text-xs block">Телефон</span><span className="font-medium">{s.phone}</span></div>
                                <div><span className="text-muted text-xs block">Email</span><span className="font-medium text-xs">{s.email}</span></div>
                                <div><span className="text-muted text-xs block">Форма</span><span className="font-medium">{ENTITY_LABELS[s.entityType] ?? s.entityType}</span></div>
                                <div><span className="text-muted text-xs block">Рынок</span><span className="font-medium">{s.location.name}</span></div>
                                <div><span className="text-muted text-xs block">Павильон</span><span className="font-medium">{s.pavilionNumber}</span></div>
                                {s.inn && <div><span className="text-muted text-xs block">ИНН</span><span className="font-medium">{s.inn}</span></div>}
                                {s.ogrnip && <div><span className="text-muted text-xs block">ОГРНИП/ОГРН</span><span className="font-medium">{s.ogrnip}</span></div>}
                              </div>

                              {/* Categories */}
                              <div>
                                <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">Категории товаров</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {s.categories.map(c => (
                                    <span key={c.id} className="text-xs px-2.5 py-1 rounded-full bg-accent border border-border">{c.name}</span>
                                  ))}
                                </div>
                              </div>

                              {/* Address (clarification) */}
                              {s.clarification && (
                                <div>
                                  <p className="text-xs font-semibold text-muted mb-1 uppercase tracking-wider">Адрес торговой точки</p>
                                  <p className="text-sm text-foreground bg-accent rounded-xl px-3 py-2">{s.clarification}</p>
                                </div>
                              )}

                              {/* Pass expiry */}
                              {s.accountExpiresAt && (
                                <div>
                                  <p className="text-xs font-semibold text-muted mb-1 uppercase tracking-wider">Срок действия пропуска</p>
                                  <span className={`text-sm font-semibold ${new Date(s.accountExpiresAt) < new Date() ? "text-red-600" : new Date(s.accountExpiresAt) < new Date(Date.now() + 30 * 86400000) ? "text-amber-600" : "text-green-600"}`}>
                                    {new Date(s.accountExpiresAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                                  </span>
                                </div>
                              )}

                              {/* Documents */}
                              <div>
                                <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">Документы</p>
                                <div className="grid grid-cols-2 gap-3">
                                  {[
                                    { url: s.passPhotoUrl, label: "Паспорт (разворот)" },
                                    { url: s.passSelfiePhotoUrl, label: "Селфи с паспортом" },
                                  ].map(({ url, label }) =>
                                    url ? (
                                      <button key={label} type="button" onClick={() => setImagePreview(url)} className="group block text-left">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt={label} className="w-full aspect-[4/3] object-cover rounded-xl border border-border group-hover:ring-2 group-hover:ring-primary/40 transition" />
                                        <p className="text-[10px] text-muted text-center mt-1 group-hover:text-primary">{label}</p>
                                      </button>
                                    ) : (
                                      <div key={label} className="w-full aspect-[4/3] rounded-xl border border-dashed border-border flex items-center justify-center bg-gray-50">
                                        <p className="text-[10px] text-muted">{label} — нет</p>
                                      </div>
                                    )
                                  )}
                                </div>
                                {s.avatarUrl ? (
                                  <div className="mt-3 flex items-center gap-3">
                                    <button type="button" onClick={() => setImagePreview(s.avatarUrl!)} className="group flex items-center gap-3">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={s.avatarUrl} alt="Биометрическое фото" className="w-14 h-14 rounded-full object-cover border-2 border-border group-hover:ring-2 group-hover:ring-primary/40 transition" />
                                      <p className="text-xs text-muted group-hover:text-primary">Биометрическое фото</p>
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-muted mt-2">Биометрическое фото — нет</p>
                                )}
                              </div>

                              {/* Rejection reason */}
                              {s.rejectionReason && (
                                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                                  <p className="text-xs font-semibold text-orange-700 mb-0.5">Комментарий администратора:</p>
                                  <p className="text-sm text-orange-800">{s.rejectionReason}</p>
                                </div>
                              )}

                              {/* Actions */}
                              {s.status !== "APPROVED" && (
                                <div className="border-t border-border pt-4">
                                  <button
                                    onClick={() => { setDecisionModal({ type: "supplier", id: s.id }); setReason(""); }}
                                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition"
                                  >
                                    Принять решение
                                  </button>
                                </div>
                              )}

                              <p className="text-xs text-muted">Заявка подана: {s.submittedAt ? new Date(s.submittedAt).toLocaleString("ru-RU") : "—"}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ===== SUB-TAB: Чаты (поставщики) ===== */}
            {supplierSubTab === "chats" && (
              <div className="flex border border-border rounded-2xl overflow-hidden bg-card" style={{ height: "calc(100vh - 260px)", minHeight: 480 }}>
                {/* LEFT: Ticket list sidebar */}
                <div className="w-[340px] shrink-0 border-r border-border flex flex-col">
                  {/* Filter bar */}
                  <div className="p-3 border-b border-border flex flex-wrap gap-1">
                    {["", "WAITING_ADMIN", "WAITING_USER", "CLOSED"].map((s) => (
                      <button key={s} onClick={() => setSupplierTicketFilter(s)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${supplierTicketFilter === s ? "border-primary bg-primary text-white" : "border-border hover:bg-accent"}`}>
                        {s === "" ? "Все" : TICKET_STATUS_LABELS[s]?.label ?? s}
                      </button>
                    ))}
                  </div>
                  {/* Ticket list */}
                  <div className="flex-1 overflow-y-auto">
                    {supplierTickets.length === 0 ? (
                      <p className="text-muted text-center py-12 text-sm">Нет чатов</p>
                    ) : (
                      supplierTickets.filter(t => !supplierTicketFilter || t.status === supplierTicketFilter).map((t) => {
                        const tst = TICKET_STATUS_LABELS[t.status] ?? TICKET_STATUS_LABELS.OPEN;
                        const isActive = selectedSupplierTicket?.id === t.id;
                        const isWaiting = t.status === "WAITING_ADMIN";
                        return (
                          <button key={t.id} onClick={() => openSupplierTicket(t.id)}
                            className={`w-full text-left px-4 py-3 border-b border-border/50 transition ${isActive ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-accent/50"}`}>
                            <div className="flex items-center gap-2">
                              {/* Avatar */}
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${isWaiting ? "bg-red-100 text-red-600" : "bg-accent text-muted"}`}>
                                {t.author.firstName[0]}{t.author.lastName[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-medium text-sm truncate">{t.author.firstName} {t.author.lastName}</span>
                                  <span className="text-[10px] text-muted shrink-0">{new Date(t.lastMessageAt).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                                <div className="flex items-center justify-between gap-1 mt-0.5">
                                  <span className="text-xs text-muted truncate">{t.subject}</span>
                                  {isWaiting && <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="p-2 border-t border-border text-[11px] text-muted text-center">{supplierTicketTotal} чатов</div>
                </div>

                {/* RIGHT: Chat area */}
                <div className="flex-1 flex flex-col min-w-0">
                  {!selectedSupplierTicket ? (
                    <div className="flex-1 flex items-center justify-center text-muted">
                      <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <p className="text-sm">Выберите чат слева</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Chat header */}
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-background/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-accent text-muted font-bold text-[11px] flex items-center justify-center shrink-0">
                            {selectedSupplierTicket.author.firstName[0]}{selectedSupplierTicket.author.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{selectedSupplierTicket.author.firstName} {selectedSupplierTicket.author.lastName}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${TICKET_STATUS_LABELS[selectedSupplierTicket.status]?.color ?? ""}`}>{TICKET_STATUS_LABELS[selectedSupplierTicket.status]?.label ?? selectedSupplierTicket.status}</span>
                              <span className="text-[11px] text-muted truncate">{selectedSupplierTicket.subject}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => openSupplierProfilePanel(selectedSupplierTicket.author.id)} className="text-xs text-muted hover:text-foreground transition px-2 py-1 rounded-lg hover:bg-accent border border-border">👤 Профиль</button>
                          {selectedSupplierTicket.status !== "CLOSED" && selectedSupplierTicket.messages.some((msg: any) => msg.sender === "ADMIN") && (
                            <button onClick={enableBotInSupplierTicket} className="text-xs text-blue-600 hover:text-blue-800 transition px-2 py-1 rounded-lg hover:bg-blue-50 border border-blue-200">🤖 Боту</button>
                          )}
                          {selectedSupplierTicket.status !== "CLOSED" && (
                            <button onClick={closeSupplierTicket} className="text-xs text-muted hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">Закрыть</button>
                          )}
                        </div>
                      </div>
                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                        {selectedSupplierTicket.messages.map((msg) => {
                          const isAdmin = msg.sender === "ADMIN";
                          const isSystem = msg.sender === "SYSTEM";
                          return (
                            <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[70%] px-3.5 py-2 text-sm ${
                                isSystem ? "bg-blue-50 text-blue-800 rounded-xl w-full max-w-full border border-blue-100" :
                                isAdmin ? "bg-primary text-white rounded-2xl rounded-br-md" :
                                "bg-accent rounded-2xl rounded-bl-md"
                              }`}>
                                {isSystem && <p className="text-[10px] font-semibold text-blue-500 mb-1">🤖 GloBox Бот</p>}
                                {!isAdmin && !isSystem && <p className="text-[10px] font-semibold text-orange-600 mb-0.5">Поставщик</p>}
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                <p className={`text-[10px] mt-1 text-right ${isAdmin ? "text-white/60" : "text-muted"}`}>{new Date(msg.createdAt).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={supplierChatRef} />
                      </div>
                      {/* Input */}
                      {selectedSupplierTicket.status !== "CLOSED" ? (
                        <div className="p-3 border-t border-border flex gap-2 bg-background/50">
                          <input value={supplierReplyText} onChange={(e) => setSupplierReplyText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendSupplierReply(); } }}
                            placeholder="Написать ответ..." maxLength={5000}
                            className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          <button onClick={sendSupplierReply} disabled={supplierReplySending || !supplierReplyText.trim()}
                            className="px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 border-t border-border text-center text-sm text-muted bg-gray-50">Чат закрыт</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ===== SUB-TAB: База данных (поставщики) ===== */}
            {supplierSubTab === "database" && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <input
                    value={supplierUserSearch}
                    onChange={(e) => {
                      setSupplierUserSearch(e.target.value);
                      const q = e.target.value.trim()
                        ? `?search=${encodeURIComponent(e.target.value.trim())}&limit=100`
                        : "?limit=100";
                      api.get<SupplierUsersResponse>(`/admin/supplier-users${q}`).then(setSupplierUsers).catch(() => {});
                    }}
                    placeholder="Поиск по имени, email, телефону…"
                    className="flex-1 border border-border rounded-xl px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-sm text-muted shrink-0">{supplierUsers?.total ?? 0} чел.</span>
                </div>

                {supplierUsers && supplierUsers.items.length === 0 && (
                  <p className="text-muted text-center py-12">Нет зарегистрированных поставщиков</p>
                )}

                <div className="space-y-2">
                  {supplierUsers?.items.map((u) => {
                    const st = STATUS_LABELS[u.profileStatus];
                    const profile = suppliers?.items.find(s => s.userId === u.id) ?? null;
                    const isExpanded = expandedSupplierDbUsers.has(u.id);
                    const initials = `${u.firstName?.[0] ?? "?"}${u.lastName?.[0] ?? ""}`;
                    const brandName = profile?.pavilionNumber?.includes("\n")
                      ? profile.pavilionNumber.split("\n").slice(1).join(" ").replace(/^Вывеска:\s*/i, "").trim()
                      : null;

                    const toggleExpand = () => setExpandedSupplierDbUsers(prev => {
                      const next = new Set(prev);
                      next.has(u.id) ? next.delete(u.id) : next.add(u.id);
                      return next;
                    });

                    return (
                      <div key={u.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        {/* ── Collapsed header ── */}
                        <button type="button" onClick={toggleExpand} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-accent/50 transition">
                          <AvatarImg src={profile?.avatarUrl} initials={initials} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {u.lastName ?? ""} {u.firstName ?? ""}
                              {(!u.firstName && !u.lastName) && <span className="text-muted italic font-normal">Без имени</span>}
                            </p>
                            <p className="text-xs text-muted truncate">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                          </div>
                          <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full shrink-0 ${st?.color ?? "text-gray-500 bg-gray-100"}`}>{st?.label ?? u.profileStatus}</span>
                          {u.blockedAt && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">Блок</span>}
                          <span className="text-xs text-muted shrink-0 hidden sm:block">{new Date(u.createdAt).toLocaleDateString("ru-RU")}</span>
                          <svg className={`w-4 h-4 text-muted shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {/* ── Expanded body ── */}
                        {isExpanded && (
                          <div className="border-t border-border px-5 py-4 space-y-5">
                            {/* helper: editable field */}
                            {(() => {
                              const pid = profile?.id ?? null;
                              const EditBtn = ({ field, label, value, type, options, cats }: {
                                field: string; label: string; value: string;
                                type: "text"|"email"|"phone"|"select"|"categories";
                                options?: {value:string;label:string}[]; cats?: string[];
                              }) => (
                                <button type="button" onClick={() => openSupplierEdit(u.id, pid, field, label, value, type, options, cats)}
                                  className="group font-medium text-sm flex items-center gap-1 hover:text-primary transition text-left w-full">
                                  <span className="truncate">{value || <span className="text-muted italic font-normal">не указано</span>}</span>
                                  <svg className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                              );
                              const entityOpts = Object.entries(ENTITY_LABELS).map(([v,l]) => ({ value: v, label: l }));
                              const locationOpts = locations.map(l => ({ value: l.id, label: l.name }));

                              return (
                                <>
                                  {/* Личные данные */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted mb-3 uppercase tracking-wider">Личные данные</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                      <div><span className="text-muted text-xs block mb-0.5">Фамилия</span><EditBtn field="lastName"   label="Фамилия" value={u.lastName ?? ""}   type="text" /></div>
                                      <div><span className="text-muted text-xs block mb-0.5">Имя</span><EditBtn field="firstName" label="Имя"      value={u.firstName ?? ""} type="text" /></div>
                                      <div><span className="text-muted text-xs block mb-0.5">Телефон</span><EditBtn field="phone" label="Телефон" value={u.phone ?? ""} type="phone" /></div>
                                      <div className="md:col-span-2"><span className="text-muted text-xs block mb-0.5">Email</span><EditBtn field="email" label="Email" value={u.email} type="email" /></div>
                                      <div><span className="text-muted text-xs block mb-0.5">ID</span><span className="font-mono text-[10px] text-muted break-all">{u.id}</span></div>
                                    </div>
                                  </div>

                                  {/* Нет профиля */}
                                  {!profile && (
                                    <div className="bg-gray-50 border border-dashed border-border rounded-xl px-4 py-3 text-center text-sm text-muted">
                                      Поставщик не заполнил профиль верификации
                                    </div>
                                  )}

                                  {/* Торговля */}
                                  {profile && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted mb-3 uppercase tracking-wider">Торговля</p>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                        <div><span className="text-muted text-xs block mb-0.5">Рынок</span><EditBtn field="locationId" label="Рынок" value={profile.location?.name ?? ""} type="select" options={locationOpts} /></div>
                                        <div><span className="text-muted text-xs block mb-0.5">Павильон</span><EditBtn field="pavilionNumber" label="Номер павильона" value={profile.pavilionNumber?.split("\n")[0] ?? ""} type="text" /></div>
                                        <div><span className="text-muted text-xs block mb-0.5">Название магазина</span><EditBtn field="brandName" label="Название магазина / бренда" value={brandName ?? ""} type="text" /></div>
                                        <div><span className="text-muted text-xs block mb-0.5">Форма</span><EditBtn field="entityType" label="Форма собственности" value={ENTITY_LABELS[profile.entityType] ?? profile.entityType} type="select" options={entityOpts} /></div>
                                        <div><span className="text-muted text-xs block mb-0.5">ИНН</span><EditBtn field="inn" label="ИНН" value={profile.inn ?? ""} type="text" /></div>
                                        <div><span className="text-muted text-xs block mb-0.5">ОГРНИП/ОГРН</span><EditBtn field="ogrnip" label="ОГРНИП / ОГРН" value={profile.ogrnip ?? ""} type="text" /></div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Категории */}
                                  {profile && (
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Категории ({profile.categories.length})</p>
                                        <button onClick={() => openSupplierEdit(u.id, pid, "categoryIds", "Категории товаров", "", "categories", undefined, profile.categories.map(c => c.id))}
                                          className="text-xs text-primary hover:underline flex items-center gap-1">
                                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                          Изменить
                                        </button>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {profile.categories.length > 0
                                          ? profile.categories.map(c => <span key={c.id} className="text-xs px-2.5 py-1 rounded-full bg-accent border border-border">{c.name}</span>)
                                          : <span className="text-xs text-muted italic">Не выбраны</span>}
                                      </div>
                                    </div>
                                  )}

                                  {/* Статус */}
                                  {profile && (
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Статус заявки</p>
                                        <button onClick={() => setSupplierStatusModal({ user: u, profile })}
                                          className="text-xs text-primary hover:underline flex items-center gap-1">
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                          История заявки
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st?.color ?? "text-gray-500 bg-gray-100"}`}>{st?.label ?? u.profileStatus}</span>
                                        {profile.rejectionReason && (
                                          <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1 max-w-xs truncate">{profile.rejectionReason}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Документы */}
                                  {profile && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">Документы и фото</p>
                                      <div className="grid grid-cols-3 gap-3">
                                        <PhotoThumb url={profile.passPhotoUrl} label="Паспорт (разворот)" onPreview={setImagePreview} />
                                        <PhotoThumb url={profile.passSelfiePhotoUrl} label="Селфи с паспортом" onPreview={setImagePreview} />
                                        <PhotoThumb url={profile.avatarUrl} label="Биометрическое фото" onPreview={setImagePreview} />
                                      </div>
                                    </div>
                                  )}

                                  {/* Хронология */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">Хронология</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                      <div><span className="text-muted text-xs block">Регистрация</span><span className="font-medium text-xs">{new Date(u.createdAt).toLocaleString("ru-RU")}</span></div>
                                      {u.submittedAt && <div><span className="text-muted text-xs block">Заявка подана</span><span className="font-medium text-xs">{new Date(u.submittedAt).toLocaleString("ru-RU")}</span></div>}
                                      {u.approvedAt && <div><span className="text-muted text-xs block">Одобрен</span><span className="font-medium text-xs text-green-600">{new Date(u.approvedAt).toLocaleString("ru-RU")}</span></div>}
                                      {u.blockedAt && <div><span className="text-muted text-xs block">Заблокирован</span><span className="font-medium text-xs text-red-600">{new Date(u.blockedAt).toLocaleString("ru-RU")}</span></div>}
                                    </div>
                                  </div>

                                  {/* Действия */}
                                  <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                                    {u.blockedAt ? (
                                      <button onClick={() => handleUnblockUser(u.id)} disabled={actionLoading}
                                        className="px-4 py-2 rounded-xl border border-green-300 text-green-700 text-xs font-medium hover:bg-green-50 transition disabled:opacity-50">✅ Разблокировать</button>
                                    ) : (
                                      <button onClick={() => handleBlockUser(u.id)} disabled={actionLoading}
                                        className="px-4 py-2 rounded-xl border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 transition disabled:opacity-50">🚫 Заблокировать</button>
                                    )}
                                    <button onClick={() => handleDeleteUser(u.id)} disabled={actionLoading}
                                      className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition disabled:opacity-50">🗑 Удалить</button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Посредники */}
        {tab === "mediators" && (
          <div>
            {/* Sub-tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-border">
              {([
                { key: "applications" as const, label: "Заявки", count: (mediators?.items ?? []).filter((m) => m.status !== "APPROVED").length },
                { key: "chats" as const, label: "Чаты", count: mediatorTickets.filter((t) => t.status === "WAITING_ADMIN").length },
                { key: "database" as const, label: "База данных", count: (mediators?.items ?? []).filter((m) => m.status === "APPROVED").length },
              ]).map((st) => (
                <button
                  key={st.key}
                  onClick={() => { setMediatorSubTab(st.key); setSelectedMediatorTicket(null); }}
                  className={`relative px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                    mediatorSubTab === st.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {st.label}
                  {st.count > 0 && (
                    <span className={`ml-1.5 text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center ${
                      mediatorSubTab === st.key ? "bg-primary text-white" : "bg-red-500 text-white"
                    }`}>{st.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ===== SUB-TAB: Заявки ===== */}
            {mediatorSubTab === "applications" && (() => {
              const allItems = mediators?.items ?? [];
              const counts: Record<string, number> = { "": allItems.length, PENDING: 0, NEEDS_REVISION: 0, APPROVED: 0, REJECTED: 0 };
              allItems.forEach((m) => { if (counts[m.status] !== undefined) counts[m.status]++; });
              const filtered = mediatorStatusFilter ? allItems.filter((m) => m.status === mediatorStatusFilter) : allItems;

              const FILTER_TABS: { key: string; label: string; badgeBg: string }[] = [
                { key: "", label: "Все", badgeBg: "bg-gray-500" },
                { key: "PENDING", label: "На рассмотрении", badgeBg: "bg-amber-500" },
                { key: "NEEDS_REVISION", label: "Правки", badgeBg: "bg-orange-500" },
                { key: "APPROVED", label: "Одобренные", badgeBg: "bg-green-600" },
                { key: "REJECTED", label: "Отклонённые", badgeBg: "bg-red-500" },
              ];

              const toggleExpand = (id: string) => {
                setExpandedMediators((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) { next.delete(id); setSelectedMediator(null); setReason(""); }
                  else next.add(id);
                  return next;
                });
              };
              const expandAll = () => setExpandedMediators(new Set(filtered.map((m) => m.id)));
              const collapseAll = () => { setExpandedMediators(new Set()); setSelectedMediator(null); setReason(""); };

              return (
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {FILTER_TABS.map((t) => {
                      const c = counts[t.key] ?? 0;
                      const active = mediatorStatusFilter === t.key;
                      return (
                        <button key={t.key} onClick={() => { setMediatorStatusFilter(t.key); setSelectedMediator(null); setReason(""); }}
                          className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition font-medium ${active ? "border-primary bg-primary text-white shadow-sm" : "border-border bg-card hover:bg-accent"}`}>
                          {t.label}
                          {c > 0 && <span className={`${active ? "bg-white/25" : t.badgeBg} text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center`}>{c}</span>}
                        </button>
                      );
                    })}
                  </div>
                  {filtered.length > 0 && (
                    <div className="flex items-center gap-3 mb-4 text-xs">
                      <button onClick={expandAll} className="text-primary hover:underline">Развернуть все</button>
                      <span className="text-border">|</span>
                      <button onClick={collapseAll} className="text-muted hover:underline">Свернуть все</button>
                      <span className="ml-auto text-muted">{filtered.length} заявок</span>
                    </div>
                  )}
                  {filtered.length === 0 && <p className="text-muted text-center py-12">Нет заявок</p>}

                  {/* Image Preview Modal */}
                  {imagePreview && (
                    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setImagePreview(null)}>
                      <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
                        <button onClick={() => setImagePreview(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <a href={imagePreview} target="_blank" rel="noreferrer" className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white shadow-lg text-xs font-medium text-primary hover:bg-gray-50">Открыть оригинал</a>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {filtered.map((m) => {
                      const st = STATUS_LABELS[m.status];
                      const isExpanded = expandedMediators.has(m.id);
                      const isActionsOpen = selectedMediator === m.id;
                      return (
                        <div key={m.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                          <button type="button" onClick={() => toggleExpand(m.id)} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-accent/50 transition">
                            <AvatarImg src={m.avatarUrl} initials={`${m.firstName[0]}${m.lastName[0]}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{m.lastName} {m.firstName} {m.middleName ?? ""}</p>
                              <p className="text-xs text-muted truncate">{m.email} · {m.phone}</p>
                            </div>
                            <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full shrink-0 ${st?.color ?? ""}`}>{st?.label ?? m.status}</span>
                            <span className="text-xs text-muted shrink-0 hidden sm:block">{m.submittedAt ? new Date(m.submittedAt).toLocaleDateString("ru-RU") : ""}</span>
                            <svg className={`w-4 h-4 text-muted shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {isExpanded && (
                            <div className="border-t border-border px-5 py-4 space-y-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div><span className="text-muted text-xs block">Ставка</span><span className="font-medium">{m.commissionRate}%</span></div>
                                <div><span className="text-muted text-xs block">Мин. заказ</span><span className="font-medium">{m.minOrderAmount.toLocaleString("ru-RU")} ₽</span></div>
                                <div><span className="text-muted text-xs block">Дата заявки</span><span className="font-medium">{m.submittedAt ? new Date(m.submittedAt).toLocaleString("ru-RU") : "—"}</span></div>
                                <div><span className="text-muted text-xs block">Телефон</span><span className="font-medium">{m.phone}</span></div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">Документы</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {([
                                    { url: m.passportPhotoUrl, label: "Паспорт" },
                                    { url: m.passSelfiePhotoUrl, label: "Селфи с паспортом" },
                                    { url: m.passPhotoUrl, label: "Пропуск (Садовод)" },
                                    { url: m.avatarUrl, label: "Биометрия" },
                                  ] as { url: string | null | undefined; label: string }[]).map(({ url, label }) => (
                                    <PhotoThumb key={label} url={url} label={label} onPreview={setImagePreview} />
                                  ))}
                                </div>
                              </div>

                              {/* Срок действия аккаунта — динамический блок */}
                              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Срок действия аккаунта / пропуска</p>
                                    {m.accountExpiresAt ? (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={`text-sm font-bold ${new Date(m.accountExpiresAt) < new Date() ? "text-red-600" : new Date(m.accountExpiresAt) < new Date(Date.now() + 7 * 86400000) ? "text-amber-600" : "text-green-600"}`}>
                                            {new Date(m.accountExpiresAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                                          </span>
                                          {new Date(m.accountExpiresAt) < new Date()
                                            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">⛔ Истёк</span>
                                            : new Date(m.accountExpiresAt) < new Date(Date.now() + 7 * 86400000)
                                            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⚠️ Скоро</span>
                                            : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Активен</span>
                                          }
                                        </div>
                                        {new Date(m.accountExpiresAt) >= new Date() && (
                                          <p className="text-xs text-gray-500">
                                            Осталось: <span className="font-semibold">{daysRemaining(m.accountExpiresAt)} дней</span>
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-400 italic">Не установлен</span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      setExpiryModal({ id: m.id, currentValue: m.accountExpiresAt ?? "" });
                                      setEditValue(m.accountExpiresAt ? new Date(m.accountExpiresAt).toISOString().slice(0, 10) : "");
                                    }}
                                    className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition"
                                  >
                                    {m.accountExpiresAt ? "Изменить" : "Установить срок"}
                                  </button>
                                </div>
                              </div>

                              {m.rejectionReason && (
                                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                                  <p className="text-xs font-semibold text-orange-700 mb-0.5">Комментарий администратора:</p>
                                  <p className="text-sm text-orange-800">{m.rejectionReason}</p>
                                </div>
                              )}
                              {m.status !== "APPROVED" && (
                                <div className="border-t border-border pt-4">
                                  <button
                                    onClick={() => { setDecisionModal({ type: "mediator", id: m.id }); setReason(""); }}
                                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition"
                                  >
                                    Принять решение
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ===== SUB-TAB: Чаты (мини-мессенджер) ===== */}
            {mediatorSubTab === "chats" && (
              <div className="flex border border-border rounded-2xl overflow-hidden bg-card" style={{ height: "calc(100vh - 260px)", minHeight: 480 }}>
                {/* LEFT: Ticket list sidebar */}
                <div className="w-[340px] shrink-0 border-r border-border flex flex-col">
                  {/* Filter bar */}
                  <div className="p-3 border-b border-border flex flex-wrap gap-1">
                    {["", "WAITING_ADMIN", "WAITING_USER", "CLOSED"].map((s) => (
                      <button key={s} onClick={() => setMediatorTicketFilter(s)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${mediatorTicketFilter === s ? "border-primary bg-primary text-white" : "border-border hover:bg-accent"}`}>
                        {s === "" ? "Все" : TICKET_STATUS_LABELS[s]?.label ?? s}
                      </button>
                    ))}
                  </div>
                  {/* Ticket list */}
                  <div className="flex-1 overflow-y-auto">
                    {mediatorTickets.length === 0 ? (
                      <p className="text-muted text-center py-12 text-sm">Нет чатов</p>
                    ) : (
                      mediatorTickets.map((t) => {
                        const tst = TICKET_STATUS_LABELS[t.status] ?? TICKET_STATUS_LABELS.OPEN;
                        const isActive = selectedMediatorTicket?.id === t.id;
                        const isWaiting = t.status === "WAITING_ADMIN";
                        return (
                          <button key={t.id} onClick={() => openMediatorTicket(t.id)}
                            className={`w-full text-left px-4 py-3 border-b border-border/50 transition ${isActive ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-accent/50"}`}>
                            <div className="flex items-center gap-2">
                              {/* Avatar */}
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${isWaiting ? "bg-red-100 text-red-600" : "bg-accent text-muted"}`}>
                                {t.author.firstName[0]}{t.author.lastName[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-medium text-sm truncate">{t.author.firstName} {t.author.lastName}</span>
                                  <span className="text-[10px] text-muted shrink-0">{new Date(t.lastMessageAt).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                                <div className="flex items-center justify-between gap-1 mt-0.5">
                                  <span className="text-xs text-muted truncate">{t.subject}</span>
                                  {isWaiting && <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="p-2 border-t border-border text-[11px] text-muted text-center">{mediatorTicketTotal} чатов</div>
                </div>

                {/* RIGHT: Chat area */}
                <div className="flex-1 flex flex-col min-w-0">
                  {!selectedMediatorTicket ? (
                    <div className="flex-1 flex items-center justify-center text-muted">
                      <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <p className="text-sm">Выберите чат слева</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Chat header */}
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-background/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-accent text-muted font-bold text-[11px] flex items-center justify-center shrink-0">
                            {selectedMediatorTicket.author.firstName[0]}{selectedMediatorTicket.author.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{selectedMediatorTicket.author.firstName} {selectedMediatorTicket.author.lastName}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${TICKET_STATUS_LABELS[selectedMediatorTicket.status]?.color ?? ""}`}>{TICKET_STATUS_LABELS[selectedMediatorTicket.status]?.label ?? selectedMediatorTicket.status}</span>
                              <span className="text-[11px] text-muted truncate">{selectedMediatorTicket.subject}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => openMediatorProfilePanel(selectedMediatorTicket.author.id)} className="text-xs text-muted hover:text-foreground transition px-2 py-1 rounded-lg hover:bg-accent border border-border">👤 Профиль</button>
                          {selectedMediatorTicket.status !== "CLOSED" && selectedMediatorTicket.messages.some((msg: any) => msg.sender === "ADMIN") && (
                            <button onClick={enableBotInMediatorTicket} className="text-xs text-blue-600 hover:text-blue-800 transition px-2 py-1 rounded-lg hover:bg-blue-50 border border-blue-200">🤖 Боту</button>
                          )}
                          {selectedMediatorTicket.status !== "CLOSED" && (
                            <button onClick={closeMediatorTicket} className="text-xs text-muted hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">Закрыть</button>
                          )}
                        </div>
                      </div>
                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                        {selectedMediatorTicket.messages.map((msg) => {
                          const isAdmin = msg.sender === "ADMIN";
                          const isSystem = msg.sender === "SYSTEM";
                          return (
                            <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[70%] px-3.5 py-2 text-sm ${
                                isSystem ? "bg-blue-50 text-blue-800 rounded-xl w-full max-w-full border border-blue-100" :
                                isAdmin ? "bg-primary text-white rounded-2xl rounded-br-md" :
                                "bg-accent rounded-2xl rounded-bl-md"
                              }`}>
                                {isSystem && <p className="text-[10px] font-semibold text-blue-500 mb-1">🤖 GloBox Бот</p>}
                                {!isAdmin && !isSystem && <p className="text-[10px] font-semibold text-orange-600 mb-0.5">Посредник</p>}
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                <p className={`text-[10px] mt-1 text-right ${isAdmin ? "text-white/60" : "text-muted"}`}>{new Date(msg.createdAt).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={mediatorChatRef} />
                      </div>
                      {/* Input */}
                      {selectedMediatorTicket.status !== "CLOSED" ? (
                        <div className="p-3 border-t border-border flex gap-2 bg-background/50">
                          <input value={mediatorReplyText} onChange={(e) => setMediatorReplyText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMediatorReply(); } }}
                            placeholder="Написать ответ..." maxLength={5000}
                            className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          <button onClick={sendMediatorReply} disabled={mediatorReplySending || !mediatorReplyText.trim()}
                            className="px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 border-t border-border text-center text-sm text-muted bg-gray-50">Чат закрыт</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ===== SUB-TAB: База данных (все зарегистрированные посредники) ===== */}
            {mediatorSubTab === "database" && (() => {
              const allItems = dbUsers?.items ?? [];
              const DB_FILTER_TABS: { key: string; label: string; badgeBg: string }[] = [
                { key: "", label: "Все", badgeBg: "bg-gray-500" },
                { key: "NO_PROFILE", label: "Без профиля", badgeBg: "bg-gray-400" },
                { key: "PENDING", label: "На рассмотрении", badgeBg: "bg-amber-500" },
                { key: "NEEDS_REVISION", label: "Правки", badgeBg: "bg-orange-500" },
                { key: "APPROVED", label: "Одобренные", badgeBg: "bg-green-600" },
                { key: "FROZEN", label: "Замороженные", badgeBg: "bg-blue-500" },
                { key: "REJECTED", label: "Отклонённые", badgeBg: "bg-red-500" },
              ];
              const dbCounts: Record<string, number> = { "": allItems.length, NO_PROFILE: 0, PENDING: 0, NEEDS_REVISION: 0, APPROVED: 0, FROZEN: 0, REJECTED: 0 };
              allItems.forEach((m) => { if (dbCounts[m.status] !== undefined) dbCounts[m.status]++; });
              const dbFiltered = allItems;

              const toggleDbExpand = (uid: string) => {
                setExpandedMediators((prev) => {
                  const next = new Set(prev);
                  if (next.has(uid)) { next.delete(uid); setSelectedMediator(null); setReason(""); setEditingField(null); }
                  else next.add(uid);
                  return next;
                });
              };

              const FIELD_LABELS: Record<string, string> = {
                lastName: "Фамилия", firstName: "Имя", middleName: "Отчество",
                phone: "Телефон", passportPhotoUrl: "Фото паспорта",
                passSelfiePhotoUrl: "Селфи с паспортом", avatarUrl: "Аватар",
              };

              return (
                <div>
                  {/* Search + filters */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <input type="text" value={dbSearch} onChange={(e) => setDbSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") fetchDbUsers(); }}
                      placeholder="Поиск по ФИО, email, телефону… (Enter)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <button onClick={fetchDbUsers} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition whitespace-nowrap">Найти</button>
                    <span className="text-xs text-muted self-center whitespace-nowrap">{dbFiltered.length} из {dbUsers?.total ?? 0}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {DB_FILTER_TABS.map((t) => {
                      const c = dbCounts[t.key] ?? 0;
                      const active = dbStatusFilter === t.key;
                      return (
                        <button key={t.key} onClick={() => { setDbStatusFilter(t.key); setSelectedMediator(null); setReason(""); setExpandedMediators(new Set()); setEditingField(null); }}
                          className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition font-medium ${active ? "border-primary bg-primary text-white shadow-sm" : "border-border bg-card hover:bg-accent"}`}>
                          {t.label}
                          {c > 0 && <span className={`${active ? "bg-white/25" : t.badgeBg} text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center`}>{c}</span>}
                        </button>
                      );
                    })}
                  </div>
                  {dbFiltered.length > 0 && (
                    <div className="flex items-center gap-3 mb-4 text-xs">
                      <button onClick={() => setExpandedMediators(new Set(dbFiltered.map((m) => m.userId)))} className="text-primary hover:underline">Развернуть все</button>
                      <span className="text-border">|</span>
                      <button onClick={() => { setExpandedMediators(new Set()); setSelectedMediator(null); setReason(""); setEditingField(null); }} className="text-muted hover:underline">Свернуть все</button>
                    </div>
                  )}
                  {dbFiltered.length === 0 && <p className="text-muted text-center py-12">Нет посредников</p>}

                  <div className="space-y-3">
                    {dbFiltered.map((m) => {
                      const st = STATUS_LABELS[m.status];
                      const uid = m.userId;
                      const pid = m.id;
                      const isExpanded = expandedMediators.has(uid);
                      const isActionsOpen = selectedMediator === uid;
                      const hasPendingCR = (m.changeRequests?.length ?? 0) > 0;
                      const hasProfile = m.status !== "NO_PROFILE" && pid;
                      const displayName = `${m.lastName ?? ""} ${m.firstName ?? ""}`.trim() || m.email || "—";
                      return (
                        <div key={uid} className={`bg-card rounded-2xl border shadow-sm overflow-hidden ${hasPendingCR ? "border-amber-300" : "border-border"}`}>
                          <button type="button" onClick={() => toggleDbExpand(uid)} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-accent/50 transition">
                            <AvatarImg src={m.avatarUrl} initials={`${(m.firstName ?? "?")[0]}${(m.lastName ?? "?")[0]}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{displayName} {m.middleName ?? ""}</p>
                              <p className="text-xs text-muted truncate">{m.email ?? "—"} · {m.phone ?? "—"}</p>
                            </div>
                            {m.blockedAt && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">Заблокирован</span>}
                            {hasPendingCR && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">Запрос</span>}
                            <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full shrink-0 ${st?.color ?? ""}`}>{st?.label ?? m.status}</span>
                            <span className="text-xs text-muted shrink-0 hidden sm:block">{m.createdAt ? new Date(m.createdAt).toLocaleDateString("ru-RU") : ""}</span>
                            <svg className={`w-4 h-4 text-muted shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {isExpanded && (
                            <div className="border-t border-border px-5 py-4 space-y-5">
                              {(() => {
                                const EditBtn = ({ field, label, value, type, suffix, min, max, step, presets }: {
                                  field: string; label: string; value: string;
                                  type: "text"|"email"|"phone"|"number"|"date";
                                  suffix?: string; min?: number; max?: number; step?: number;
                                  presets?: { label: string; value: string }[];
                                }) => (
                                  <button type="button"
                                    onClick={() => openMediatorEdit(uid, pid ?? null, field, label, value, type, { suffix, min, max, step, presets })}
                                    className="group font-medium text-sm flex items-center gap-1 hover:text-primary transition text-left w-full">
                                    <span className="truncate">{value || <span className="text-muted italic font-normal">не указано</span>}</span>
                                    <svg className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  </button>
                                );
                                const expiryPresets = [
                                  { label: "+30 дней",  value: addDaysFromNow(30)  },
                                  { label: "+90 дней",  value: addDaysFromNow(90)  },
                                  { label: "+6 месяцев",value: addDaysFromNow(180) },
                                  { label: "+1 год",    value: addDaysFromNow(365) },
                                ];
                                return (
                                  <>
                                    {/* Личные данные */}
                                    <div>
                                      <p className="text-xs font-semibold text-muted mb-3 uppercase tracking-wider">Личные данные</p>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                        <div><span className="text-muted text-xs block mb-0.5">Фамилия</span><EditBtn field="lastName"   label="Фамилия"   value={m.lastName ?? ""}   type="text" /></div>
                                        <div><span className="text-muted text-xs block mb-0.5">Имя</span><EditBtn field="firstName" label="Имя"       value={m.firstName ?? ""} type="text" /></div>
                                        <div><span className="text-muted text-xs block mb-0.5">Отчество</span><EditBtn field="middleName" label="Отчество" value={m.middleName ?? ""} type="text" /></div>
                                        <div><span className="text-muted text-xs block mb-0.5">Email</span><EditBtn field="email" label="Email" value={m.email ?? ""} type="email" /></div>
                                        <div><span className="text-muted text-xs block mb-0.5">Телефон</span><EditBtn field="phone" label="Телефон" value={m.phone ?? ""} type="phone" /></div>
                                        <div><span className="text-muted text-xs block mb-0.5">ID</span><span className="font-mono text-[10px] text-muted break-all">{uid}</span></div>
                                      </div>
                                    </div>

                                    {/* Нет профиля */}
                                    {!hasProfile && (
                                      <div className="bg-gray-50 border border-dashed border-border rounded-xl px-4 py-3 text-center text-sm text-muted">
                                        Пользователь зарегистрировался, но ещё не подал заявку на верификацию
                                      </div>
                                    )}

                                    {/* Рабочие параметры */}
                                    {hasProfile && (
                                      <div>
                                        <p className="text-xs font-semibold text-muted mb-3 uppercase tracking-wider">Рабочие параметры</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                          <div>
                                            <span className="text-muted text-xs block mb-0.5">Ставка комиссии</span>
                                            <EditBtn field="commissionRate" label="Ставка комиссии" value={String(m.commissionRate ?? 0)} type="number" suffix="%" min={0} max={50} step={0.5} />
                                          </div>
                                          <div>
                                            <span className="text-muted text-xs block mb-0.5">Мин. заказ</span>
                                            <EditBtn field="minOrderAmount" label="Минимальный заказ" value={String(m.minOrderAmount ?? 0)} type="number" suffix="₽" min={0} step={100} />
                                          </div>
                                          <div><span className="text-muted text-xs block">Рейтинг</span><span className="font-medium text-amber-500">{m.rating ? Number(m.rating).toFixed(1) : "—"}</span></div>
                                          <div><span className="text-muted text-xs block">Заказов</span><span className="font-medium">{m.completedOrdersCount ?? 0}</span></div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Срок действия аккаунта */}
                                    {hasProfile && (
                                      <div>
                                        <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">Срок действия аккаунта / пропуска</p>
                                        <div className="flex items-center gap-2 text-sm flex-wrap">
                                          {m.accountExpiresAt ? (
                                            <>
                                              <span className={`font-medium ${new Date(m.accountExpiresAt) < new Date() ? "text-red-600" : new Date(m.accountExpiresAt) < new Date(Date.now() + 7 * 86400000) ? "text-amber-600" : "text-green-600"}`}>
                                                {new Date(m.accountExpiresAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                                              </span>
                                              {new Date(m.accountExpiresAt) < new Date()
                                                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">⛔ Истёк</span>
                                                : new Date(m.accountExpiresAt) < new Date(Date.now() + 7 * 86400000)
                                                ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⚠️ Скоро</span>
                                                : <span className="text-[10px] text-muted">({daysRemaining(m.accountExpiresAt)} дн.)</span>}
                                            </>
                                          ) : (
                                            <span className="text-muted italic text-sm">Не установлен</span>
                                          )}
                                          <button
                                            onClick={() => openMediatorEdit(uid, pid ?? null, "accountExpiresAt", "Срок действия аккаунта",
                                              m.accountExpiresAt ? new Date(m.accountExpiresAt).toISOString().slice(0, 10) : "", "date",
                                              { presets: expiryPresets })}
                                            className="text-xs text-primary hover:underline flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            {m.accountExpiresAt ? "Изменить" : "Установить срок"}
                                          </button>
                                        </div>
                                        {m.status === "FROZEN" && <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mt-2">❄️ Аккаунт заморожен — пропуск истёк. Обновите срок и измените статус для разморозки.</p>}
                                      </div>
                                    )}

                                    {/* Документы */}
                                    {hasProfile && (
                                      <div>
                                        <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">Документы и фото</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                          {([
                                            { url: m.passportPhotoUrl,   label: "Паспорт" },
                                            { url: m.passSelfiePhotoUrl, label: "Селфи с паспортом" },
                                            { url: m.passPhotoUrl,       label: "Пропуск (Садовод)" },
                                            { url: m.avatarUrl,          label: "Аватар / Биометрия" },
                                          ] as { url: string | null | undefined; label: string }[]).map(({ url, label }) => (
                                            <PhotoThumb key={label} url={url} label={label} onPreview={setImagePreview} />
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Хронология */}
                                    {hasProfile && (
                                      <div>
                                        <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">Хронология</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                          <div><span className="text-muted text-xs block">Регистрация</span><span className="font-medium text-xs">{m.userCreatedAt ? new Date(m.userCreatedAt).toLocaleString("ru-RU") : m.createdAt ? new Date(m.createdAt).toLocaleString("ru-RU") : "—"}</span></div>
                                          {m.submittedAt && <div><span className="text-muted text-xs block">Заявка подана</span><span className="font-medium text-xs">{new Date(m.submittedAt).toLocaleString("ru-RU")}</span></div>}
                                          {m.reviewedAt  && <div><span className="text-muted text-xs block">Проверка</span><span className="font-medium text-xs">{new Date(m.reviewedAt).toLocaleString("ru-RU")}</span></div>}
                                          {m.approvedAt  && <div><span className="text-muted text-xs block">Одобрение</span><span className="font-medium text-xs text-green-600">{new Date(m.approvedAt).toLocaleString("ru-RU")}</span></div>}
                                        </div>
                                      </div>
                                    )}

                                    {/* Запросы на изменение данных — только модалка для history */}
                                    {(m.changeRequests?.length ?? 0) > 0 && pid && (
                                      <div>
                                        <p className="text-xs font-semibold text-amber-600 mb-2 uppercase tracking-wider">Запросы на изменение данных ({m.changeRequests!.length})</p>
                                        <div className="space-y-2">
                                          {m.changeRequests!.map((cr) => (
                                            <div key={cr.id} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-xs font-semibold text-amber-800">{FIELD_LABELS[cr.fieldName] ?? cr.fieldName}</p>
                                                  <p className="text-sm mt-0.5">
                                                    <span className="text-muted line-through">{cr.oldValue ?? "—"}</span>
                                                    <span className="mx-2 text-muted">→</span>
                                                    <span className="font-medium text-amber-900">{cr.newValue}</span>
                                                  </p>
                                                  <p className="text-[11px] text-amber-700 mt-1">Причина: {cr.reason}</p>
                                                  <p className="text-[10px] text-muted mt-0.5">{new Date(cr.createdAt).toLocaleString("ru-RU")}</p>
                                                </div>
                                                <div className="flex gap-1.5 shrink-0">
                                                  <button onClick={() => handleChangeRequest(pid, cr.id, "approve")} disabled={actionLoading}
                                                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50">Принять</button>
                                                  <button onClick={() => handleChangeRequest(pid, cr.id, "reject")} disabled={actionLoading}
                                                    className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-50">Отклонить</button>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Причина отклонения */}
                                    {m.rejectionReason && (
                                      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                                        <p className="text-xs font-semibold text-orange-700 mb-0.5">Комментарий администратора:</p>
                                        <p className="text-sm text-orange-800">{m.rejectionReason}</p>
                                      </div>
                                    )}

                                    {/* Действия */}
                                    <div className={`flex flex-wrap gap-2 pt-1 border-t border-border ${!hasProfile ? "" : ""}`}>
                                      {hasProfile && m.status !== "APPROVED" && (
                                        <button onClick={() => { if (confirm("Одобрить посредника?")) handleMediatorAction(pid!, "approve"); }} disabled={actionLoading}
                                          className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition">Одобрить</button>
                                      )}
                                      {hasProfile && (
                                        <button onClick={() => setSelectedMediator(uid)}
                                          className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-medium hover:bg-primary/90 transition">
                                          {m.status === "APPROVED" ? "Изменить статус" : "Другие действия"}
                                        </button>
                                      )}
                                      {m.blockedAt ? (
                                        <button onClick={() => handleUnblockUser(uid)} disabled={actionLoading}
                                          className="px-4 py-2 rounded-xl border border-green-300 text-green-700 text-xs font-medium hover:bg-green-50 transition disabled:opacity-50">✅ Разблокировать</button>
                                      ) : (
                                        <button onClick={() => handleBlockUser(uid)} disabled={actionLoading}
                                          className="px-4 py-2 rounded-xl border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50 transition disabled:opacity-50">🚫 Заблокировать</button>
                                      )}
                                      <button onClick={() => handleDeleteUser(uid)} disabled={actionLoading}
                                        className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition disabled:opacity-50">🗑 Удалить</button>
                                    </div>

                                    {/* Расширенные действия (статус) */}
                                    {hasProfile && isActionsOpen && (
                                      <div className="space-y-3 border border-border rounded-xl p-4">
                                        <div className="flex gap-2 flex-wrap">
                                          {m.status !== "APPROVED" && (
                                            <button onClick={() => { if (confirm("Одобрить?")) handleMediatorAction(pid!, "approve"); }} disabled={actionLoading}
                                              className="px-4 py-2 rounded-xl bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50">Одобрить</button>
                                          )}
                                          <button onClick={() => reason && handleMediatorAction(pid!, "revision")} disabled={actionLoading || !reason}
                                            className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 disabled:opacity-50">На доработку</button>
                                          {m.status !== "REJECTED" && (
                                            <button onClick={() => reason && handleMediatorAction(pid!, "reject")} disabled={actionLoading || !reason}
                                              className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-50">Отклонить</button>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          <span className="text-xs text-muted self-center">Шаблоны:</span>
                                          {["Фото паспорта нечитаемое","Сделайте новое селфи с паспортом","Данные не совпадают с фото","Необходимо пройти повторную верификацию"].map(tpl => (
                                            <button key={tpl} type="button" onClick={() => setReason(tpl)}
                                              className="text-[11px] px-2 py-1 rounded-lg border border-border hover:bg-accent transition">{tpl}</button>
                                          ))}
                                        </div>
                                        <textarea placeholder="Комментарий (обязателен для отклонения/доработки)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                                          className="w-full border border-border rounded-xl px-4 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                                        <button onClick={() => { setSelectedMediator(null); setReason(""); }} className="text-sm text-muted underline">Отмена</button>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Покупатели */}
        {tab === "buyers" && (
          <div>
            {buyers && buyers.items.length === 0 && (
              <p className="text-muted text-center py-12">Нет покупателей</p>
            )}
            <div className="space-y-3">
              {buyers?.items.map((b) => (
                <div
                  key={b.id}
                  className="bg-card rounded-2xl border border-border p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">
                      {b.firstName ?? ""} {b.lastName ?? ""}
                      {!b.firstName && !b.lastName ? b.email : ""}
                    </p>
                    <p className="text-sm text-muted">
                      {b.email} {b.phone ? `· ${b.phone}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        b.emailVerified ? "bg-green-50 text-green-600" : "bg-gray-100 text-muted"
                      }`}
                    >
                      {b.emailVerified ? "Верифицирован" : "Не верифицирован"}
                    </span>
                    <p className="text-xs text-muted mt-1">
                      {new Date(b.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Категории — настройки AI-матчинга */}
        {tab === "categories" && <CategoryAiTab />}

        {/* ИИ */}
        {tab === "ai" && <AiTab />}
      </main>

      {/* ===== GLOBAL: Decision modal ===== */}
      {decisionModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => { setDecisionModal(null); setReason(""); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">
                Решение по {decisionModal.type === "supplier" ? "поставщику" : "посреднику"}
              </h3>
              <button onClick={() => { setDecisionModal(null); setReason(""); }} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                Шаблоны {decisionModal.type === "supplier" ? "для поставщиков" : "для посредников"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(decisionModal.type === "supplier" ? [
                  "Фото паспорта нечитаемое — загрузите более чёткое",
                  "Загрузите селфи: лицо и разворот паспорта должны быть видны",
                  "Данные в анкете не совпадают с документами",
                  "Укажите корректный номер павильона",
                  "Выберите категории, соответствующие вашим товарам",
                  "Заявка заполнена не полностью — проверьте все поля",
                ] : [
                  "Фото паспорта нечитаемое — загрузите более чёткое",
                  "Пропуск на рынок Садовод истёк — загрузите актуальный",
                  "Селфи с паспортом нечитаемое — лицо и данные должны быть в кадре",
                  "Фото пропуска нечитаемое — все данные и срок действия должны быть видны",
                  "Данные в анкете не совпадают с документами",
                  "Укажите корректную ставку комиссии",
                ]).map(tpl => (
                  <button key={tpl} type="button" onClick={() => setReason(tpl)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition ${reason === tpl ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:bg-gray-50 text-gray-700"}`}>
                    {tpl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                Комментарий (обязателен при доработке/отклонении)
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Напишите причину или выберите шаблон выше..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!confirm(`Одобрить ${decisionModal.type === "supplier" ? "поставщика" : "посредника"}?`)) return;
                  if (decisionModal.type === "supplier") handleAction(decisionModal.id, "approve");
                  else handleMediatorAction(decisionModal.id, "approve");
                  setDecisionModal(null);
                }}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition disabled:opacity-50"
              >
                ✓ Одобрить
              </button>
              <button
                onClick={() => {
                  if (!reason.trim()) { alert("Укажите причину доработки"); return; }
                  if (decisionModal.type === "supplier") handleAction(decisionModal.id, "revision");
                  else handleMediatorAction(decisionModal.id, "revision");
                  setDecisionModal(null);
                }}
                disabled={actionLoading || !reason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-50"
              >
                ✎ Доработать
              </button>
              <button
                onClick={() => {
                  if (!reason.trim()) { alert("Укажите причину отклонения"); return; }
                  if (!confirm("Отклонить заявку?")) return;
                  if (decisionModal.type === "supplier") handleAction(decisionModal.id, "reject");
                  else handleMediatorAction(decisionModal.id, "reject");
                  setDecisionModal(null);
                }}
                disabled={actionLoading || !reason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
              >
                ✗ Отклонить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== GLOBAL: Expiry date modal ===== */}
      {expiryModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setExpiryModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Срок действия аккаунта</h3>
              <button onClick={() => setExpiryModal(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Current state */}
            {expiryModal.currentValue && (
              <div className={`rounded-xl px-4 py-3 text-sm ${
                new Date(expiryModal.currentValue) < new Date()
                  ? "bg-red-50 border border-red-200 text-red-700"
                  : new Date(expiryModal.currentValue) < new Date(Date.now() + 7 * 86400000)
                  ? "bg-amber-50 border border-amber-200 text-amber-700"
                  : "bg-green-50 border border-green-200 text-green-700"
              }`}>
                <p className="font-semibold">
                  {new Date(expiryModal.currentValue) < new Date() ? "⛔ Истёк" :
                   new Date(expiryModal.currentValue) < new Date(Date.now() + 7 * 86400000) ? "⚠️ Скоро истекает" :
                   "✓ Активен"}
                </p>
                <p className="text-sm mt-0.5">
                  {new Date(expiryModal.currentValue).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                  {new Date(expiryModal.currentValue) >= new Date() && (
                    <span className="ml-2 opacity-75">
                      ({daysRemaining(expiryModal.currentValue)} дн. осталось)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Date picker */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                Новая дата окончания
              </label>
              <input
                type="date"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
            </div>

            {/* Quick presets */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Быстрый выбор</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "+30 дней",  days: 30 },
                  { label: "+90 дней",  days: 90 },
                  { label: "+6 мес",    days: 180 },
                  { label: "+1 год",    days: 365 },
                ].map(({ label, days }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setEditValue(addDaysFromNow(days))}
                    className={`py-2 rounded-lg text-xs font-semibold border transition ${
                      editValue === addDaysFromNow(days) ? "bg-blue-500 text-white border-blue-500" : "bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview of selected date */}
            {editValue && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                <p className="font-semibold">Новая дата:</p>
                <p>{new Date(editValue).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (!editValue) return;
                  await handleUpdateMediatorField(expiryModal.id, "accountExpiresAt", editValue);
                  setExpiryModal(null);
                }}
                disabled={actionLoading || !editValue}
                className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition disabled:opacity-50"
              >
                Сохранить
              </button>
              {expiryModal.currentValue && (
                <button
                  onClick={async () => {
                    if (!confirm("Убрать срок действия?")) return;
                    await handleUpdateMediatorField(expiryModal.id, "accountExpiresAt", "");
                    setExpiryModal(null);
                  }}
                  disabled={actionLoading}
                  className="px-4 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
                >
                  Убрать
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Supplier Profile Slide-over ===== */}
      {supplierProfilePanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSupplierProfilePanel(null)} />
          <div className="w-[400px] bg-background border-l border-border flex flex-col overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="font-semibold text-sm">Профиль поставщика</p>
              <button onClick={() => setSupplierProfilePanel(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <AvatarImg
                  src={supplierProfilePanel.avatarUrl}
                  initials={`${supplierProfilePanel.firstName[0]}${supplierProfilePanel.lastName[0]}`}
                  className="w-16 h-16 border border-border text-xl font-bold"
                />
                <div>
                  <p className="font-semibold">{supplierProfilePanel.lastName} {supplierProfilePanel.firstName} {supplierProfilePanel.middleName ?? ""}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_LABELS[supplierProfilePanel.status]?.color ?? ""}`}>{STATUS_LABELS[supplierProfilePanel.status]?.label ?? supplierProfilePanel.status}</span>
                </div>
              </div>
              {/* Contact */}
              <div className="bg-card rounded-xl border border-border p-4 space-y-2 text-sm">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Контакты</p>
                <div className="flex justify-between"><span className="text-muted">Email</span><span className="font-medium text-xs">{supplierProfilePanel.email ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Телефон</span><span className="font-medium">{supplierProfilePanel.phone ?? "—"}</span></div>
              </div>
              {/* Location & business */}
              <div className="bg-card rounded-xl border border-border p-4 space-y-2 text-sm">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Торговля</p>
                <div className="flex justify-between"><span className="text-muted">Рынок</span><span className="font-medium">{supplierProfilePanel.location?.name ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Павильон</span><span className="font-medium">{supplierProfilePanel.pavilionNumber?.split("\n")[0] ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Форма</span><span className="font-medium">{ENTITY_LABELS[supplierProfilePanel.entityType] ?? supplierProfilePanel.entityType}</span></div>
                {supplierProfilePanel.inn && <div className="flex justify-between"><span className="text-muted">ИНН</span><span className="font-medium">{supplierProfilePanel.inn}</span></div>}
              </div>
              {/* Categories */}
              {(supplierProfilePanel.categories?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Категории</p>
                  <div className="flex flex-wrap gap-1.5">
                    {supplierProfilePanel.categories.map((c) => (
                      <span key={c.id} className="text-xs px-2.5 py-1 rounded-full bg-accent border border-border">{c.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* Docs */}
              <div>
                <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Документы</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { url: supplierProfilePanel.passPhotoUrl, label: "Паспорт" },
                    { url: supplierProfilePanel.passSelfiePhotoUrl, label: "Селфи" },
                  ] as { url: string | null | undefined; label: string }[]).map(({ url, label }) => (
                    <PhotoThumb key={label} url={url} label={label} onPreview={setImagePreview} />
                  ))}
                </div>
                {supplierProfilePanel.avatarUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <button type="button" onClick={() => setImagePreview(supplierProfilePanel.avatarUrl!)} className="group flex items-center gap-3">
                      <AvatarImg src={supplierProfilePanel.avatarUrl} initials="" className="w-12 h-12 border border-border" />
                      <p className="text-xs text-muted group-hover:text-primary">Биометрическое фото</p>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Mediator Edit Modal ===== */}
      {mediatorEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setMediatorEditModal(null)}>
          <div className="bg-background rounded-2xl border border-border w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <p className="font-semibold text-sm">Изменить: {mediatorEditModal.label}</p>
              <button onClick={() => setMediatorEditModal(null)} className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Number */}
              {mediatorEditModal.type === "number" && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    {mediatorEditModal.label}{mediatorEditModal.suffix ? ` (${mediatorEditModal.suffix})` : ""}
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={mediatorEditValue} onChange={e => setMediatorEditValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleMediatorEditSave(); }}
                      min={mediatorEditModal.min} max={mediatorEditModal.max} step={mediatorEditModal.step ?? 1}
                      autoFocus className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    {mediatorEditModal.suffix && <span className="text-sm font-medium text-muted shrink-0">{mediatorEditModal.suffix}</span>}
                  </div>
                </div>
              )}
              {/* Date */}
              {mediatorEditModal.type === "date" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">{mediatorEditModal.label}</label>
                    <input type="date" value={mediatorEditValue} onChange={e => setMediatorEditValue(e.target.value)}
                      autoFocus className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  {mediatorEditModal.presets && (
                    <div>
                      <p className="text-xs text-muted mb-2">Быстрый выбор:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {mediatorEditModal.presets.map(p => (
                          <button key={p.label} type="button" onClick={() => setMediatorEditValue(p.value)}
                            className={`py-2 rounded-lg text-xs font-semibold border transition ${mediatorEditValue === p.value ? "bg-primary text-white border-primary" : "bg-gray-50 border-gray-200 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"}`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {mediatorEditValue && (
                    <p className="text-xs text-muted bg-accent rounded-lg px-3 py-2">
                      Новая дата: <span className="font-semibold">{new Date(mediatorEditValue).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>
                    </p>
                  )}
                  <button onClick={() => setMediatorEditValue("")} className="text-xs text-red-500 hover:underline">Убрать срок</button>
                </div>
              )}
              {/* Text / email / phone */}
              {(mediatorEditModal.type === "text" || mediatorEditModal.type === "email" || mediatorEditModal.type === "phone") && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">{mediatorEditModal.label}</label>
                  <input type={mediatorEditModal.type === "email" ? "email" : mediatorEditModal.type === "phone" ? "tel" : "text"}
                    value={mediatorEditValue} onChange={e => setMediatorEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleMediatorEditSave(); }}
                    autoFocus className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={`Введите ${mediatorEditModal.label.toLowerCase()}`} />
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={handleMediatorEditSave} disabled={mediatorEditLoading}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50">
                  {mediatorEditLoading ? "Сохранение…" : "Сохранить"}
                </button>
                <button onClick={() => setMediatorEditModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-accent transition">Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Supplier Edit Modal ===== */}
      {supplierEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSupplierEditModal(null)}>
          <div className="bg-background rounded-2xl border border-border w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <p className="font-semibold text-sm">Изменить: {supplierEditModal.label}</p>
              <button onClick={() => setSupplierEditModal(null)} className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Text / email / phone */}
              {(supplierEditModal.type === "text" || supplierEditModal.type === "email" || supplierEditModal.type === "phone") && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">{supplierEditModal.label}</label>
                  <input
                    type={supplierEditModal.type === "email" ? "email" : supplierEditModal.type === "phone" ? "tel" : "text"}
                    value={supplierEditValue}
                    onChange={e => setSupplierEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSupplierEditSave(); }}
                    autoFocus
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={`Введите ${supplierEditModal.label.toLowerCase()}`}
                  />
                </div>
              )}

              {/* Select (location, entityType) */}
              {supplierEditModal.type === "select" && supplierEditModal.options && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">{supplierEditModal.label}</label>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {supplierEditModal.options.map(opt => (
                      <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${supplierEditValue === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}>
                        <input type="radio" name="sel" value={opt.value} checked={supplierEditValue === opt.value}
                          onChange={() => setSupplierEditValue(opt.value)} className="accent-primary" />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories (multi-checkbox) */}
              {supplierEditModal.type === "categories" && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Выберите категории (до 5)</label>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {allCategories.map(cat => {
                      const checked = supplierEditCategories.includes(cat.id);
                      return (
                        <label key={cat.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${checked ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}>
                          <input type="checkbox" checked={checked}
                            onChange={() => setSupplierEditCategories(prev =>
                              prev.includes(cat.id)
                                ? prev.filter(id => id !== cat.id)
                                : prev.length < 5 ? [...prev, cat.id] : prev
                            )}
                            className="accent-primary" />
                          <span className="text-sm font-medium">{cat.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted mt-2">Выбрано: {supplierEditCategories.length} / 5</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={handleSupplierEditSave} disabled={supplierEditLoading}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50">
                  {supplierEditLoading ? "Сохранение…" : "Сохранить"}
                </button>
                <button onClick={() => setSupplierEditModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-accent transition">
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Supplier Status Modal (история заявки) ===== */}
      {supplierStatusModal && (() => {
        const { user: u, profile } = supplierStatusModal;
        const st = STATUS_LABELS[u.profileStatus];
        const fmt = (d: string) => new Date(d).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
        const events: { date: string; label: string; color?: string }[] = [
          { date: u.createdAt, label: "Регистрация" },
          ...(u.submittedAt ? [{ date: u.submittedAt, label: "Заявка подана", color: "text-amber-600" }] : []),
          ...(u.approvedAt  ? [{ date: u.approvedAt,  label: "Одобрен",        color: "text-green-600" }] : []),
          ...(u.blockedAt   ? [{ date: u.blockedAt,   label: "Заблокирован",   color: "text-red-600"   }] : []),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSupplierStatusModal(null)}>
            <div className="bg-background rounded-2xl border border-border w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <p className="font-semibold text-sm">История заявки</p>
                <button onClick={() => setSupplierStatusModal(null)} className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                {/* Current status */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Текущий статус:</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st?.color ?? "text-gray-500 bg-gray-100"}`}>{st?.label ?? u.profileStatus}</span>
                  {u.blockedAt && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Заблокирован</span>}
                </div>

                {/* Timeline */}
                <div>
                  <p className="text-xs font-semibold text-muted mb-3 uppercase tracking-wide">Хронология событий</p>
                  <div className="relative pl-4 space-y-3">
                    <div className="absolute left-1.5 top-1 bottom-1 w-px bg-border" />
                    {events.map((ev) => (
                      <div key={ev.date + ev.label} className="relative flex items-start gap-3">
                        <div className="absolute -left-[11px] top-1 w-2.5 h-2.5 rounded-full bg-card border-2 border-border" />
                        <div>
                          <p className={`text-sm font-medium ${ev.color ?? ""}`}>{ev.label}</p>
                          <p className="text-xs text-muted">{fmt(ev.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rejection reason */}
                {profile?.rejectionReason && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-orange-700 mb-1">Комментарий администратора</p>
                    <p className="text-sm text-orange-800">{profile.rejectionReason}</p>
                  </div>
                )}

                {/* No profile */}
                {!profile && (
                  <p className="text-sm text-muted text-center py-2">Профиль ещё не создан</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== Mediator Profile Slide-over ===== */}
      {mediatorProfilePanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setMediatorProfilePanel(null)} />
          <div className="w-[400px] bg-background border-l border-border flex flex-col overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="font-semibold text-sm">Профиль посредника</p>
              <button onClick={() => setMediatorProfilePanel(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <AvatarImg
                  src={mediatorProfilePanel.avatarUrl}
                  initials={`${(mediatorProfilePanel.firstName ?? "?")[0]}${(mediatorProfilePanel.lastName ?? "?")[0]}`}
                  className="w-16 h-16 border border-border text-xl font-bold"
                />
                <div>
                  <p className="font-semibold">{mediatorProfilePanel.lastName} {mediatorProfilePanel.firstName} {mediatorProfilePanel.middleName ?? ""}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_LABELS[mediatorProfilePanel.status]?.color ?? ""}`}>{STATUS_LABELS[mediatorProfilePanel.status]?.label ?? mediatorProfilePanel.status}</span>
                </div>
              </div>
              {/* Contact */}
              <div className="bg-card rounded-xl border border-border p-4 space-y-2 text-sm">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Контакты</p>
                <div className="flex justify-between"><span className="text-muted">Email</span><span className="font-medium">{mediatorProfilePanel.user?.email ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Телефон</span><span className="font-medium">{mediatorProfilePanel.phone ?? "—"}</span></div>
              </div>
              {/* Work params */}
              <div className="bg-card rounded-xl border border-border p-4 space-y-2 text-sm">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Параметры работы</p>
                <div className="flex justify-between"><span className="text-muted">Комиссия</span><span className="font-medium">{mediatorProfilePanel.commissionRate}%</span></div>
                <div className="flex justify-between"><span className="text-muted">Мин. заказ</span><span className="font-medium">{(mediatorProfilePanel.minOrderAmount ?? 0).toLocaleString("ru-RU")} ₽</span></div>
                <div className="flex justify-between"><span className="text-muted">Рейтинг</span><span className="font-medium text-amber-500">{mediatorProfilePanel.rating ? Number(mediatorProfilePanel.rating).toFixed(1) : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Заказов выполнено</span><span className="font-medium">{mediatorProfilePanel.completedOrdersCount ?? 0}</span></div>
              </div>
              {/* Expiry */}
              {mediatorProfilePanel.accountExpiresAt && (
                <div className="bg-card rounded-xl border border-border p-4 text-sm">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Срок действия</p>
                  <span className={`font-medium ${new Date(mediatorProfilePanel.accountExpiresAt) < new Date() ? "text-red-600" : "text-green-600"}`}>
                    {new Date(mediatorProfilePanel.accountExpiresAt).toLocaleDateString("ru-RU")}
                  </span>
                  {new Date(mediatorProfilePanel.accountExpiresAt) >= new Date() && (
                    <span className="ml-2 text-muted text-xs">({daysRemaining(mediatorProfilePanel.accountExpiresAt)} дн.)</span>
                  )}
                </div>
              )}
              {/* Docs */}
              <div>
                <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Документы</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { url: mediatorProfilePanel.passportPhotoUrl, label: "Паспорт" },
                    { url: mediatorProfilePanel.passSelfiePhotoUrl, label: "Селфи" },
                    { url: mediatorProfilePanel.passPhotoUrl, label: "Пропуск" },
                    { url: mediatorProfilePanel.avatarUrl, label: "Фото" },
                  ] as { url: string | null | undefined; label: string }[]).map(({ url, label }) => (
                    <PhotoThumb key={label} url={url} label={label} onPreview={setImagePreview} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== ИИ tab with 3 sub-tabs ========== */

interface BotSettings {
  id: string;
  apiKey: string | null;
  apiBaseUrl: string;
  model: string;
  systemPrompt: string | null;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  updatedAt: string;
}

type AiSubTab = "mediator" | "supplier" | "buyer";

function AiTab() {
  const [subTab, setSubTab] = useState<AiSubTab>("mediator");

  const SUB_TABS: { key: AiSubTab; label: string; emoji: string }[] = [
    { key: "mediator", label: "Посредники", emoji: "🤝" },
    { key: "supplier", label: "Поставщики", emoji: "🏪" },
    { key: "buyer", label: "Покупатели", emoji: "🛒" },
  ];

  return (
    <div>
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              subTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>
      <BotSettingsForm key={subTab} role={subTab} />
    </div>
  );
}

function BotSettingsForm({ role }: { role: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("https://api.zveno.ai/v1");
  const [model, setModel] = useState("google/gemini-3-flash-preview");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get<BotSettings>(`/admin/support/bot-settings?role=${role}`)
      .then((s) => {
        setApiKey(s.apiKey ?? "");
        setApiBaseUrl(s.apiBaseUrl);
        setModel(s.model);
        setSystemPrompt(s.systemPrompt ?? "");
        setTemperature(s.temperature);
        setMaxTokens(s.maxTokens);
        setEnabled(s.enabled);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [role]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api.patch<BotSettings>(`/admin/support/bot-settings?role=${role}`, {
        apiKey: apiKey || null,
        apiBaseUrl,
        model,
        systemPrompt: systemPrompt || null,
        temperature,
        maxTokens,
        enabled,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || "Ошибка сохранения");
    }
    setSaving(false);
  };

  const ROLE_LABELS: Record<string, string> = {
    mediator: "посредников",
    supplier: "поставщиков",
    buyer: "покупателей",
  };

  if (loading) {
    return <p className="text-muted text-center py-12">Загрузка настроек...</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Enable toggle */}
      <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between">
        <div>
          <p className="font-semibold">ИИ-бот для {ROLE_LABELS[role] ?? role}</p>
          <p className="text-xs text-muted">
            {enabled ? "Бот отвечает с помощью нейросети Zveno AI" : "Бот использует шаблонные ответы (regex)"}
          </p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative w-12 h-7 rounded-full transition ${enabled ? "bg-green-500" : "bg-gray-300"}`}
        >
          <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${enabled ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {/* API Settings */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-sm">🔑 Подключение к API</h3>

        <div>
          <label className="block text-xs font-medium text-muted mb-1">API ключ (Zveno AI)</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-[11px] text-muted mt-1">OpenAI-совместимый ключ от zveno.ai</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1">Base URL API</label>
          <input
            type="text"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder="https://api.zveno.ai/v1"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1">Модель нейросети</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="google/gemini-3-flash-preview">Google Gemini 3 Flash Preview (₽0.10/₽0.53)</option>
            <option value="x-ai/grok-4.1-fast">xAI Grok 4.1 Fast (₽0.06/₽0.14)</option>
            <option value="minimax/minimax-m2">MiniMax M2 (₽0.07/₽0.20)</option>
            <option value="google/gemini-3-flash">Google Gemini 3 Flash (₽0.10/₽0.40)</option>
            <option value="openai/gpt-4.1-mini">OpenAI GPT-4.1 Mini (₽0.40/₽1.60)</option>
          </select>
        </div>
      </div>

      {/* Generation params */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-sm">⚙️ Параметры генерации</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Температура: {temperature.toFixed(1)}
            </label>
            <input
              type="range" min="0" max="2" step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted mt-0.5">
              <span>0 — точные</span>
              <span>2 — креативные</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Макс. токенов</label>
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              min={128} max={8192} step={128}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* System prompt */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h3 className="font-semibold text-sm">📝 Системный промт</h3>
        <p className="text-[11px] text-muted">
          Инструкция для ИИ-бота при общении с {ROLE_LABELS[role] ?? role}. Опишите роль, правила ответов и FAQ.
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Вставьте промт здесь..."
          rows={16}
          className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
        >
          {saving ? "Сохранение..." : "Сохранить настройки"}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">Сохранено!</span>}
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
    </div>
  );
}

/* ========== Категории — AI-настройки ========== */

interface CategoryAiSettings {
  id: string;
  apiKey: string | null;
  apiBaseUrl: string;
  model: string;
  threshold: number;
  enabled: boolean;
  systemPrompt: string | null;
  updatedAt: string;
}

interface AdminCategory { id: string; name: string; icon: string | null; order: number; slug: string; children?: AdminCategory[] }

function CategoryAiTab() {
  // AI settings
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("https://api.zveno.ai/v1");
  const [model, setModel] = useState("google/gemini-flash-1.5");
  const [threshold, setThreshold] = useState(0.75);
  const [systemPrompt, setSystemPrompt] = useState("");
  // Test
  const [testQuery, setTestQuery] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ name: string; isNew: boolean } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  // Category management
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [addSubFor, setAddSubFor] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");

  const loadCats = () => {
    setCatsLoading(true);
    api.get<AdminCategory[]>("/admin/categories")
      .then(setCats)
      .catch(() => {})
      .finally(() => setCatsLoading(false));
  };

  useEffect(() => {
    api.get<CategoryAiSettings>("/admin/category-ai-settings")
      .then((s) => {
        setAiEnabled(s.enabled);
        setApiKey(s.apiKey ?? "");
        setApiBaseUrl(s.apiBaseUrl);
        setModel(s.model);
        setThreshold(s.threshold);
        setSystemPrompt(s.systemPrompt ?? "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    loadCats();
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      await api.patch("/admin/category-ai-settings", {
        enabled: aiEnabled, apiKey: apiKey || null, apiBaseUrl,
        model, threshold, systemPrompt: systemPrompt || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || "Ошибка сохранения");
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!testQuery.trim()) return;
    setTestLoading(true); setTestResult(null); setTestError(null);
    try {
      const r = await api.post<{ id: string; name: string; isNew: boolean }>(
        "/supplier/categories/match", { query: testQuery.trim() }
      );
      setTestResult(r);
      loadCats();
    } catch (e: any) {
      setTestError(e.message || "Ошибка теста");
    } finally { setTestLoading(false); }
  };

  const handleAddCat = async () => {
    const name = newCatName.trim();
    if (!name) return;
    setAddingCat(true);
    try {
      await api.post("/admin/categories", { name, icon: newCatIcon.trim() || undefined });
      setNewCatName(""); setNewCatIcon("");
      loadCats();
    } catch { /* ignore */ } finally { setAddingCat(false); }
  };

  const handleAddSub = async (parentId: string) => {
    const name = newSubName.trim();
    if (!name) return;
    setAddingCat(true);
    try {
      await api.post(`/admin/categories/${parentId}/sub`, { name });
      setNewSubName(""); setAddSubFor(null);
      loadCats();
    } catch { /* ignore */ } finally { setAddingCat(false); }
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm("Удалить категорию? Товары с этой категорией останутся, но потеряют привязку.")) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/categories/${id}`);
      loadCats();
    } catch { /* ignore */ } finally { setDeletingId(null); }
  };

  const handleSeed = async () => {
    setSeeding(true); setSeedResult(null);
    try {
      const r = await api.post<{ added: number }>("/admin/categories/seed");
      setSeedResult(r.added > 0 ? `Добавлено ${r.added} категорий` : "Все базовые категории уже есть");
      loadCats();
    } catch { /* ignore */ } finally { setSeeding(false); }
  };

  if (loading) return <p className="text-muted text-center py-12">Загрузка настроек...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Категории товаров</h2>
        <p className="text-sm text-muted">Управление списком категорий и настройки AI-матчинга.</p>
      </div>

      {/* ── Управление категориями ── */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">📂 Список категорий ({cats.length})</h3>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="text-xs px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition disabled:opacity-50 font-medium"
          >
            {seeding ? "Добавление..." : "＋ Добавить базовые"}
          </button>
        </div>
        {seedResult && <p className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">{seedResult}</p>}

        {/* Дерево категорий */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
            {catsLoading ? (
              <p className="text-muted text-center py-6 text-sm">Загрузка...</p>
            ) : cats.length === 0 ? (
              <p className="text-muted text-center py-6 text-sm">Нет категорий — нажмите «Добавить базовые»</p>
            ) : cats.map((parent, pi) => (
              <div key={parent.id} className={pi < cats.length - 1 ? "border-b border-border/40" : ""}>
                {/* Родительская категория */}
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-accent/30">
                  <span className="text-base w-6 text-center shrink-0">{parent.icon ?? "📦"}</span>
                  <span className="flex-1 text-sm font-semibold">{parent.name}</span>
                  <button
                    onClick={() => { setAddSubFor(addSubFor === parent.id ? null : parent.id); setNewSubName(""); }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition shrink-0"
                    title="Добавить под-категорию"
                  >
                    + под-кат.
                  </button>
                  <button
                    onClick={() => handleDeleteCat(parent.id)}
                    disabled={deletingId === parent.id}
                    className="shrink-0 w-5 h-5 text-muted hover:text-red-500 flex items-center justify-center transition text-xs"
                  >
                    {deletingId === parent.id ? "..." : "×"}
                  </button>
                </div>

                {/* Форма добавления под-категории */}
                {addSubFor === parent.id && (
                  <div className="flex gap-2 px-3.5 py-2 bg-primary/5 border-b border-border/30">
                    <input
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddSub(parent.id); if (e.key === "Escape") setAddSubFor(null); }}
                      placeholder="Название под-категории..."
                      autoFocus
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-border text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <button onClick={() => handleAddSub(parent.id)} disabled={addingCat || !newSubName.trim()}
                      className="px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-40">
                      {addingCat ? "..." : "Добавить"}
                    </button>
                    <button onClick={() => setAddSubFor(null)} className="px-2 py-1.5 text-xs text-muted hover:text-foreground">✕</button>
                  </div>
                )}

                {/* Под-категории */}
                {(parent.children ?? []).map((child, ci) => (
                  <div key={child.id} className={`flex items-center gap-2 pl-8 pr-3.5 py-2 ${ci < (parent.children ?? []).length - 1 ? "border-b border-border/20" : ""}`}>
                    <span className="text-muted text-xs shrink-0">└─</span>
                    <span className="flex-1 text-sm text-muted">{child.name}</span>
                    <button
                      onClick={() => handleDeleteCat(child.id)}
                      disabled={deletingId === child.id}
                      className="shrink-0 w-5 h-5 text-muted hover:text-red-500 flex items-center justify-center transition text-xs"
                    >
                      {deletingId === child.id ? "..." : "×"}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Добавить вручную */}
        <div className="flex gap-2 pt-1">
          <input
            value={newCatIcon}
            onChange={(e) => setNewCatIcon(e.target.value)}
            placeholder="🏷️"
            className="w-14 shrink-0 border border-border rounded-xl px-2 py-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddCat(); }}
            placeholder="Название новой категории..."
            className="flex-1 border border-border rounded-xl px-3.5 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={handleAddCat}
            disabled={addingCat || !newCatName.trim()}
            className="shrink-0 px-3.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
          >
            {addingCat ? "..." : "Добавить"}
          </button>
        </div>
        <p className="text-[11px] text-muted">Иконка — любой эмодзи. Порядок назначается автоматически.</p>
      </div>

      {/* Enable toggle */}
      <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between">
        <div>
          <p className="font-semibold">AI-матчинг категорий</p>
          <p className="text-xs text-muted mt-0.5">
            {aiEnabled
              ? "ИИ сопоставляет введённое название с существующими категориями"
              : "Отключён — при любом новом вводе создаётся новая категория"}
          </p>
        </div>
        <button
          onClick={() => setAiEnabled(!aiEnabled)}
          className={`relative w-12 h-7 rounded-full transition ${aiEnabled ? "bg-green-500" : "bg-gray-300"}`}
        >
          <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${aiEnabled ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {/* API Settings */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-sm">🔑 Подключение к API (Zveno AI)</h3>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">API ключ</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-[11px] text-muted mt-1">OpenAI-совместимый ключ от zveno.ai</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Base URL</label>
          <input
            type="text"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder="https://api.zveno.ai/v1"
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Модель</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="google/gemini-flash-1.5">Google Gemini Flash 1.5 (дешевле)</option>
            <option value="google/gemini-3-flash-preview">Google Gemini 3 Flash Preview</option>
            <option value="x-ai/grok-4.1-fast">xAI Grok 4.1 Fast</option>
            <option value="minimax/minimax-m2">MiniMax M2</option>
            <option value="openai/gpt-4.1-mini">OpenAI GPT-4.1 Mini</option>
          </select>
        </div>
      </div>

      {/* Threshold */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h3 className="font-semibold text-sm">⚡ Порог схожести: {Math.round(threshold * 100)}%</h3>
        <p className="text-[11px] text-muted">
          При значении {Math.round(threshold * 100)}% ИИ будет сопоставлять категории с уверенностью выше {Math.round(threshold * 100)}%.
          Ниже — создаётся новая. Рекомендуется 70–80%.
        </p>
        <input
          type="range" min="0.3" max="1.0" step="0.05"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted">
          <span>30% — создавать новые чаще</span>
          <span>100% — только точные совпадения</span>
        </div>
      </div>

      {/* System prompt */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h3 className="font-semibold text-sm">📝 Системный промт для категоризации</h3>
        <p className="text-[11px] text-muted">
          Инструкция для ИИ. Оставьте пустым для использования встроенного промта.
          В тексте можно использовать <code className="bg-accent px-1 rounded">{"{threshold}"}</code> — подставится текущий порог.
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Оставьте пустым для дефолтного промта..."
          rows={8}
          className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
        />
      </div>

      {/* Test */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h3 className="font-semibold text-sm">🧪 Тест AI-матчинга</h3>
        <p className="text-[11px] text-muted">Введите название — посмотрите как ИИ подберёт категорию из базы.</p>
        <div className="flex gap-2">
          <input
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleTest(); }}
            placeholder="Например: стол обеденный..."
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={handleTest}
            disabled={testLoading || !testQuery.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
          >
            {testLoading ? "..." : "Тест"}
          </button>
        </div>
        {testResult && (
          <div className={`text-sm rounded-xl px-4 py-3 font-medium ${testResult.isNew ? "bg-green-50 text-green-700 border border-green-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
            {testResult.isNew
              ? `✨ Создана новая категория: «${testResult.name}»`
              : `✓ Подобрана существующая категория: «${testResult.name}»`}
          </div>
        )}
        {testError && (
          <div className="text-sm rounded-xl px-4 py-3 bg-red-50 text-red-600 border border-red-200">
            ✗ {testError}
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
        >
          {saving ? "Сохранение..." : "Сохранить настройки"}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Сохранено</span>}
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 text-center shadow-sm">
      <p className={`text-3xl font-bold ${color ?? ""}`}>{value}</p>
      <p className="text-sm text-muted mt-1">{label}</p>
    </div>
  );
}
