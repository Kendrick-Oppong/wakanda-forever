import { FOV } from "@/constants/cosmic-explorer";
import { Nebula, Star } from "@/interfaces/particles";


export const createStar = (width: number, height: number): Star => {
  return {
    x: (Math.random() - 0.5) * width * 6,
    y: (Math.random() - 0.5) * height * 6,
    z: Math.random() * 10000,
  };
};



export const createNebula = (width: number, height: number): Nebula => {
  return {
    x: (Math.random() - 0.5) * width * 4,
    y: (Math.random() - 0.5) * height * 2,
    z: Math.random() * 10000,
    color: Math.random() > 0.5 ? "#2a0a2a" : "#0a1a1a",
    size: Math.random() * 1000 + 500,
  };
};

export const project = (
  x: number,
  y: number,
  z: number,
  cameraX: number,
  cameraY: number,
  width: number,
  height: number
): { x: number; y: number; scale: number } => {
  const scale = FOV / (FOV + z);
  const x2d = (x - cameraX) * scale + width / 2;
  const y2d = (y - cameraY) * scale + height / 2;
  return { x: x2d, y: y2d, scale };
};
