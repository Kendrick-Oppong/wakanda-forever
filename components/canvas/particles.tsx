"use client";

import { Particle } from "@/interfaces/particles";
import { createParticle, drawParticle, updateParticle } from "@/lib/particles";
import { useEffect, useRef } from "react";

export function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrameId: number;
    let particles: Particle[] = [];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", resize);
    resize();

    // Configuration
    const particleCount = 150;

    // Initializing particles using factory function
    particles = Array.from({ length: particleCount }, () =>
      createParticle(width, height)
    );

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles = particles.map((particle) => {
        const updatedParticle = updateParticle(particle, height);
        drawParticle(updatedParticle, ctx);
        return updatedParticle;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-20 pointer-events-none"
    />
  );
}
