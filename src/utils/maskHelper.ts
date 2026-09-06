import { ClipMask } from "@/types/editor";

export function getMaskClipPath(mask?: ClipMask): string {
  if (!mask || mask.type === "none") return "none";

  const centerX = 50 + mask.x;
  const centerY = 50 + mask.y;
  const halfW = mask.width / 2;
  const halfH = mask.height / 2;

  switch (mask.type) {
    case "ellipse":
      return `ellipse(${halfW}% ${halfH}% at ${centerX}% ${centerY}%)`;

    case "rectangle": {
      const top = Math.max(0, centerY - halfH);
      const bottom = Math.max(0, 100 - (centerY + halfH));
      const left = Math.max(0, centerX - halfW);
      const right = Math.max(0, 100 - (centerX + halfW));
      return `inset(${top}% ${right}% ${bottom}% ${left}% round 16px)`;
    }

    case "cinematic":
      return `inset(12% 0 12% 0)`;

    case "split":
      return `polygon(0 0, 100% 0, 100% ${centerY}%, 0 ${centerY}%)`;

    case "star":
      return `polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)`;

    case "heart":
      return `path('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z')`;

    default:
      return "none";
  }
}
