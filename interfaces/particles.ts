export interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  color: string;
  alpha: number;
  fadeSpeed: number;
}

export type ProjectFunction = (
  x: number,
  y: number,
  z: number
) => {
  x: number;
  y: number;
  scale: number;
};

export interface Star {
  x: number;
  y: number;
  z: number;
}

export interface Nebula {
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
}
