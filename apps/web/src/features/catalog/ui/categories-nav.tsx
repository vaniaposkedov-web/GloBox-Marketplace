"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CategoryDto } from "@/shared/lib";
import { fetchCategories } from "../api";

interface Props {
  activeId?: string;
  onSelect?: (id: string | undefined) => void;
}

export function CategoriesNav({ activeId, onSelect }: Props) {
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  if (!categories) {
    return (
      <div className="flex gap-2 overflow-x-auto py-1">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-9 w-32 rounded-full bg-border/40 animate-pulse shrink-0"
          />
        ))}
      </div>
    );
  }

  function renderPill(
    label: string,
    icon: string | null,
    id: string | undefined,
    active: boolean,
  ) {
    const cls = `shrink-0 px-4 py-2 rounded-full border text-sm transition ${
      active
        ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
        : "border-border bg-white hover:border-primary/40 hover:bg-surface hover:-translate-y-0.5"
    }`;
    if (onSelect) {
      return (
        <button
          key={id ?? "all"}
          type="button"
          className={cls}
          onClick={() => onSelect(id)}
        >
          {icon && <span className="mr-1">{icon}</span>}
          {label}
        </button>
      );
    }
    return (
      <Link
        key={id ?? "all"}
        href={id ? `/listings?category=${id}` : "/listings"}
        className={cls}
      >
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </Link>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4">
      {renderPill("Все", null, undefined, !activeId)}
      {categories.map((c) =>
        renderPill(c.name, c.icon, c.id, c.id === activeId),
      )}
    </div>
  );
}
