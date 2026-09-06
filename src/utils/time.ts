/**
 * Timecode formatting utilities for Filmov
 */

export function formatTimecode(seconds: number, fps: number = 30): string {
  const safeSecs = isNaN(seconds) || seconds < 0 ? 0 : seconds;
  const totalFrames = Math.floor(safeSecs * fps);
  const frames = totalFrames % fps;
  const totalSecs = Math.floor(safeSecs);
  const secs = totalSecs % 60;
  const mins = Math.floor(totalSecs / 60) % 60;
  const hrs = Math.floor(totalSecs / 3600);

  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames
    .toString()
    .padStart(2, "0")}`;
}

export function formatDurationSimple(seconds: number): string {
  const safeSecs = isNaN(seconds) || seconds < 0 ? 0 : seconds;
  const mins = Math.floor(safeSecs / 60);
  const secs = Math.floor(safeSecs % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
