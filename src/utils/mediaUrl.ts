import { convertFileSrc, invoke } from "@tauri-apps/api/core";

/**
 * Converts a filesystem path, blob URL, or web URL into a browser-playable media stream URL.
 * Automatically wraps local Windows file paths with Tauri's asset protocol.
 */
export function getPlayableMediaUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return "";

  const trimmed = pathOrUrl.trim();

  // Relative bundled assets (e.g. /sample-video.mp4)
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  // Intercept raw social media *webpage* URLs that cannot be decoded by HTML5
  // <video>. The domain check is restricted to real http(s) web URLs so that a
  // local filesystem path (e.g. C:\Users\Iwan\Videos\Filmov\Downloads\task-x.mp4
  // or ...\Videos\...) is never misclassified and silently replaced with the
  // bundled sample clip.
  const isSocialWebpage =
    /^https?:\/\//i.test(trimmed) &&
    (trimmed.includes("youtube.com") ||
      trimmed.includes("youtu.be") ||
      trimmed.includes("instagram.com") ||
      trimmed.includes("twitter.com") ||
      trimmed.includes("x.com") ||
      trimmed.includes("tiktok.com")) &&
    !/\.(mp4|webm|mp3|m4a|mov|m3u8)(\?|#|$)/i.test(trimmed);

  if (isSocialWebpage) {
    return "/sample-video.mp4";
  }

  // Already converted asset URLs
  if (
    trimmed.startsWith("http://asset.localhost") ||
    trimmed.startsWith("https://asset.localhost") ||
    trimmed.startsWith("asset:")
  ) {
    return trimmed;
  }

  // Web URLs, Blob URLs, Data URLs
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // Stock mock prefix fallback to bundled asset
  if (trimmed.startsWith("stock://")) {
    return "/sample-video.mp4";
  }

  // Local filesystem path (Windows C:\ or Unix /)
  try {
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      invoke("allow_asset_path", { path: trimmed }).catch(() => {});
      return convertFileSrc(trimmed);
    }
  } catch (err) {
    console.warn("Failed to convertFileSrc for:", trimmed, err);
  }

  return trimmed;
}
