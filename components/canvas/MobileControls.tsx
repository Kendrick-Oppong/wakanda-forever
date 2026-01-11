"use client";

import { MobileControlsProps } from "@/interfaces/particles";
import { useEffect, useRef, useState } from "react";

export function MobileControls({
  onPan,
  onWarp,
  isDocked,
}: Readonly<MobileControlsProps>) {
  const [activePan, setActivePan] = useState<{ x: number; y: number } | null>(
    null
  );
  const [activeWarp, setActiveWarp] = useState<number | null>(null);

  // References for loops
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const warpRef = useRef<number | null>(null);

  useEffect(() => {
    let frameId: number;

    const loop = () => {
      if (panRef.current) {
        onPan(panRef.current.x * 15, panRef.current.y * 15);
      }

      if (warpRef.current !== null) {
        onWarp(warpRef.current);
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [onPan, onWarp]);

  if (isDocked) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none touch-none md:hidden">
      {/* LEFT: D-PAD (PANNING) */}
      <div className="absolute bottom-8 left-8 w-32 h-32 pointer-events-auto">
        {/* Visual Ring */}
        <div className="absolute inset-0 rounded-full border border-white/20 bg-black/40 backdrop-blur-md" />

        {/* Center Dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white/10 rounded-full" />

        {/* Interaction Zone */}
        <div
          className="absolute inset-0 rounded-full cursor-pointer touch-none mobile-control"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            panRef.current = { x: -x * 2, y: -y * 2 };
            setActivePan({ x, y });
          }}
          onPointerMove={(e) => {
            if (!panRef.current) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            panRef.current = { x: -x * 2, y: -y * 2 };
            setActivePan({ x, y });
          }}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            panRef.current = null;
            setActivePan(null);
          }}
          onPointerLeave={(e) => {
            if (panRef.current) {
              panRef.current = null;
              setActivePan(null);
            }
          }}
        />

        {/* Active Indicator */}
        {activePan && (
          <div
            className="absolute top-1/2 left-1/2 w-8 h-8 rounded-full bg-cosmic-green/50 blur-md transition-transform duration-75 pointer-events-none"
            style={{
              transform: `translate(calc(-50% + ${
                activePan.x * 100
              }px), calc(-50% + ${activePan.y * 100}px))`,
            }}
          />
        )}

        {/* Directions Hints */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white/30 text-[10px] pointer-events-none">
          ▲
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/30 text-[10px] pointer-events-none">
          ▼
        </div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30 text-[10px] pointer-events-none">
          ◀
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 text-[10px] pointer-events-none">
          ▶
        </div>
      </div>

      {/* RIGHT: THROTTLE (WARPING) */}
      <div className="absolute bottom-8 right-8 w-12 h-48 pointer-events-auto">
        <div className="absolute inset-0 rounded-full border border-white/20 bg-black/40 backdrop-blur-md overflow-hidden">
          {/* Fill Level */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-cosmic-green/30 transition-all duration-75 ease-linear"
            style={{ height: `${activeWarp ? Math.min(activeWarp, 100) : 0}%` }}
          />
        </div>

        <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-white/40 tracking-widest whitespace-nowrap pointer-events-none">
          WARP DRIVE
        </div>

        {/* Interaction Zone */}
        <div
          className="absolute inset-0 rounded-full cursor-pointer touch-none mobile-control"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const rect = e.currentTarget.getBoundingClientRect();
            const rawVal = 1 - (e.clientY - rect.top) / rect.height;
            const val = Math.max(0, Math.min(rawVal, 1)) * 100;
            warpRef.current = val;
            setActiveWarp(val);
          }}
          onPointerMove={(e) => {
            if (warpRef.current === null) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const rawVal = 1 - (e.clientY - rect.top) / rect.height;
            const val = Math.max(0, Math.min(rawVal, 1)) * 100;
            warpRef.current = val;
            setActiveWarp(val);
          }}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            warpRef.current = null;
            setActiveWarp(null);
          }}
          onPointerLeave={(e) => {
            if (warpRef.current !== null) {
              warpRef.current = null;
              setActiveWarp(null);
            }
          }}
        />
      </div>
    </div>
  );
}
