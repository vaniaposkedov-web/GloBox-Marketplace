"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  CalendarDays,
  MapPin,
  Truck,
  MessageSquare,
} from "lucide-react";
import { SiteHeader } from "@/widgets/header";
import { Button } from "@/shared/ui";
import { ApiError } from "@/shared/api/client";
import { useSession } from "@/shared/auth";
import {
  emitCartChanged,
  getCart,
  createMediatorOrder,
} from "@/features/commerce";
import {
  formatPrice,
  type CartDto,
} from "@/shared/lib";

type Step = 1 | 2;

interface FormData {
  recipientFirstName: string;
  recipientLastName: string;
  recipientMiddleName: string;
  recipientPhone: string;
  deliveryMethod: string;
  deliveryAddress: string;
  desiredPurchaseDate: string;
  commentToMediator: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, hydrated } = useSession();
  const [cart, setCart] = useState<CartDto | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    recipientFirstName: "",
    recipientLastName: "",
    recipientMiddleName: "",
    recipientPhone: "",
    deliveryMethod: "",
    deliveryAddress: "",
    desiredPurchaseDate: "",
    commentToMediator: "",
  });

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login?next=/checkout");
      return;
    }
    getCart()
      .then((c) => {
        if (c.items.length === 0) {
          router.replace("/cart");
          return;
        }
        setCart(c);
        // Prefill name from user profile
        setForm((f) => ({
          ...f,
          recipientFirstName: user.firstName || "",
          recipientLastName: user.lastName || "",
        }));
      })
      .catch(() => router.replace("/cart"));
  }, [hydrated, user, router]);

  function updateField(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateStep1(): string | null {
    if (!form.recipientFirstName.trim()) return "Укажите имя получателя";
    if (!form.recipientLastName.trim()) return "Укажите фамилию получателя";
    if (!form.recipientPhone.trim()) return "Укажите телефон получателя";
    if (!form.deliveryMethod.trim()) return "Укажите способ доставки";
    if (!form.deliveryAddress.trim()) return "Укажите адрес доставки";
    if (!form.desiredPurchaseDate) return "Укажите желаемую дату закупки";
    return null;
  }

  function handleNextStep() {
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const order = await createMediatorOrder({
        recipientFirstName: form.recipientFirstName.trim(),
        recipientLastName: form.recipientLastName.trim(),
        recipientMiddleName: form.recipientMiddleName.trim() || undefined,
        recipientPhone: form.recipientPhone.trim(),
        deliveryMethod: form.deliveryMethod.trim(),
        deliveryAddress: form.deliveryAddress.trim(),
        desiredPurchaseDate: form.desiredPurchaseDate,
        commentToMediator: form.commentToMediator.trim() || undefined,
      });
      emitCartChanged();
      setCreatedOrderId(order.id);
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof ApiError ? err.payload.message : "Ошибка при создании заказа";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated || !user || !cart) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10">
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/60 border border-border/40 animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md fade-in-up">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-emerald-100 to-green-50 flex items-center justify-center mb-5 shadow-lg shadow-emerald-200/30">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-extrabold mb-2">Заказ опубликован!</h1>
            <p className="text-muted text-sm mb-6">
              Ваш заказ отправлен посредникам. Как только кто-то откликнется,
              вы сможете выбрать исполнителя и начать диалог.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={createdOrderId ? `/mediator-orders/${createdOrderId}` : "/mediator-orders"}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-md shadow-amber-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                Перейти к заказу
              </Link>
              <Link
                href="/listings"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-border/50 text-sm font-medium hover:bg-stone-50 transition"
              >
                Продолжить покупки
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:py-6 pb-28 sm:pb-8">
        {/* Back + Title */}
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => (step === 1 ? router.back() : setStep(1))}
            className="w-9 h-9 rounded-xl bg-white border border-border/40 flex items-center justify-center hover:bg-stone-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Оформление заказа</h1>
            <p className="text-sm text-muted">Шаг {step} из 2</p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex gap-2 mb-6">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                s <= step
                  ? "bg-gradient-to-r from-amber-400 to-orange-400"
                  : "bg-border/50"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: Recipient & Delivery Info (TZ 5.2.3) */}
        {step === 1 && (
          <div className="fade-in-up space-y-5">
            {/* Recipient */}
            <div className="rounded-2xl bg-white border border-border/40 p-5">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                Данные получателя
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <InputField
                  label="Фамилия"
                  required
                  value={form.recipientLastName}
                  onChange={(v) => updateField("recipientLastName", v)}
                  placeholder="Иванов"
                />
                <InputField
                  label="Имя"
                  required
                  value={form.recipientFirstName}
                  onChange={(v) => updateField("recipientFirstName", v)}
                  placeholder="Иван"
                />
                <InputField
                  label="Отчество"
                  value={form.recipientMiddleName}
                  onChange={(v) => updateField("recipientMiddleName", v)}
                  placeholder="Иванович (необязательно)"
                />
                <InputField
                  label="Телефон"
                  required
                  value={form.recipientPhone}
                  onChange={(v) => updateField("recipientPhone", v)}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
            </div>

            {/* Delivery */}
            <div className="rounded-2xl bg-white border border-border/40 p-5">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-500" />
                Доставка
              </h2>
              <div className="space-y-3">
                <InputField
                  label="Способ доставки"
                  required
                  value={form.deliveryMethod}
                  onChange={(v) => updateField("deliveryMethod", v)}
                  placeholder="СДЭК, Почта России, самовывоз, курьер..."
                />
                <InputField
                  label="Адрес доставки"
                  required
                  value={form.deliveryAddress}
                  onChange={(v) => updateField("deliveryAddress", v)}
                  placeholder="Город, улица, дом, квартира"
                />
              </div>
            </div>

            {/* Date & Comment */}
            <div className="rounded-2xl bg-white border border-border/40 p-5">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-500" />
                Дата и пожелания
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Желаемая дата начала закупки <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.desiredPurchaseDate}
                    onChange={(e) => updateField("desiredPurchaseDate", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-muted" />
                    Комментарий посреднику
                  </label>
                  <textarea
                    value={form.commentToMediator}
                    onChange={(e) => updateField("commentToMediator", e.target.value)}
                    placeholder="Особые пожелания, детали заказа..."
                    maxLength={500}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition resize-none"
                  />
                </div>
              </div>
            </div>

            <Button
              type="button"
              className="w-full py-3 rounded-xl"
              onClick={handleNextStep}
            >
              Далее — проверить заказ
            </Button>
          </div>
        )}

        {/* Step 2: Review & Confirm */}
        {step === 2 && (
          <div className="fade-in-up space-y-4">
            <h2 className="text-lg font-bold">Проверьте и подтвердите</h2>

            {/* Items */}
            <div className="rounded-2xl bg-white border border-border/40 p-4">
              <div className="text-xs text-muted font-medium uppercase tracking-wide mb-3">
                Товары ({cart.count})
              </div>
              <div className="space-y-2">
                {cart.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 py-2">
                    <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0">
                      {(it.selectedPhotoUrl || it.imageUrl) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.selectedPhotoUrl || it.imageUrl!} alt={it.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-stone-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{it.title}</p>
                      {it.clarification && (
                        <p className="text-xs text-muted line-clamp-1">{it.clarification}</p>
                      )}
                    </div>
                    <div className="text-sm font-bold shrink-0">
                      {formatPrice(it.price * it.qty, it.currency)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/40 mt-3 pt-3 flex justify-between">
                <span className="font-semibold text-sm">Итого товары</span>
                <span className="text-lg font-extrabold">{formatPrice(cart.total, cart.currency)}</span>
              </div>
            </div>

            {/* Recipient summary */}
            <div className="rounded-2xl bg-white border border-border/40 p-4">
              <div className="text-xs text-muted font-medium uppercase tracking-wide mb-3">Получатель</div>
              <div className="text-sm space-y-1">
                <p><span className="text-muted">ФИО:</span> {form.recipientLastName} {form.recipientFirstName} {form.recipientMiddleName}</p>
                <p><span className="text-muted">Телефон:</span> {form.recipientPhone}</p>
                <p><span className="text-muted">Доставка:</span> {form.deliveryMethod}</p>
                <p><span className="text-muted">Адрес:</span> {form.deliveryAddress}</p>
                <p><span className="text-muted">Дата закупки:</span> {new Date(form.desiredPurchaseDate).toLocaleDateString("ru-RU")}</p>
                {form.commentToMediator && (
                  <p><span className="text-muted">Комментарий:</span> {form.commentToMediator}</p>
                )}
              </div>
            </div>

            {/* Warning */}
            <div className="rounded-xl bg-amber-50 border border-amber-200/60 p-4 flex gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800 mb-1">Как это работает</p>
                <p className="text-amber-700/80 text-xs leading-relaxed">
                  После публикации заказа доступные посредники увидят его и смогут откликнуться.
                  Вы выбираете подходящего исполнителя и ведёте диалог в чате.
                  Оплата происходит вне платформы — напрямую посреднику.
                </p>
              </div>
            </div>

            <Button
              type="button"
              className="w-full py-3 rounded-xl"
              loading={loading}
              onClick={handleConfirm}
            >
              Опубликовать заказ
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Input Field ── */

function InputField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
      />
    </div>
  );
}
