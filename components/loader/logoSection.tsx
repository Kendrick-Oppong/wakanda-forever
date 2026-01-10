"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { SpriteLogo } from "../common/SpriteLogo";

const LOGO_SLIDE_DISTANCE = 200;
const LOGO_ANIMATION_DURATION = 0.8;
const LOGO_ANIMATION_OVERLAP = 0.6;

const LogoLoaderSectionComponent = () => {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timeline = gsap.timeline();

    timeline
      .fromTo(
        leftRef.current,
        { x: -LOGO_SLIDE_DISTANCE, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: LOGO_ANIMATION_DURATION,
          ease: "power3.out",
        }
      )
      .fromTo(
        rightRef.current,
        { x: LOGO_SLIDE_DISTANCE, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: LOGO_ANIMATION_DURATION,
          ease: "power3.out",
        },
        `-=${LOGO_ANIMATION_OVERLAP}`
      );
  }, []);

  return (
    <div className="flex items-center gap-4 mb-4">
      <div
        ref={leftRef}
        className="text-white text-sm font-bold tracking-wider opacity-0"
      >
        <SpriteLogo />
      </div>

      <div className="text-white/50">×</div>

      <div
        ref={rightRef}
        className="text-white text-xs tracking-widest opacity-0"
      >
        <Image
          src="/marvel-theater.webp"
          alt="Marvel Logo"
          width={150}
          height={150}
        />
      </div>
    </div>
  );
};

export const LogoLoaderSection = React.memo(LogoLoaderSectionComponent);
