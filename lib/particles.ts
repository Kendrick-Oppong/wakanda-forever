import { PARTICLE_COLORS } from "@/constants/particles";
import { Particle } from "@/interfaces/particles";

export const createParticle = (width: number, height: number): Particle => ({
  x: Math.random() * width,
  y: Math.random() * height,
  size: Math.random() * 3 + 1, // 1-4px
  speedY: Math.random() * -0.5 - 0.2, // Uplift
  speedX: (Math.random() - 0.5) * 0.4, // Slight drift
  color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
  alpha: Math.random(),
  fadeSpeed: Math.random() * 0.01 + 0.005,
});

export const updateParticle = (
  particle: Particle,
  height: number
): Particle => {
  let newY = particle.y + particle.speedY;
  let newX = particle.x + particle.speedX;
  const newAlpha = particle.alpha + particle.fadeSpeed;
  let newFadeSpeed = particle.fadeSpeed;

  // Oscillate Fade
  if (newAlpha > 1 || newAlpha < 0) {
    newFadeSpeed = -particle.fadeSpeed;
  }

  if (newY < -10) {
    newY = height + 10;
    newX = Math.random() * particle.x * 2;
  }

  return {
    ...particle,
    x: newX,
    y: newY,
    alpha: newAlpha,
    fadeSpeed: newFadeSpeed,
  };
};

export const drawParticle = (
  particle: Particle,
  context: CanvasRenderingContext2D
): void => {
  context.save();
  context.globalAlpha = Math.max(0, Math.min(1, particle.alpha));
  context.beginPath();
  context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  context.fillStyle = particle.color;
  context.fill();

  // Glow effect
  context.shadowBlur = 10;
  context.shadowColor = particle.color;
  context.restore();
};
