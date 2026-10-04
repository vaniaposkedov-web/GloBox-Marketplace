"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/**
 * Hook that returns a ref and a boolean indicating if the element is visible.
 * Attach the ref to the element you want to observe.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {},
) {
  const { threshold = 0.15, rootMargin = "0px 0px -60px 0px", once = true } = options;
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, visible };
}

/**
 * Component-level helper: returns className that triggers CSS animation on scroll.
 * Usage: className={`${revealClass} sr-fade-up`}
 */
export function useRevealClass(options?: ScrollRevealOptions) {
  const { ref, visible } = useScrollReveal(options);
  return { ref, revealClass: visible ? "sr-visible" : "sr-hidden" };
}
