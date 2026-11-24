"use client";

import { useRef, useState, type ReactNode } from "react";

interface TiltCard3DProps {
  children: ReactNode;
  className?: string;
  maxDeg?: number;
  glare?: boolean;
}

export function TiltCard3D({
  children,
  className = "",
  maxDeg = 4.5,
  glare = true,
}: TiltCard3DProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({
    rx: 0,
    ry: 0,
    gx: 50,
    gy: 35,
    active: false,
  });

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const ry = (x - 0.5) * (maxDeg * 2);
    const rx = (0.5 - y) * (maxDeg * 2);
    setTilt({
      rx,
      ry,
      gx: Math.round(x * 100),
      gy: Math.round(y * 100),
      active: true,
    });
  }

  function handlePointerLeave() {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 35, active: false });
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        transform: `perspective(950px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
        transformStyle: "preserve-3d",
        transition: tilt.active
          ? "transform 90ms ease-out"
          : "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      className={`relative ${className}`}
    >
      {children}
      {glare && (
        <div
          aria-hidden="true"
          style={{
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)`,
            opacity: tilt.active ? 1 : 0,
            transition: "opacity 240ms ease",
          }}
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
        />
      )}
    </div>
  );
}
