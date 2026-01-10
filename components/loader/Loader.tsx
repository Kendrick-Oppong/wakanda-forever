"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { LogoLoaderSection } from "./logoSection";
import { WakandaTextLogo } from "./WakandaTextLogo";

const LOADER_DURATION = 3000;
interface LoaderProps {
  onComplete?: () => void;
}

export function Loader({ onComplete }: Readonly<LoaderProps>) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progressValue = Math.min((elapsed / LOADER_DURATION) * 100, 100);

      setProgress(progressValue);

      if (progressValue < 100) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        setIsComplete(true);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    if (isComplete && loaderRef.current) {
      // Slide-up curtain animation
      gsap.to(loaderRef.current, {
        y: "-100%",
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: () => {
          setShouldHide(true);
          onComplete?.(); //we notify parent that loader is complete
        },
      });
    }
  }, [isComplete, onComplete]);

  if (shouldHide) return null;

  return (
    <div
      ref={loaderRef}
      className="fixed inset-0 z-9999 flex items-center justify-center bg-[#0a0a0a]"
    >
      {/* Base geometric pattern background */}
      <div className="absolute inset-0 opacity-15">
        <Image
          src="/menu-bg.webp"
          alt="Background texture"
          fill
          className="object-cover"
          priority
        />
      </div>
      <div className="absolute inset-0 bg-white opacity-10" />

      {/* Subtle overlay pattern */}
      <div className="absolute inset-0">
        <Image
          src="/loader-bg.png"
          alt="Background pattern"
          fill
          className="object-cover"
          priority
        />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        <LogoLoaderSection />

        <div className="text-center">
          <WakandaTextLogo />
        </div>

        <div className="w-64 md:w-96 mt-8">
          <div className="relative h-0.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-emerald-400 to-emerald-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="relative h-8 mt-1">
            <div
              className="absolute text-sm text-white/60 font-mono -translate-x-1/2"
              style={{ left: `${progress}%` }}
            >
              {Math.round(progress)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
