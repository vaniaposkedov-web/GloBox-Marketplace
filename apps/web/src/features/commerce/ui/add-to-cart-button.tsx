"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Check } from "lucide-react";
import { addToCart } from "../api";
import { emitCartChanged } from "../use-cart-count";
import { useSession } from "@/shared/auth";
import { Button } from "@/shared/ui";
import { ApiError } from "@/shared/api/client";

interface Props {
  listingId: string;
  stock: number;
  disabled?: boolean;
  qty?: number;
}

export function AddToCartButton({ listingId, stock, disabled, qty: externalQty }: Props) {
  const router = useRouter();
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!user) {
      router.push(`/login?next=/listings/${listingId}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await addToCart({ listingId, qty: externalQty ?? 1 });
      emitCartChanged();
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } catch (err) {
      if (err instanceof ApiError) setError(err.payload.message);
      else setError("Не удалось добавить");
    } finally {
      setLoading(false);
    }
  }

  const soldOut = stock <= 0;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleClick}
        loading={loading}
        disabled={disabled || soldOut}
        className="w-full"
      >
        {added ? (
          <span className="inline-flex items-center gap-2">
            <Check className="w-4 h-4" /> Добавлено
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            {soldOut ? "Нет в наличии" : "В корзину"}
          </span>
        )}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
      {!soldOut && stock <= 3 && (
        <p className="text-xs text-amber-600">
          Осталось всего {stock} шт.
        </p>
      )}
    </div>
  );
}
