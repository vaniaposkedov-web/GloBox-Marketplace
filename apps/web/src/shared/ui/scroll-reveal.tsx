"use client";

import { ReactNode } from "react";
import { useScrollReveal } from "@/shared/hooks/use-scroll-reveal";

type Animation = "fade-up" | "fade-left" | "fade-right" | "scale" | "zoom";

interface ScrollRevealProps {
  children: ReactNode;
  animation?: Animation;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article" | "li" | "span";
  threshold?: number;
}

const animMap: Record<Animation, string> = {
  "fade-up": "sr-fade-up",
  "fade-left": "sr-fade-left",
  "fade-right": "sr-fade-right",
  scale: "sr-scale",
  zoom: "sr-zoom",
};

export function ScrollReveal({
  children,
  animation = "fade-up",
  delay,
  className = "",
  as: Tag = "div",
  threshold = 0.15,
}: ScrollRevealProps) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>({ threshold });
  const state = visible ? "sr-visible" : "sr-hidden";
  const anim = animMap[animation];

  return (
    <div
      ref={ref}
      className={`${anim} ${state} ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Wrapper for staggered children: each direct child gets a sequential delay.
 */
export function ScrollRevealGroup({
  children,
  animation = "fade-up",
  staggerMs = 80,
  className = "",
  threshold = 0.1,
}: {
  children: ReactNode;
  animation?: Animation;
  staggerMs?: number;
  className?: string;
  threshold?: number;
}) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>({ threshold });
  const state = visible ? "sr-visible" : "sr-hidden";
  const anim = animMap[animation];

  const items = Array.isArray(children) ? children : [children];

  return (
    <div ref={ref} className={className}>
      {items.map((child, i) => (
        <div
          key={i}
          className={`${anim} ${state}`}
          style={{ transitionDelay: `${(i * staggerMs) / 1000}s` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
