"use client";

interface Props {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Логотип ВКонтакте (инлайновый SVG).
 * Источник: открытый публичный глиф, упрощен под моно-цветной знак.
 */
export function VkIcon({ size = 20, className = "", color = "currentColor" }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      fill={color}
      aria-hidden
    >
      <path d="M25.74 34.2c-11.73 0-19-8.3-19.24-21.88h6.2c.17 9.98 4.85 14.28 8.3 15.16V12.32h6v9.05c3.31-.37 6.79-4.27 7.96-9.05h5.88a14.6 14.6 0 0 1-6.72 9.7c2.98 1.63 6.95 4.76 8.55 9.58h-6.48c-1.2-3.64-4.18-6.5-8.19-6.96v6.96h-1.46c-0.24 0-0.52 .04-0.8 .04Z" />
    </svg>
  );
}
