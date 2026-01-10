"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { Particles } from "./canvas/particles";
import { CosmicExplorer } from "./canvas/CosmicExplorer";

export function GalaxyEntrance() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Door Container for Continuous Zoom
  const doorWrapperRef = useRef<HTMLDivElement>(null);

  // Door Layers
  const aboutToOpenRef = useRef<HTMLDivElement>(null);
  const halfOpenRef = useRef<HTMLDivElement>(null);

  // Hall Layers
  const hallWideRef = useRef<HTMLDivElement>(null);

  // Effects
  const particlesRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      gsap.set(containerRef.current, { opacity: 1 });

      // Initial states
      gsap.set(doorWrapperRef.current, { scale: 1 });
      gsap.set(aboutToOpenRef.current, { opacity: 1 });
      gsap.set(halfOpenRef.current, { opacity: 0 });

      tl.to(
        doorWrapperRef.current,
        {
          scale: 12,
          duration: 3.5,
          ease: "power2.inOut",
        },
        0
      );

      tl.to(
        halfOpenRef.current,
        { opacity: 1, duration: 0.5, ease: "none" },
        0.6
      );
      tl.to(
        aboutToOpenRef.current,
        { opacity: 0, duration: 0.5, ease: "none" },
        "<"
      );

      // Starting Particles slightly earlier
      if (particlesRef.current) {
        tl.to(particlesRef.current, { opacity: 1, duration: 1.5 }, 1.5);
      }

      if (flashRef.current) {
        tl.to(
          flashRef.current,
          { opacity: 1, duration: 0.2, ease: "power2.in" },
          2.4
        );
      }

      tl.set(halfOpenRef.current, { opacity: 0 }, 2.6);
      tl.set(hallWideRef.current, { opacity: 1, scale: 1.1 }, 2.6);

      // Fade out flash
      if (flashRef.current) {
        tl.to(
          flashRef.current,
          {
            opacity: 0,
            duration: 1.0,
            ease: "power2.out",
          },
          2.6
        );
      }

      tl.to(
        hallWideRef.current,
        {
          scale: 1.0,
          duration: 4,
          ease: "power1.out",
        },
        2.6
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black pointer-events-none overflow-hidden"
    >
      {/* CONTINUOUS ZOOM WRAPPER */}
      <div
        ref={doorWrapperRef}
        className="absolute inset-0 w-full h-full origin-center"
      >
        {/* Door Images */}
        <div ref={aboutToOpenRef} className="absolute inset-0 w-full h-full">
          <Image
            src="/half-open.png"
            alt="Door opening"
            fill
            className="object-cover object-center"
            priority
          />
        </div>
        <div
          ref={halfOpenRef}
          className="absolute inset-0 w-full h-full opacity-0"
        >
          <Image
            src="/fully-open.png"
            alt="Door half open"
            fill
            className="object-cover object-center"
            priority
          />
        </div>
      </div>

      {/* HALL SEQUENCE */}
      <div
        ref={hallWideRef}
        className="absolute inset-0 w-full h-full opacity-0 z-10 pointer-events-auto"
      >
        <CosmicExplorer />
      </div>

      {/* VFX LAYERS */}
      <div
        ref={particlesRef}
        className="absolute inset-0 w-full h-full opacity-0 z-20 pointer-events-none"
      >
        <Particles />
      </div>

      {/* Flash Transition Overlay */}
      <div
        ref={flashRef}
        className="absolute inset-0 w-full h-full bg-green-900 opacity-0 z-30 mix-blend-hard-light"
      ></div>
    </div>
  );
}
