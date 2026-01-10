"use client";

import { useEffect, useRef, useState } from "react";
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

  // State for HTML Overlay (when docked)
  const [activePlanet, setActivePlanet] = useState<(typeof CREW)[0] | null>(
    null
  );

  // Game state for HUD
  const [visitedPlanets, setVisitedPlanets] = useState<Set<string>>(new Set());
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [missionCompleteDismissed, setMissionCompleteDismissed] =
    useState(false);
  const [cameraZ, setCameraZ] = useState(0); // For mini-map
  const [isMuted, setIsMuted] = useState(false); // Sound toggle
  const [secretUnlocked, setSecretUnlocked] = useState(false); // Easter egg

  const isMutedRef = useRef(isMuted);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientOscillatorsRef = useRef<OscillatorNode[]>([]);
  const ambientStartedRef = useRef(false);

  // Sync ref with state
  useEffect(() => {
    isMutedRef.current = isMuted;

    // Handle ambient sound toggle immediately
    if (audioContextRef.current && ambientStartedRef.current) {
      if (isMuted) {
        stopAmbientSound(ambientOscillatorsRef.current);
        ambientOscillatorsRef.current = [];
      } else {
        // Restart only if we previously started
        const result = startAmbientSoundUtil(audioContextRef.current, false);
        ambientOscillatorsRef.current = result.oscillators;
      }
    }
  }, [isMuted]);

  // Check for secret unlock
  useEffect(() => {
    if (visitedPlanets.size === CREW.length && !secretUnlocked) {
      setSecretUnlocked(true);
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

    // Sound Effects (Web Audio API)
    if (!audioContextRef.current && typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
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
        // Mark as started even if muted, so unmute works later
        ambientStartedRef.current = true;
      }
    };

    // --- ENGINE STATE ---
    let camera = { x: 0, y: 0, z: 0 };
    let targetZ = 0; // For smooth scrolling
    let isDocked = false; // If true, disable scroll, locked to planet
    let hoverId: string | null = null;
    let warpSpeed = 0; // For visual streak effect
    let lastZ = 0; // For tracking speed

    // Drag/Pan state
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let cameraOffsetX = 0;
    let cameraOffsetY = 0;
    let targetOffsetX = 0;
    let targetOffsetY = 0;

    // --- INPUT HANDLING ---
    const handleWheel = (e: WheelEvent) => {
      ensureAmbient(); // Start ambient on first scroll
      if (isDocked) return; // Locked when viewing info
      targetZ += e.deltaY * 2; // Speed multiplier
      // Clamp
      targetZ = Math.max(0, Math.min(targetZ, 8000));

      // Warp whoosh sound based on scroll speed
      const scrollSpeed = Math.abs(e.deltaY);
      if (scrollSpeed > 50) {
        playSound(200 + scrollSpeed, 100, 0.05); // Higher pitch for faster scrolling
      }
    };

    const mouse = { x: 0, y: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      // Handle dragging
      if (isDragging && !isDocked) {
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;

        // Invert delta so dragging right moves view right (camera moves left in world space)
        targetOffsetX = cameraOffsetX - deltaX;
        targetOffsetY = cameraOffsetY - deltaY;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      cameraOffsetX = targetOffsetX;
      cameraOffsetY = targetOffsetY;
      document.body.style.cursor = "grabbing";
    };

    const handleMouseUp = () => {
      isDragging = false;
      document.body.style.cursor = "default";
    };

    // Touch Support for Mobile
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      ensureAmbient();
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      // Update mouse position for hover detection
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDocked) return;

      const touch = e.touches[0];
      const deltaY = touchStartY - touch.clientY;

      // Swipe to scroll
      targetZ += deltaY * 3; // Faster scroll for touch
      targetZ = Math.max(0, Math.min(targetZ, 8000));

      touchStartY = touch.clientY;

      // Update mouse position for hover detection
      mouse.x = touch.clientX;
      mouse.y = touch.clientY;

      // Prevent page scroll
      e.preventDefault();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchDuration = Date.now() - touchStartTime;

      // Quick tap = click
      if (touchDuration < 200) {
        handleClick();
      }
    };

    // Click to Dock / Undock
    const handleClick = () => {
      ensureAmbient(); // Start ambient on first click
      if (isDocked) {
        // Undock
        isDocked = false;
        setActivePlanet(null);
        warpSpeed = 0;
        playSound(150, 200, 0.08); // Undock sound
      } else if (hoverId) {
        // Dock to planet
        const planet = CREW.find((p) => p.id === hoverId);
        if (planet) {
          isDocked = true;
          setActivePlanet(planet);

          // Track visited planet
          setVisitedPlanets((prev) => new Set(prev).add(planet.id));

          // Docking sound
          playSound(400, 300, 0.1);
          setTimeout(() => playSound(300, 200, 0.08), 150);

          // WARP EFFECT: Accelerate visual cues
          warpSpeed = 50;
          gsap.to(camera, {
            z: planet.z - 350, // Stop a bit closer
            duration: 2.0,
            ease: "power2.inOut",
            onUpdate: () => {
              if (Math.abs(camera.z - (planet.z - 350)) < 100) warpSpeed *= 0.9; // Decelerate visual warp
            },
            onComplete: () => {
              warpSpeed = 0;
            },
          });
          targetZ = planet.z - 350; // Sync target
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
        camera.z += (targetZ - camera.z) * 0.05; // Smooth scroll
      }

      // Smooth camera pan
      camera.x += (targetOffsetX - camera.x) * 0.1;
      camera.y += (targetOffsetY - camera.y) * 0.1;

      // Game Metrics (use local variable to avoid excessive re-renders)
      const speed = Math.abs(camera.z - lastZ);

      // Update state occasionally (every ~10 frames to reduce re-renders)
      if (Math.floor(time * 100) % 10 === 0) {
        setCurrentSpeed(speed);
        setDistanceTraveled((prev) => prev + speed);
        setCameraZ(camera.z); // Update for mini-map
      }
      lastZ = camera.z; // Update lastZ for the next frame

      ctx.clearRect(0, 0, width, height);

      drawBackground(ctx, width, height);
      drawNebulas(ctx, nebulas, camera.z, project);
      drawStars(ctx, stars, camera.z, warpSpeed, width, height, project);
      drawConstellationLines(ctx, CREW, camera.z, project);

      if (!isDocked) {
        drawUFO(ctx, CREW, camera.z, targetZ, time, project);
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

      // Set cursor based on state
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
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none perspective-1000">
          <div
            className="
                        relative 
                        bg-[rgba(10,20,15,0.7)] backdrop-blur-md 
                        border-2 border-[rgba(0,255,127,0.3)] 
                        p-12 rounded-2xl max-w-xl w-full
                        pointer-events-auto 
                        animate-in fade-in zoom-in duration-700
                        shadow-[0_0_100px_rgba(0,255,127,0.15)]
                        group
                    "
            style={{
              transform: "rotateY(-10deg) rotateX(5deg)", // 3D Tilt
              clipPath:
                "polygon(5% 0, 100% 0, 100% 90%, 95% 100%, 0 100%, 0 10%)",
            }}
          >
            {/* Holographic Scanlines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,127,0.05)_1px,transparent_1px)] bg-[size:100%_4px] opacity-50 pointer-events-none rounded-2xl" />

            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#00ff7f]" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#00ff7f]" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#00ff7f]" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#00ff7f]" />

            {/* Header */}
            <div className="flex items-center gap-4 mb-4 opacity-80">
              <div className="w-2 h-2 bg-[#00ff7f] rounded-full animate-ping" />
              <span className="text-[#00ff7f] text-xs tracking-[0.3em] font-mono">
                SECURE CONNECTION ESTABLISHED
              </span>
            </div>

            <h2 className="text-5xl md:text-6xl text-white font-bold mb-4 tracking-tight drop-shadow-[0_0_15px_rgba(0,255,127,0.5)]">
              {activePlanet.name}
            </h2>

            <div className="h-px w-full bg-gradient-to-r from-[#00ff7f] to-transparent mb-6 opacity-50" />

            <p className="text-[#00ff7f] tracking-[0.2em] text-lg font-semibold mb-8">
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
              <button className="px-6 py-2 border border-[#00ff7f] text-[#00ff7f] hover:bg-[#00ff7f] hover:text-black transition-colors uppercase tracking-widest text-xs font-bold">
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
            <div className="bg-black/60 backdrop-blur-sm border border-[#00ff7f]/30 p-2 md:p-4 rounded-lg font-mono text-[10px] md:text-xs">
              <div className="text-[#00ff7f] tracking-wider mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-[#00ff7f] rounded-full animate-pulse" />
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
                          ? "bg-[#00ff7f]"
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
            <div className="bg-black/60 backdrop-blur-sm border border-[#00ff7f]/30 p-2 md:p-4 rounded-lg font-mono text-[10px] md:text-xs space-y-2 md:space-y-3">
              {/* Speed Meter */}
              <div>
                <div className="text-[#00ff7f]/70 text-[10px] tracking-widest mb-1">
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
                    className="h-full bg-gradient-to-r from-[#00ff7f] to-cyan-400 transition-all duration-100"
                    style={{
                      width: `${Math.min(100, (currentSpeed / 50) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Distance */}
              <div>
                <div className="text-[#00ff7f]/70 text-[10px] tracking-widest mb-1">
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
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-[#00ff7f] to-transparent animate-pulse" />
              <div className="bg-black/40 backdrop-blur-sm border border-[#00ff7f]/20 px-3 md:px-4 py-1.5 md:py-2 rounded-full">
                <span className="text-[#00ff7f] text-[8px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] uppercase">
                  Scroll • Explore • Click to Dock
                </span>
              </div>
            </div>
          </div>

          {/* Completion Message */}
          {visitedPlanets.size === CREW.length && !missionCompleteDismissed && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none perspective-1000">
              <div
                className="
                  relative 
                  bg-[rgba(10,20,15,0.85)] backdrop-blur-md 
                  border-2 border-[#00ff7f] 
                  p-12 rounded-2xl max-w-xl w-full
                  pointer-events-auto 
                  animate-in fade-in zoom-in duration-700
                  shadow-[0_0_100px_rgba(0,255,127,0.3)]
                "
                style={{
                  transform: "rotateY(-5deg) rotateX(3deg)",
                  clipPath:
                    "polygon(5% 0, 100% 0, 100% 90%, 95% 100%, 0 100%, 0 10%)",
                }}
              >
                {/* Holographic Scanlines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,127,0.05)_1px,transparent_1px)] bg-[size:100%_4px] opacity-50 pointer-events-none rounded-2xl" />

                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-[#00ff7f]" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-[#00ff7f]" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-[#00ff7f]" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-[#00ff7f]" />

                {/* Close Button */}
                <button
                  onClick={() => setMissionCompleteDismissed(true)}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border border-[#00ff7f] rounded-full hover:bg-[#00ff7f] hover:text-black transition-colors group"
                >
                  <span className="text-[#00ff7f] group-hover:text-black text-lg">
                    ×
                  </span>
                </button>

                {/* Content */}
                <div className="text-center space-y-6">
                  {/* Status Indicator */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-3 h-3 bg-[#00ff7f] rounded-full animate-ping" />
                    <span className="text-[#00ff7f] text-xs tracking-[0.3em] font-mono">
                      TRANSMISSION COMPLETE
                    </span>
                  </div>

                  {/* Main Message */}
                  <div className="text-[#00ff7f] text-5xl font-bold animate-pulse drop-shadow-[0_0_20px_rgba(0,255,127,0.5)]">
                    MISSION COMPLETE
                  </div>

                  <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00ff7f] to-transparent opacity-50" />

                  <div className="text-white/80 text-sm tracking-wider font-mono space-y-2">
                    <p>ALL CREW DATA COLLECTED</p>
                    <p className="text-[#00ff7f]/70 text-xs">
                      {CREW.length}/{CREW.length} ARCHIVES ACCESSED
                    </p>
                    {secretUnlocked && (
                      <p className="text-purple-400 text-xs animate-pulse">
                        + SECRET UNLOCKED
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#00ff7f]/20">
                    <div>
                      <div className="text-[#00ff7f]/70 text-[10px] tracking-widest mb-1">
                        DISTANCE
                      </div>
                      <div className="text-white font-mono">
                        {Math.round(distanceTraveled).toLocaleString()} U
                      </div>
                    </div>
                    <div>
                      <div className="text-[#00ff7f]/70 text-[10px] tracking-widest mb-1">
                        STATUS
                      </div>
                      <div className="text-[#00ff7f] font-mono">SUCCESS</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MINI-MAP / RADAR (Bottom Left) */}
          <div className="absolute bottom-6 left-6 pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm border border-[#00ff7f]/30 p-3 rounded-lg">
              <div className="text-[#00ff7f]/70 text-[9px] tracking-widest mb-2 text-center">
                RADAR
              </div>
              <div className="relative w-32 h-32 border border-[#00ff7f]/20 rounded-full">
                {/* Radar sweep effect */}
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00ff7f]/10 to-transparent"
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
                    const progress = cameraZ / 8500; // Normalize camera position
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
                              ? "bg-[#00ff7f]"
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
          <div className="absolute bottom-6 left-48 pointer-events-auto">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="bg-black/70 backdrop-blur-sm border border-[#00ff7f]/30 p-2 rounded-lg hover:bg-[#00ff7f]/10 transition-colors"
            >
              <span className="text-[#00ff7f] text-xs">
                {isMuted ? "🔇" : "🔊"}
              </span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
