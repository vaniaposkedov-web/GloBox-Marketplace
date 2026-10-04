"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "antd";
import {
  Check, ImageIcon, ShoppingCart, AlertCircle, X,
} from "lucide-react";
import { addToCart } from "../api";
import { emitCartChanged } from "../use-cart-count";
import { ApiError } from "@/shared/api/client";

interface Props {
  open: boolean;
  onClose: () => void;
  listingId: string;
  title: string;
  images: string[];
  qty: number;
}

export function AddToCartModal({ open, onClose, listingId, title, images, qty }: Props) {
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [clarification, setClarification] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedPhoto(0);
      setClarification("");
      setError(null);
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [open]);

  async function handleSubmit() {
    if (!clarification.trim()) {
      setError("Опишите уточнения: размер, цвет и другие пожелания");
      textareaRef.current?.focus();
      return;
    }
    if (clarification.length > 500) {
      setError("Максимум 500 символов");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await addToCart({
        listingId,
        qty,
        selectedPhotoUrl: images.length > 0 ? (images[selectedPhoto] ?? images[0]) : undefined,
        clarification: clarification.trim(),
      });
      emitCartChanged();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setError(err.payload?.message ?? "Не удалось добавить в корзину");
      else setError("Не удалось добавить в корзину");
    } finally {
      setLoading(false);
    }
  }

  const hasImages = images.length > 0;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      centered
      closeIcon={null}
      styles={{
        container: { borderRadius: 24, overflow: "hidden", padding: 0 },
        body: { padding: 0 },
        mask: { backdropFilter: "blur(6px)", background: "rgba(0,0,0,0.35)" },
      }}
    >
      {/* ── Header ── */}
      <div
        className="relative flex items-center gap-3.5 px-5 py-4 border-b border-gray-100"
        style={{ background: "linear-gradient(135deg,#fdf4ff 0%,#fff1f2 100%)" }}
      >
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg,#d946ef,#e11d48)",
            boxShadow: "0 6px 16px rgba(217,70,239,0.4)",
          }}
        >
          <ShoppingCart className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-bold text-gray-900 leading-tight">Добавить в корзину</p>
          <p className="text-[12px] text-gray-500 truncate leading-snug mt-0.5">{title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/80 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white transition-all shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="px-5 py-5 space-y-5">

        {/* Photo section */}
        {hasImages ? (
          <div>
            <p className="text-[13px] font-semibold text-gray-800 mb-1">
              Вариант товара <span className="text-red-500">*</span>
            </p>
            <p className="text-[12px] text-gray-400 mb-3">
              Укажите посреднику — какой именно вариант купить
            </p>
            <div className="flex flex-wrap gap-2">
              {images.map((url, i) => (
                <button
                  key={url + i}
                  type="button"
                  onClick={() => setSelectedPhoto(i)}
                  className="relative w-20 h-20 rounded-xl border-2 transition-all duration-150 active:scale-95 bg-gray-50 shrink-0"
                  style={{
                    borderColor: i === selectedPhoto ? "#d946ef" : "#e5e7eb",
                    boxShadow: i === selectedPhoto
                      ? "0 0 0 3px rgba(217,70,239,0.18)"
                      : "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  <div className="absolute inset-0 rounded-[10px] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                  {i === selectedPhoto && (
                    <span
                      className="absolute bottom-1 right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#d946ef,#e11d48)", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}
                    >
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5 text-gray-300" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-600">Фото не добавлены продавцом</p>
              <p className="text-[12px] text-gray-400 mt-0.5">Опишите нужный вариант в уточнениях ниже</p>
            </div>
          </div>
        )}

        {/* Clarification textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[13px] font-semibold text-gray-800">
              Уточнения для посредника <span className="text-red-500">*</span>
            </p>
            <span
              className="text-[11px] tabular-nums font-medium transition-colors"
              style={{ color: clarification.length > 450 ? "#f59e0b" : "#d1d5db" }}
            >
              {clarification.length}/500
            </span>
          </div>
          <p className="text-[12px] text-gray-400 mb-2.5">
            Размер, цвет, количество и любые пожелания — видит только посредник
          </p>
          <textarea
            ref={textareaRef}
            value={clarification}
            onChange={(e) => { if (e.target.value.length <= 500) setClarification(e.target.value); }}
            placeholder="Например: размер L, чёрный цвет, 2 штуки"
            rows={3}
            className="w-full rounded-2xl px-4 py-3 text-[13.5px] text-gray-800 placeholder:text-gray-300 resize-none outline-none transition-all leading-relaxed"
            style={{
              border: error ? "1.5px solid #fca5a5" : "1.5px solid #e5e7eb",
              background: "#fafafa",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = error ? "#fca5a5" : "#d946ef";
              e.currentTarget.style.boxShadow = error
                ? "0 0 0 3px rgba(252,165,165,0.15)"
                : "0 0 0 3px rgba(217,70,239,0.1)";
              e.currentTarget.style.background = "#fff";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error ? "#fca5a5" : "#e5e7eb";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.background = "#fafafa";
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-red-50 border border-red-100">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-[13px] text-red-600">{error}</p>
          </div>
        )}

        {/* Footer hint */}
        <p className="text-[12px] text-gray-400 leading-relaxed">
          Посредник найдёт товар на рынке точно по вашему описанию. Чем подробнее — тем точнее результат.
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl text-[14px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all active:scale-[.98]"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !clarification.trim()}
            className="flex-[1.6] py-3.5 rounded-2xl text-[14px] font-bold text-white transition-all disabled:opacity-50 active:scale-[.98] flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg,#d946ef,#e11d48)",
              boxShadow: clarification.trim() && !loading
                ? "0 6px 22px rgba(217,70,239,0.45)"
                : "none",
            }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Добавляем...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                В корзину
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
