"use client";

import { validatePassword, type PasswordStrength } from "@/shared/lib";

interface Props {
  password: string;
}

const LABEL: Record<PasswordStrength, string> = {
  weak: "Слабый",
  medium: "Средний",
  strong: "Сильный",
};

const COLOR: Record<PasswordStrength, string> = {
  weak: "bg-danger",
  medium: "bg-yellow-500",
  strong: "bg-success",
};

const WIDTH: Record<PasswordStrength, string> = {
  weak: "w-1/3",
  medium: "w-2/3",
  strong: "w-full",
};

export function PasswordStrengthBar({ password }: Props) {
  if (!password) return null;
  const { strength, errors } = validatePassword(password);
  return (
    <div className="flex flex-col gap-1 mt-1">
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className={`h-full ${COLOR[strength]} ${WIDTH[strength]} transition-all`} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted">Сила пароля</span>
        <span
          className={
            strength === "weak"
              ? "text-danger"
              : strength === "medium"
                ? "text-yellow-600"
                : "text-success"
          }
        >
          {LABEL[strength]}
        </span>
      </div>
      {errors.length > 0 && (
        <ul className="text-xs text-muted list-disc pl-4">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
