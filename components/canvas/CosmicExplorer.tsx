"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import gsap from "gsap";
import { COSMIC_CREW, SECRET_PLANET } from "@/constants/cosmic-explorer";
import {
  playSound as playSoundUtil,
  playUnlockSound,
  startAmbientSound as startAmbientSoundUtil,
  stopAmbientSound,
} from "@/lib/audio";
import { createStar, createNebula, project as projectUtil } from "@/lib/canvas";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { MobileControls } from "./MobileControls";
import {
  drawBackground,
  drawNebulas,
  drawStars,
  drawConstellationLines,
  drawUFO,
  drawPlanets,
  getVisiblePlanetsWithHitTest,
} from "@/lib/cosmic-renderer";

const CREW = COSMIC_CREW;

export function CosmicExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activePlanet, setActivePlanet] = useState<(typeof CREW)[0] | null>(
    null
  );

  // Game state
  const [visitedPlanets, setVisitedPlanets] = useState<Set<string>>(new Set());
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [missionCompleteDismissed, setMissionCompleteDismissed] =
    useState(false);
  
  const [cameraZ, setCameraZ] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [secretUnlocked, setSecretUnlocked] = useState(false);

  const isMutedRef = useRef(isMuted);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientOscillatorsRef = useRef<OscillatorNode[]>([]);
  const ambientStartedRef = useRef(false);

  const targetZRef = useRef(0);
  const targetOffsetXRef = useRef(0);
  const targetOffsetYRef = useRef(0);

  useEffect(() => {
    isMutedRef.current = isMuted;

    //ambient sound toggle
    if (audioContextRef.current && ambientStartedRef.current) {
      if (isMuted) {
        stopAmbientSound(ambientOscillatorsRef.current);
        ambientOscillatorsRef.current = [];
      } else {
        const result = startAmbientSoundUtil(audioContextRef.current, false);
        ambientOscillatorsRef.current = result.oscillators;
      }
    }
  }, [isMuted]);
  const onSecretUnlocked = useEffectEvent(() => {
    setSecretUnlocked(true);
  });

  // Checking for secret unlock
  useEffect(() => {
    if (visitedPlanets.size === CREW.length && !secretUnlocked) {
      onSecretUnlocked();
      playUnlockSound(isMuted);
    }
  }, [visitedPlanets, secretUnlocked, isMuted]);

  useBackgroundMusic("/space-music.mp3", isMuted, 0.3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let frameId: number;

    if (!audioContextRef.current && typeof window !== "undefined") {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as unknown as Window & {
            webkitAudioContext: typeof AudioContext;
          }
        ).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    const audioContext = audioContextRef.current;

    const playSound = (
      frequency: number,
      duration: number,
      volume: number = 0.1
    ) => {
      playSoundUtil(
        audioContext,
        frequency,
        duration,
        volume,
        isMutedRef.current
      );
    };

    const ensureAmbient = () => {
      if (
        !ambientStartedRef.current &&
        !isMutedRef.current &&
        audioContextRef.current
      ) {
        audioContextRef.current.resume().then(() => {
          const result = startAmbientSoundUtil(audioContextRef.current, false);
          ambientOscillatorsRef.current = result.oscillators;
          ambientStartedRef.current = true;
        });
      } else if (!ambientStartedRef.current && audioContextRef.current) {
        ambientStartedRef.current = true;
      }
    };

    const camera = { x: 0, y: 0, z: 0 };
    let isDocked = false;
    let hoverId: string | null = null;
    let warpSpeed = 0;
    let lastZ = 0;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    let currentOffsetX = 0;
    let currentOffsetY = 0;

    const handleWheel = (e: WheelEvent) => {
      ensureAmbient();
      if (isDocked) return;
      targetZRef.current += e.deltaY * 2;
      targetZRef.current = Math.max(0, Math.min(targetZRef.current, 8000));

      const scrollSpeed = Math.abs(e.deltaY);
      if (scrollSpeed > 50) {
        playSound(200 + scrollSpeed, 100, 0.05);
      }
    };

    const mouse = { x: 0, y: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      // dragging
      if (isDragging && !isDocked) {
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;

        targetOffsetXRef.current = currentOffsetX - deltaX;
        targetOffsetYRef.current = currentOffsetY - deltaY;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(".mobile-control")) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      currentOffsetX = targetOffsetXRef.current;
      currentOffsetY = targetOffsetYRef.current;
      document.body.style.cursor = "grabbing";
    };

    const handleMouseUp = () => {
      isDragging = false;
      document.body.style.cursor = "default";
    };

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartOffsetX = 0;
    let touchStartOffsetY = 0;
    let touchStartTime = 0;

    // Pinch Zoom Variables
    let initialPinchDistance = 0;
    let startPinchZ = 0;
    let isPinching = false;

    const getTouchDistance = (
      touch1: React.Touch | Touch,
      touch2: React.Touch | Touch
    ) => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest(".mobile-control")) return;
      ensureAmbient();

      touchStartTime = Date.now();

      if (e.touches.length === 2) {
        isPinching = true;
        initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
        startPinchZ = targetZRef.current;
      } else if (e.touches.length === 1) {
        isPinching = false;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartOffsetX = targetOffsetXRef.current;
        touchStartOffsetY = targetOffsetYRef.current;
        mouse.x = touch.clientX;
        mouse.y = touch.clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDocked) return;

      if (e.touches.length === 2 && isPinching) {
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const delta = dist - initialPinchDistance;

        targetZRef.current = startPinchZ + delta * 5;
        targetZRef.current = Math.max(0, Math.min(targetZRef.current, 8000));

        e.preventDefault();
      } else if (e.touches.length === 1 && !isPinching) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;

        targetOffsetXRef.current = touchStartOffsetX - deltaX;
        targetOffsetYRef.current = touchStartOffsetY - deltaY;

        mouse.x = touch.clientX;
        mouse.y = touch.clientY;

        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        const touchDuration = Date.now() - touchStartTime;

        if (touchDuration < 200 && !isPinching) {
          e.preventDefault();
          handleClick();
        }
        isPinching = false;
      }
    };

    const handleClick = () => {
      ensureAmbient();
      if (isDocked) {
        isDocked = false;
        setActivePlanet(null);
        warpSpeed = 0;
        playSound(150, 200, 0.08);
      } else if (hoverId) {
        const planet = CREW.find((p) => p.id === hoverId);
        if (planet) {
          isDocked = true;
          setActivePlanet(planet);

          setVisitedPlanets((prev) => new Set(prev).add(planet.id));

          playSound(400, 300, 0.1);
          setTimeout(() => playSound(300, 200, 0.08), 150);

          // WARP EFFECT:
          warpSpeed = 50;
          gsap.to(camera, {
            z: planet.z - 350,
            duration: 2.0,
            ease: "power2.inOut",
            onUpdate: () => {
              if (Math.abs(camera.z - (planet.z - 350)) < 100) warpSpeed *= 0.9; // Decelerate visual warp
            },
            onComplete: () => {
              warpSpeed = 0;
            },
          });
          targetZRef.current = planet.z - 350;
        }
      }
    };

    window.addEventListener("wheel", handleWheel);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("click", handleClick);

    // Touch event listeners
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", resize);
    resize();

    const project = (x: number, y: number, z: number) => {
      return projectUtil(x, y, z, camera.x, camera.y, width, height);
    };

    const stars = Array.from({ length: 1000 }, () => createStar(width, height));
    const nebulas = Array.from({ length: 20 }, () =>
      createNebula(width, height)
    );

    // --- RENDER LOOP ---
    let time = 0;
    const render = () => {
      time += 0.01;

      // Physics
      if (!isDocked) {
        camera.z += (targetZRef.current - camera.z) * 0.05;
      }

      // Smooth camera pan
      camera.x += (targetOffsetXRef.current - camera.x) * 0.1;
      camera.y += (targetOffsetYRef.current - camera.y) * 0.1;

      // Game Metrics
      const speed = Math.abs(camera.z - lastZ);

      if (Math.floor(time * 100) % 10 === 0) {
        setCurrentSpeed(speed);
        setDistanceTraveled((prev) => prev + speed);
        setCameraZ(camera.z);
      }
      lastZ = camera.z;

      ctx.clearRect(0, 0, width, height);

      drawBackground(ctx, width, height);
      drawNebulas(ctx, nebulas, camera.z, project);
      drawStars(ctx, stars, camera.z, warpSpeed, width, height, project);
      drawConstellationLines(ctx, CREW, camera.z, project);

      if (!isDocked) {
        drawUFO(ctx, CREW, camera.z, targetZRef.current, time, project);
      }

      const hitTest = getVisiblePlanetsWithHitTest(
        CREW,
        camera.z,
        mouse.x,
        mouse.y,
        activePlanet?.id || null,
        isDocked,
        project
      );
      hoverId = hitTest.hoverId;
      if (hitTest.shouldShowPointer) {
        document.body.style.cursor = "pointer";
      }

      drawPlanets(ctx, CREW, camera.z, activePlanet?.id || null, time, project);

      if (!hoverId && !isDocked && !isDragging) {
        document.body.style.cursor = "grab";
      } else if (!hoverId && !isDragging) {
        document.body.style.cursor = "default";
      }

      frameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameId);
      stopAmbientSound(ambientOscillatorsRef.current);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 z-0 bg-black" />

      {/* HOLOGRAPHIC CARD OVERLAY (When Docked) */}
      {activePlanet && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none perspective-1000">
          <div
            className="
                        relative 
                        bg-[rgba(10,20,15,0.85)] backdrop-blur-xl
                        border-2 border-[rgba(0,255,127,0.3)] 
                        p-6 md:p-12 rounded-2xl max-w-xl w-[90%] md:w-full
                        pointer-events-auto 
                        animate-in fade-in zoom-in duration-700
                        shadow-[0_0_100px_rgba(0,255,127,0.15)]
                        group
                    "
            style={{
              clipPath:
                "polygon(5% 0, 100% 0, 100% 90%, 95% 100%, 0 100%, 0 10%)",
            }}
          >
            {/* Holographic Scanlines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,127,0.05)_1px,transparent_1px)] bg-[size:100%_4px] opacity-50 pointer-events-none rounded-2xl" />

            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cosmic-green" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cosmic-green" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cosmic-green" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cosmic-green" />

            {/* Header */}
            <div className="flex items-center gap-4 mb-4 opacity-80">
              <div className="w-2 h-2 bg-cosmic-green rounded-full animate-ping" />
              <span className="text-cosmic-green text-xs tracking-[0.3em] font-mono">
                SECURE CONNECTION ESTABLISHED
              </span>
            </div>

            <h2 className="text-5xl md:text-6xl text-white font-bold mb-4 tracking-tight drop-shadow-[0_0_15px_rgba(0,255,127,0.5)]">
              {activePlanet.name}
            </h2>

            <div className="h-px w-full bg-gradient-to-r from-cosmic-green to-transparent mb-6 opacity-50" />

            <p className="text-cosmic-green tracking-[0.2em] text-lg font-semibold mb-8">
              {activePlanet.role}
            </p>

            <div className="text-gray-300 text-sm leading-relaxed font-mono space-y-4">
              <p>
                ACCESSING ARCHIVES...
                <br />
                SUBJECT IDENTIFIED.
                <br />
                CLEARANCE LEVEL: 5
              </p>
              <p className="opacity-70">
                Click anywhere in the void to disengage docking clamps and
                resume flight path.
              </p>
            </div>

            <div className="mt-8 flex justify-end">
              <button className="px-6 py-2 border border-cosmic-green text-cosmic-green hover:bg-cosmic-green hover:text-black transition-colors uppercase tracking-widest text-xs font-bold">
                close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME HUD - ONLY SHOW WHEN NOT DOCKED */}
      {!activePlanet && (
        <>
          {/* Top Left - Mission Info */}
          <div className="absolute top-3 left-3 md:top-6 md:left-6 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm border border-cosmic-green/30 p-2 md:p-4 rounded-lg font-mono text-[10px] md:text-xs">
              <div className="text-cosmic-green tracking-wider mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-cosmic-green rounded-full animate-pulse" />
                <span>MISSION: CREW ARCHIVE</span>
              </div>
              <div className="text-white/70 space-y-1">
                <div>
                  PROGRESS: {visitedPlanets.size}/{CREW.length} COLLECTED
                </div>
                <div className="flex gap-1 mt-2">
                  {CREW.map((c) => (
                    <div
                      key={c.id}
                      className={`w-6 h-1 rounded ${
                        visitedPlanets.has(c.id)
                          ? "bg-cosmic-green"
                          : "bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top Right - Stats */}
          <div className="absolute top-3 right-3 md:top-6 md:right-6 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm border border-cosmic-green/30 p-2 md:p-4 rounded-lg font-mono text-[10px] md:text-xs space-y-2 md:space-y-3">
              {/* Speed Meter */}
              <div>
                <div className="text-cosmic-green/70 text-[10px] tracking-widest mb-1">
                  VELOCITY
                </div>
                <div className="flex items-end gap-1 md:gap-2">
                  <div className="text-lg md:text-2xl text-white font-bold tabular-nums">
                    {Math.round(currentSpeed * 10)}
                  </div>
                  <div className="text-white/50 text-xs mb-1">U/S</div>
                </div>
                {/* Speed bar */}
                <div className="w-20 md:w-32 h-1 bg-white/10 rounded overflow-hidden mt-1">
                  <div
                    className="h-full bg-gradient-to-r from-cosmic-green to-cyan-400 transition-all duration-100"
                    style={{
                      width: `${Math.min(100, (currentSpeed / 50) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Distance */}
              <div>
                <div className="text-cosmic-green/70 text-[10px] tracking-widest mb-1">
                  DISTANCE
                </div>
                <div className="text-white tabular-nums">
                  {Math.round(distanceTraveled).toLocaleString()} U
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Center - Controls Hint */}
          <div className="absolute bottom-6 md:bottom-12 w-full flex justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2 opacity-60">
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-cosmic-green to-transparent animate-pulse" />
              <div className="bg-black/40 backdrop-blur-sm border border-cosmic-green/20 px-3 md:px-4 py-1.5 md:py-2 rounded-full">
                <span className="hidden sm:block text-cosmic-green text-[8px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] uppercase">
                  Scroll • Explore • Click to Dock
                </span>
              </div>
            </div>
          </div>

          {/* Completion Message */}
          {visitedPlanets.size === CREW.length && !missionCompleteDismissed && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div
                className="
                  relative 
                  bg-[rgba(10,20,15,0.85)] backdrop-blur-md 
                  border-2 border-cosmic-green 
                  p-6 md:p-12 rounded-2xl max-w-xl w-[90%] md:w-full
                  pointer-events-auto 
                  animate-in fade-in zoom-in duration-700
                  shadow-[0_0_100px_rgba(0,255,127,0.3)]
                "
                style={{
                  clipPath:
                    "polygon(5% 0, 100% 0, 100% 90%, 95% 100%, 0 100%, 0 10%)",
                }}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* Holographic Scanlines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,127,0.05)_1px,transparent_1px)] bg-[size:100%_4px] opacity-50 pointer-events-none rounded-2xl" />

                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-cosmic-green" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-cosmic-green" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-cosmic-green" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-cosmic-green" />

                {/* Close Button */}
                <button
                  onClick={() => setMissionCompleteDismissed(true)}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border border-cosmic-green rounded-full hover:bg-cosmic-green hover:text-black transition-colors group"
                >
                  <span className="text-cosmic-green group-hover:text-black text-lg">
                    ×
                  </span>
                </button>

                {/* Content */}
                <div className="text-center space-y-6">
                  {/* Status Indicator */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-3 h-3 bg-cosmic-green rounded-full animate-ping" />
                    <span className="text-cosmic-green text-xs tracking-[0.3em] font-mono">
                      COMPLETED
                    </span>
                  </div>

                  {/* Main Message */}
                  <div className="text-cosmic-green text-4xl sm:text-5xl font-bold animate-pulse drop-shadow-[0_0_20px_rgba(0,255,127,0.5)]">
                    MISSION COMPLETE
                  </div>

                  <div className="h-px w-full bg-gradient-to-r from-transparent via-cosmic-green to-transparent opacity-50" />

                  <div className="text-white/80 text-sm tracking-wider font-mono space-y-2">
                    <p>ALL CREW DATA COLLECTED</p>
                    <p className="text-cosmic-green/70 text-xs">
                      {CREW.length}/{CREW.length} ARCHIVES ACCESSED
                    </p>
                    {secretUnlocked && (
                      <p className="text-purple-400 text-xs animate-pulse">
                        + SECRET UNLOCKED
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-cosmic-green/20">
                    <div>
                      <div className="text-cosmic-green/70 text-[10px] tracking-widest mb-1">
                        DISTANCE
                      </div>
                      <div className="text-white font-mono">
                        {Math.round(distanceTraveled).toLocaleString()} U
                      </div>
                    </div>
                    <div>
                      <div className="text-cosmic-green/70 text-[10px] tracking-widest mb-1">
                        STATUS
                      </div>
                      <div className="text-cosmic-green font-mono">SUCCESS</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MINI-MAP / RADAR (Bottom Left) */}
          <div className="absolute bottom-6 left-6 pointer-events-none hidden md:block">
            <div className="bg-black/70 backdrop-blur-sm border border-cosmic-green/30 p-3 rounded-lg">
              <div className="text-cosmic-green/70 text-[9px] tracking-widest mb-2 text-center">
                RADAR
              </div>
              <div className="relative w-32 h-32 border border-cosmic-green/20 rounded-full">
                {/* Radar sweep effect */}
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-cosmic-green/10 to-transparent"
                    style={{
                      transform: `rotate(${(cameraZ / 100) % 360}deg)`,
                      transformOrigin: "center",
                    }}
                  />
                </div>

                {/* Center (Player) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />

                {/* Planets */}
                {[...CREW, ...(secretUnlocked ? [SECRET_PLANET] : [])].map(
                  (planet) => {
                    const progress = cameraZ / 8500;
                    const planetProgress = planet.z / 8500;
                    const angle =
                      CREW.findIndex((c) => c.id === planet.id) *
                      (360 / (CREW.length + (secretUnlocked ? 1 : 0)));
                    const distance = Math.abs(planetProgress - progress) * 50; // Distance from center
                    const x =
                      Math.cos((angle * Math.PI) / 180) *
                      Math.min(distance, 60);
                    const y =
                      Math.sin((angle * Math.PI) / 180) *
                      Math.min(distance, 60);

                    return (
                      <div
                        key={planet.id}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{
                          transform: `translate(${x}px, ${y}px)`,
                        }}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            visitedPlanets.has(planet.id)
                              ? "bg-cosmic-green"
                              : "bg-white/40"
                          }`}
                          style={{
                            boxShadow: visitedPlanets.has(planet.id)
                              ? `0 0 4px ${planet.color}`
                              : "none",
                          }}
                        />
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          {/* Sound Toggle (Bottom Right of Radar) */}
          <div className="absolute bottom-6 left-48 pointer-events-auto ">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="bg-black/70 backdrop-blur-sm border border-cosmic-green/30 p-2 rounded-lg hover:bg-cosmic-green/10 transition-colors"
            >
              <span className="text-cosmic-green text-xs">
                {isMuted ? "🔇" : "🔊"}
              </span>
            </button>
          </div>
        </>
      )}
      {/* Mobile Controls Layer */}
      {!activePlanet && (
        <MobileControls
          isDocked={!!activePlanet}
          onPan={(x, y) => {
            targetOffsetXRef.current += x;
            targetOffsetYRef.current += y;
          }}
          onWarp={(speed) => {
            targetZRef.current += speed * 2; // Warp multiplier
            targetZRef.current = Math.max(
              0,
              Math.min(targetZRef.current, 8000)
            );
          }}
        />
      )}
    </>
  );
}
