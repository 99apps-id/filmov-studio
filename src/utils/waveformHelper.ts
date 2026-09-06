/**
 * Generates an array of normalized amplitude peaks (0.1 .. 0.95) for visual waveform rendering.
 * If media has pre-computed waveformPeaks, it samples that slice.
 * Otherwise, it generates an organic, consistent audio waveform using audio frequencies.
 */
export function getClipWaveformBars(
  clipId: string,
  barCount: number,
  precomputedPeaks?: number[],
  inPoint: number = 0,
  duration: number = 10,
): number[] {
  if (barCount <= 0) return [];

  if (precomputedPeaks && precomputedPeaks.length > 0) {
    const totalPeaks = precomputedPeaks.length;
    const totalMediaSec = Math.max(duration + inPoint, 1);
    const startRatio = Math.max(0, Math.min(1, inPoint / totalMediaSec));
    const spanRatio = Math.max(0, Math.min(1 - startRatio, duration / totalMediaSec));

    const result: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const clipRatio = i / barCount;
      const mediaRatio = startRatio + clipRatio * spanRatio;
      const idx = Math.min(
        totalPeaks - 1,
        Math.max(0, Math.floor(mediaRatio * totalPeaks)),
      );
      result.push(Math.max(0.12, Math.min(0.95, precomputedPeaks[idx] ?? 0.5)));
    }
    return result;
  }

  // Generate a realistic, deterministic audio waveform based on clipId string hash
  let seed = 0;
  for (let i = 0; i < clipId.length; i++) {
    seed = (seed << 5) - seed + clipId.charCodeAt(i);
    seed |= 0;
  }

  const bars: number[] = [];
  const absSeed = Math.abs(seed);

  for (let i = 0; i < barCount; i++) {
    const t = (i / barCount) * duration + inPoint;
    // Layer multiple sine and noise components for organic music/speech peaks
    const f1 = Math.sin(t * 8.5 + (absSeed % 13)) * 0.35;
    const f2 = Math.sin(t * 21.3 + ((absSeed >> 2) % 19)) * 0.25;
    const f3 = Math.cos(t * 3.7 + ((absSeed >> 4) % 7)) * 0.2;
    const noise = Math.abs(Math.sin(i * 997.3 + absSeed)) * 0.2;

    const val = Math.abs(f1 + f2 + f3) + noise;
    bars.push(Math.max(0.12, Math.min(0.95, val)));
  }

  return bars;
}
