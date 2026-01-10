import { Nebula, ProjectFunction, Star } from "@/interfaces/particles";
import { THEME_COLOR } from "@/constants/cosmic-explorer";

export const drawBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#010103");
  bgGrad.addColorStop(1, "#080815");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);
};

export const drawNebulas = (
  ctx: CanvasRenderingContext2D,
  nebulas: Nebula[],
  cameraZ: number,
  project: ProjectFunction
): void => {
  nebulas.forEach((neb) => {
    let relZ = neb.z - cameraZ;
    while (relZ < 1) relZ += 10000;
    while (relZ > 10000) relZ -= 10000;

    const p = project(neb.x, neb.y, relZ);
    const size = neb.size * p.scale;

    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
    grad.addColorStop(0, neb.color);
    grad.addColorStop(1, "transparent");

    ctx.fillStyle = grad;
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.3 * (1 - relZ / 10000);
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
};

export const drawStars = (
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  cameraZ: number,
  warpSpeed: number,
  width: number,
  height: number,
  project: ProjectFunction
): void => {
  ctx.fillStyle = "white";
  stars.forEach((star) => {
    let relZ = star.z - cameraZ;
    while (relZ < 1) relZ += 10000;
    while (relZ > 10000) relZ -= 10000;

    const p = project(star.x, star.y, relZ);
    const streakLen = Math.max(0, warpSpeed * p.scale * 2);
    const size = Math.max(0.5, (1 - relZ / 10000) * 2);
    const alpha = Math.min(1, 1 - relZ / 10000);
    ctx.globalAlpha = alpha;

    if (streakLen > 2) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(200, 255, 255, ${alpha})`;
      ctx.lineWidth = size;
      ctx.moveTo(p.x, p.y);

      const dx = p.x - width / 2;
      const dy = p.y - height / 2;
      const angle = Math.atan2(dy, dx);
      ctx.lineTo(
        p.x + Math.cos(angle) * streakLen,
        p.y + Math.sin(angle) * streakLen
      );
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
};

export const drawConstellationLines = (
  ctx: CanvasRenderingContext2D,
  crew: Array<{ z: number }>,
  cameraZ: number,
  project: ProjectFunction
): void => {
  ctx.strokeStyle = "rgba(0, 255, 127, 0.3)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 5]);
  ctx.beginPath();

  let firstPoint = true;
  crew.forEach((planet, i) => {
    const relZ = planet.z - cameraZ;
    const angle = i * 2.0;
    const radius = 500;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius * 0.5;

    if (relZ > 10 && relZ < 8000) {
      const proj = project(px, py, relZ);
      if (firstPoint) {
        ctx.moveTo(proj.x, proj.y);
        firstPoint = false;
      } else {
        ctx.lineTo(proj.x, proj.y);
      }
    }
  });
  ctx.stroke();
  ctx.setLineDash([]);
};

export const drawUFO = (
  ctx: CanvasRenderingContext2D,
  crew: Array<{ z: number }>,
  cameraZ: number,
  targetZ: number,
  time: number,
  project: ProjectFunction
): void => {
  let shipIndex = 0;
  for (let i = 0; i < crew.length; i++) {
    if (cameraZ < crew[i].z) {
      shipIndex = i;
      break;
    }
  }

  const shipZ = cameraZ + 300;
  const angle = shipIndex * 2.0;
  const radius = 500;
  const shipX = Math.cos(angle) * radius;
  const shipY = Math.sin(angle) * radius * 0.5;

  const shipProj = project(shipX, shipY, shipZ - cameraZ);
  const shipSize = 30;

  const velocity = targetZ - cameraZ;
  const bankAngle = Math.max(-0.3, Math.min(0.3, velocity * 0.01));

  ctx.save();
  ctx.translate(shipProj.x, shipProj.y);
  ctx.rotate(bankAngle);

  ctx.fillStyle = "rgba(200, 220, 255, 0.9)";
  ctx.strokeStyle = THEME_COLOR;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.ellipse(0, 0, shipSize * 1.5, shipSize * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(0, 255, 127, 0.3)";
  ctx.beginPath();
  ctx.ellipse(
    0,
    -shipSize * 0.3,
    shipSize * 0.8,
    shipSize * 0.4,
    0,
    0,
    Math.PI,
    true
  );
  ctx.fill();

  ctx.fillStyle = "#00ffff";
  ctx.beginPath();
  ctx.arc(0, -shipSize * 0.2, shipSize * 0.2, 0, Math.PI * 2);
  ctx.fill();

  const engineGlow = Math.sin(time * 5) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(0, 255, 127, ${engineGlow})`;
  ctx.shadowColor = THEME_COLOR;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.ellipse(
    0,
    shipSize * 0.3,
    shipSize * 0.4,
    shipSize * 0.2,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
};

type Planet = {
  id: string;
  name: string;
  color: string;
  z: number;
};

export const drawPlanets = (
  ctx: CanvasRenderingContext2D,
  crew: Planet[],
  cameraZ: number,
  activePlanetId: string | null,
  time: number,
  project: ProjectFunction
): void => {
  const visiblePlanets = crew
    .map((planet, i) => {
      const relZ = planet.z - cameraZ;
      const angle = i * 2.0;
      const radius = 500;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius * 0.5;
      return {
        ...planet,
        relZ,
        x: px,
        y: py,
      };
    })
    .filter((p) => p.relZ > 10 && p.relZ < 8000)
    .sort((a, b) => b.relZ - a.relZ);

  visiblePlanets.forEach((p) => {
    const proj = project(p.x, p.y, p.relZ);
    const isActive = activePlanetId === p.id;
    const size = isActive ? 100 : (3000 / p.relZ) * 25;

    const glow = ctx.createRadialGradient(
      proj.x,
      proj.y,
      size * 0.2,
      proj.x,
      proj.y,
      size * 2.5
    );
    glow.addColorStop(0, p.color);
    glow.addColorStop(
      0.5,
      `rgba(${parseInt(p.color.slice(1, 3), 16)}, ${parseInt(
        p.color.slice(3, 5),
        16
      )}, ${parseInt(p.color.slice(5, 7), 16)}, 0.2)`
    );
    glow.addColorStop(1, "rgba(0,0,0,0)");

    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, size * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,0.2)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(
      proj.x,
      proj.y,
      size * 2.0,
      size * 2.0,
      time + p.z * 0.001,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    if (!isActive && p.relZ < 2000 && p.relZ > 100) {
      ctx.fillStyle = "white";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.letterSpacing = "2px";
      ctx.fillText(p.name, proj.x, proj.y + size * 2.2 + 20);
    }
  });
};

export const getVisiblePlanetsWithHitTest = (
  crew: Planet[],
  cameraZ: number,
  mouseX: number,
  mouseY: number,
  activePlanetId: string | null,
  isDocked: boolean,
  project: ProjectFunction
): { hoverId: string | null; shouldShowPointer: boolean } => {
  let hoverId: string | null = null;
  let shouldShowPointer = false;

  const visiblePlanets = crew
    .map((planet, i) => {
      const relZ = planet.z - cameraZ;
      const angle = i * 2.0;
      const radius = 500;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius * 0.5;
      return {
        ...planet,
        relZ,
        x: px,
        y: py,
      };
    })
    .filter((p) => p.relZ > 10 && p.relZ < 8000);

  visiblePlanets.forEach((p) => {
    const proj = project(p.x, p.y, p.relZ);
    const isActive = activePlanetId === p.id;
    const size = isActive ? 100 : (3000 / p.relZ) * 25;

    if (!isActive && !isDocked) {
      const dist = Math.hypot(mouseX - proj.x, mouseY - proj.y);
      const isHover = dist < size;
      if (isHover) {
        hoverId = p.id;
        shouldShowPointer = true;
      }
    }
  });

  return { hoverId, shouldShowPointer };
};
