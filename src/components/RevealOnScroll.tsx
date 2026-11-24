"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}

export function RevealOnScroll({
  children,
  className = "",
  delayMs = 0,
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window === "undefined" ||
      typeof IntersectionObserver === "undefined"
    ) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(el);
            break;
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={`reveal-base ${visible ? "reveal-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
