import { Keyframe } from "@/types/editor";

export function interpolateKeyframes(
  keyframes: Keyframe<number>[] | undefined,
  clipTime: number,
  defaultValue: number,
): number {
  if (!keyframes || keyframes.length === 0) return defaultValue;

  // Sort by timeOffset
  const sorted = [...keyframes].sort((a, b) => a.timeOffset - b.timeOffset);

  if (clipTime <= sorted[0].timeOffset) {
    return sorted[0].value;
  }

  if (clipTime >= sorted[sorted.length - 1].timeOffset) {
    return sorted[sorted.length - 1].value;
  }

  // Find pair
  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i];
    const k2 = sorted[i + 1];

    if (clipTime >= k1.timeOffset && clipTime <= k2.timeOffset) {
      const range = k2.timeOffset - k1.timeOffset;
      if (range <= 0) return k2.value;

      let progress = (clipTime - k1.timeOffset) / range;

      // Ease In Out
      if (k1.easing === "easeInOut" || !k1.easing) {
        progress =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      }

      return k1.value + (k2.value - k1.value) * progress;
    }
  }

  return defaultValue;
}
