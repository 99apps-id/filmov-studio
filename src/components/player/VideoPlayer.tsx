import React, { useRef, useEffect, useState, useCallback } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { Clip, Track, RichTextProperties } from "@/types/editor";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { interpolateKeyframes } from "@/utils/keyframeHelper";
import { getMaskClipPath } from "@/utils/maskHelper";
import { getPlayableMediaUrl } from "@/utils/mediaUrl";

export const VideoPlayer: React.FC = () => {
  const {
    project,
    currentTime,
    duration,
    isPlaying,
    togglePlay,
    setIsPlaying,
    setCurrentTime,
    clips,
    tracks,
    mediaPool,
    selectedClipId,
    updateClip,
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);

  const [isLooping, setIsLooping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [masterVolume, setMasterVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // Gizmo dragging state
  const [isDraggingGizmo, setIsDraggingGizmo] = useState(false);
  const [gizmoStartPos, setGizmoStartPos] = useState<{
    x: number;
    y: number;
    clipX: number;
    clipY: number;
  } | null>(null);

  // Track user-driven scrub to prevent feedback loops
  const isSeekingRef = useRef(false);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Keyboard shortcut listener (Space to play/pause, Left/Right for frame step)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName))
        return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setCurrentTime(Math.max(0, currentTime - 1 / project.fps));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setCurrentTime(Math.min(duration, currentTime + 1 / project.fps));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, setCurrentTime, currentTime, duration, project.fps]);

  // Find active clips at currentTime
  const activeClips = clips.filter((c) => {
    return (
      currentTime >= c.startOffset && currentTime <= c.startOffset + c.duration
    );
  });

  const activeVideoClip = activeClips.find((c) => {
    if (c.type !== "video" && c.type !== "image") return false;
    const track = tracks.find((t) => t.id === c.trackId);
    return !track?.isHidden;
  });

  const activeAudioClips = activeClips.filter((c) => c.type === "audio");
  const activeTextClips = activeClips.filter((c) => {
    if (c.type !== "text" && c.type !== "subtitle") return false;
    const track = tracks.find((t) => t.id === c.trackId);
    return !track?.isHidden;
  });

  const selectedClip = clips.find((c) => c.id === selectedClipId);

  const activeMediaItem = activeVideoClip
    ? mediaPool.find((m) => m.id === activeVideoClip.mediaId)
    : null;

  const rawVideoSource = activeMediaItem?.url || activeMediaItem?.path || "";
  const resolvedVideoSrc = getPlayableMediaUrl(rawVideoSource);

  // Auto clear error when active clip or resolved source changes
  useEffect(() => {
    setVideoError(null);
  }, [activeVideoClip?.id, resolvedVideoSrc]);

  // Video track configuration
  const videoTrack = activeVideoClip
    ? tracks.find((t) => t.id === activeVideoClip.trackId)
    : undefined;

  // Calculate target media time for the active clip
  const targetMediaTime = activeVideoClip
    ? Math.max(
        0,
        (currentTime - activeVideoClip.startOffset) * activeVideoClip.speed +
          activeVideoClip.inPoint,
      )
    : 0;

  // Master Playback Ticker loop (60 FPS)
  useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const state = useEditorStore.getState();
      if (!state.isPlaying) return;

      let nextTime = state.currentTime + delta;

      // Soft sync with active video element if video is actively playing smoothly
      const video = videoElementRef.current;
      if (video && !video.paused && video.readyState >= 2 && !video.seeking) {
        const curClips = state.clips;
        const activeVid = curClips.find(
          (c) =>
            nextTime >= c.startOffset &&
            nextTime <= c.startOffset + c.duration &&
            (c.type === "video" || c.type === "image"),
        );
        if (activeVid && activeVid.type === "video") {
          const videoProjectTime =
            activeVid.startOffset +
            (video.currentTime - activeVid.inPoint) / (activeVid.speed || 1);
          if (Math.abs(videoProjectTime - nextTime) < 0.25) {
            nextTime = videoProjectTime;
          }
        }
      }

      if (nextTime >= state.duration) {
        if (isLooping) {
          state.setCurrentTime(0);
          if (video) video.currentTime = 0;
        } else {
          state.setCurrentTime(state.duration);
          state.setIsPlaying(false);
          return;
        }
      } else {
        state.setCurrentTime(nextTime);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, isLooping]);

  // Video Element play/pause transport synchronization
  useEffect(() => {
    const video = videoElementRef.current;
    if (!video) return;

    if (isPlaying) {
      if (Math.abs(video.currentTime - targetMediaTime) > 0.15) {
        video.currentTime = targetMediaTime;
      }
      playPromiseRef.current = video.play();
      playPromiseRef.current?.catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("Video play error:", err);
        }
      });
    } else {
      if (playPromiseRef.current) {
        playPromiseRef.current.then(() => video.pause()).catch(() => {});
      } else {
        video.pause();
      }
    }
  }, [isPlaying, activeVideoClip?.id]);

  // Video Element seeking & scrubbing synchronization
  useEffect(() => {
    const video = videoElementRef.current;
    if (!video) return;

    if (!isPlaying) {
      if (Math.abs(video.currentTime - targetMediaTime) > 0.04) {
        video.currentTime = targetMediaTime;
      }
    } else {
      if (Math.abs(video.currentTime - targetMediaTime) > 0.5) {
        video.currentTime = targetMediaTime;
      }
    }
  }, [currentTime, isPlaying, targetMediaTime]);

  // Volume, Mute & Speed Sync for Video Element
  useEffect(() => {
    const video = videoElementRef.current;
    if (video && activeVideoClip) {
      const trackVol = videoTrack?.volume ?? 1;
      const clipVol = activeVideoClip.audio?.volume ?? 1;
      const finalMuted = isMuted || !!videoTrack?.isMuted;
      video.muted = finalMuted;

      let fadeMultiplier = 1;
      const relTime = currentTime - activeVideoClip.startOffset;
      if (activeVideoClip.audio?.fadeIn && activeVideoClip.audio.fadeIn > 0 && relTime < activeVideoClip.audio.fadeIn) {
        fadeMultiplier = Math.max(0, relTime / activeVideoClip.audio.fadeIn);
      } else if (
        activeVideoClip.audio?.fadeOut &&
        activeVideoClip.audio.fadeOut > 0 &&
        activeVideoClip.duration - relTime < activeVideoClip.audio.fadeOut
      ) {
        fadeMultiplier = Math.max(0, (activeVideoClip.duration - relTime) / activeVideoClip.audio.fadeOut);
      }

      video.volume = finalMuted
        ? 0
        : Math.max(0, Math.min(1, masterVolume * trackVol * clipVol * fadeMultiplier));
      video.playbackRate = activeVideoClip.speed || 1;
    }
  }, [
    isMuted,
    masterVolume,
    activeVideoClip,
    currentTime,
    videoTrack?.isMuted,
    videoTrack?.volume,
  ]);

  // Drag on-canvas transform gizmo
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingGizmo && gizmoStartPos && selectedClip) {
        const deltaX = e.clientX - gizmoStartPos.x;
        const deltaY = e.clientY - gizmoStartPos.y;
        updateClip(selectedClip.id, {
          transform: {
            ...selectedClip.transform,
            x: Math.round(gizmoStartPos.clipX + deltaX),
            y: Math.round(gizmoStartPos.clipY + deltaY),
          },
        });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingGizmo(false);
      setGizmoStartPos(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingGizmo, gizmoStartPos, selectedClip, updateClip]);

  // Timecode formatting: HH:MM:SS:FF
  const formatTimecode = (seconds: number) => {
    const safeSecs = isNaN(seconds) || seconds < 0 ? 0 : seconds;
    const totalFrames = Math.floor(safeSecs * project.fps);
    const frames = totalFrames % project.fps;
    const totalSecs = Math.floor(safeSecs);
    const secs = totalSecs % 60;
    const mins = Math.floor(totalSecs / 60) % 60;
    const hrs = Math.floor(totalSecs / 3600);

    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames
      .toString()
      .padStart(2, "0")}`;
  };

  const stepFrame = (frames: number) => {
    setCurrentTime(
      Math.max(0, Math.min(duration, currentTime + frames / project.fps)),
    );
  };

  const clipRelTime = activeVideoClip
    ? Math.max(0, currentTime - activeVideoClip.startOffset)
    : 0;

  const currentScale = activeVideoClip
    ? interpolateKeyframes(
        activeVideoClip.keyframes?.scale,
        clipRelTime,
        activeVideoClip.transform.scale,
      )
    : 1;

  const currentPosX = activeVideoClip
    ? interpolateKeyframes(
        activeVideoClip.keyframes?.positionX,
        clipRelTime,
        activeVideoClip.transform.x,
      )
    : 0;

  const currentPosY = activeVideoClip
    ? interpolateKeyframes(
        activeVideoClip.keyframes?.positionY,
        clipRelTime,
        activeVideoClip.transform.y,
      )
    : 0;

  const currentOpacity = activeVideoClip
    ? interpolateKeyframes(
        activeVideoClip.keyframes?.opacity,
        clipRelTime,
        activeVideoClip.transform.opacity,
      )
    : 1;

  const currentMaskClipPath = activeVideoClip
    ? getMaskClipPath(activeVideoClip.mask)
    : "none";

  const isVideoFormat =
    activeMediaItem?.type === "video" ||
    resolvedVideoSrc.includes(".mp4") ||
    resolvedVideoSrc.includes(".webm") ||
    resolvedVideoSrc.startsWith("blob:") ||
    resolvedVideoSrc.startsWith("asset:");

  // Transition Calculation (Tahap 2)
  let transitionOpacityMultiplier = 1;
  let transitionClipPath: string | undefined = undefined;
  let transitionTransformExtra = "";

  if (activeVideoClip?.transition && activeVideoClip.transition.type !== "none") {
    const transDuration = activeVideoClip.transition.duration || 1.0;
    const transElapsed = currentTime - activeVideoClip.startOffset;
    if (transElapsed >= 0 && transElapsed < transDuration) {
      const progress = Math.min(1, Math.max(0, transElapsed / transDuration));
      switch (activeVideoClip.transition.type) {
        case "fade":
        case "dissolve":
          transitionOpacityMultiplier = progress;
          break;
        case "wipeleft":
          transitionClipPath = `inset(0 ${(1 - progress) * 100}% 0 0)`;
          break;
        case "wiperight":
          transitionClipPath = `inset(0 0 0 ${(1 - progress) * 100}%)`;
          break;
        case "slideup":
          transitionTransformExtra = ` translateY(${(1 - progress) * 100}%)`;
          break;
        case "slidedown":
          transitionTransformExtra = ` translateY(${-(1 - progress) * 100}%)`;
          break;
        case "circlecrop":
          transitionClipPath = `circle(${progress * 75}% at 50% 50%)`;
          break;
        case "zoom":
          transitionTransformExtra = ` scale(${0.2 + progress * 0.8})`;
          transitionOpacityMultiplier = progress;
          break;
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#f4f6fa] border-b border-[var(--color-rule)] relative overflow-hidden select-none"
    >
      {/* Aspect Ratio Canvas Container */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <div
          className="relative bg-black rounded-2xl shadow-2xl shadow-purple-950/10 overflow-hidden flex items-center justify-center border border-slate-200/80 transition-all duration-300"
          style={{
            aspectRatio:
              project.aspectRatio === "16:9"
                ? "16/9"
                : project.aspectRatio === "9:16"
                  ? "9/16"
                  : project.aspectRatio === "1:1"
                    ? "1/1"
                    : project.aspectRatio === "4:5"
                      ? "4/5"
                      : "21/9",
            maxHeight: "100%",
            maxWidth: "100%",
            height: project.aspectRatio === "9:16" ? "100%" : "auto",
            width: project.aspectRatio === "9:16" ? "auto" : "100%",
          }}
        >
          {/* Active Visual Media (Video or Image) */}
          {activeVideoClip && activeMediaItem ? (
            <div
              className="absolute inset-0 flex items-center justify-center transition-all"
              style={{
                transform: `translate(${currentPosX}px, ${currentPosY}px) scale(${currentScale}) rotate(${activeVideoClip.transform.rotation}deg)${transitionTransformExtra}`,
                opacity: currentOpacity * transitionOpacityMultiplier,
                filter: `brightness(${100 + activeVideoClip.color.brightness}%) contrast(${100 + activeVideoClip.color.contrast}%) saturate(${100 + activeVideoClip.color.saturation}%)`,
                clipPath: transitionClipPath || currentMaskClipPath,
              }}
            >
              {isVideoFormat && resolvedVideoSrc && !videoError ? (
                <video
                  ref={videoElementRef}
                  key={resolvedVideoSrc}
                  src={resolvedVideoSrc}
                  preload="auto"
                  className="w-full h-full object-contain pointer-events-none"
                  playsInline
                  onLoadStart={() => {
                    setIsVideoLoading(true);
                  }}
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget;
                    if (video && video.duration && !isNaN(video.duration) && video.duration > 0.5) {
                      const item = useEditorStore.getState().mediaPool.find((m) => m.id === activeVideoClip.mediaId);
                      if (item && Math.abs(item.duration - video.duration) > 1.0) {
                        item.duration = parseFloat(video.duration.toFixed(2));
                        if (video.videoWidth) item.width = video.videoWidth;
                        if (video.videoHeight) item.height = video.videoHeight;
                      }
                    }
                  }}
                  onCanPlay={() => {
                    setIsVideoLoading(false);
                    setVideoError(null);
                    const video = videoElementRef.current;
                    if (video) {
                      const finalMuted = isMuted || !!videoTrack?.isMuted;
                      video.muted = finalMuted;
                      video.volume = finalMuted
                        ? 0
                        : Math.max(
                            0,
                            Math.min(
                              1,
                              masterVolume *
                                (videoTrack?.volume ?? 1) *
                                (activeVideoClip?.audio?.volume ?? 1),
                            ),
                          );
                      if (isPlaying && video.paused) {
                        video.play().catch(() => {});
                      }
                    }
                  }}
                  onError={(e) => {
                    setIsVideoLoading(false);
                    const mediaErr = videoElementRef.current?.error;
                    console.warn("Video playback error details:", mediaErr?.code, mediaErr?.message);
                    setVideoError(
                      "Media decode failed or file unreachable.",
                    );
                  }}
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={activeMediaItem.thumbnailUrl || "/sample-video.mp4"}
                    alt={activeVideoClip.name}
                    className="w-full h-full object-contain pointer-events-none opacity-80"
                  />
                  {videoError && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-20">
                      <AlertCircle className="w-8 h-8 text-[var(--color-danger)] mb-2" />
                      <span className="text-xs text-white font-medium mb-1">
                        {videoError}
                      </span>
                      <p className="text-[11px] text-slate-300 max-w-xs mb-3">
                        External stream unreachable. Click below to load the bundled offline video clip.
                      </p>
                      <button
                        onClick={() => {
                          const state = useEditorStore.getState();
                          useEditorStore.setState((s) => ({
                            mediaPool: s.mediaPool.map((m) =>
                              m.id === activeVideoClip.mediaId
                                ? { ...m, url: "/sample-video.mp4", path: "/sample-video.mp4" }
                                : m,
                            ),
                          }));
                          state.updateClip(activeVideoClip.id, {
                            duration: activeVideoClip.duration,
                          });
                          setVideoError(null);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold text-xs shadow-md shadow-purple-500/25 transition active:translate-y-px cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Load Local Offline Clip
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-slate-500">
              <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center mx-auto mb-2.5 bg-slate-900/50">
                <Play className="w-6 h-6 opacity-40 text-purple-400" />
              </div>
              <span className="text-xs font-mono font-medium text-slate-400">No Media at Playhead</span>
            </div>
          )}

          {/* Multi-track synchronized Audio players */}
          {activeAudioClips.map((clip) => {
            const media = mediaPool.find((m) => m.id === clip.mediaId);
            const src = getPlayableMediaUrl(media?.url || media?.path || "");
            if (!src) return null;
            return (
              <AudioPlayerItem
                key={clip.id}
                clip={clip}
                src={src}
                currentTime={currentTime}
                isPlaying={isPlaying}
                masterVolume={masterVolume}
                isMuted={isMuted}
                track={tracks.find((t) => t.id === clip.trackId)}
              />
            );
          })}

          {/* Rich Text & Titles Overlay (Tahap 3) */}
          {activeTextClips.map((textClip) => {
            const style: Partial<RichTextProperties> = textClip.textStyle || {};
            const fontFamily = style.fontFamily || "Space Grotesk";
            const fontSize = style.fontSize || 36;
            const fontWeight = style.fontWeight || "bold";
            const color = style.color || "#ffffff";
            const textAlign = style.textAlign || "center";
            const strokeColor = style.strokeColor || "#000000";
            const strokeWidth = style.strokeWidth ?? 0;
            const shadowBlur = style.shadowBlur ?? 8;
            const shadowColor = style.shadowColor || "rgba(0,0,0,0.8)";
            const shadowOffsetX = style.shadowOffsetX ?? 2;
            const shadowOffsetY = style.shadowOffsetY ?? 2;
            const backgroundColor = style.backgroundColor || "transparent";
            const backgroundPadding = style.backgroundPadding ?? 8;
            const borderRadius = style.borderRadius ?? 6;
            const animation = style.animation || "none";

            const rawText = textClip.subtitleText || textClip.name || "";
            const relTime = currentTime - textClip.startOffset;

            // Animation dynamic effects
            let animatedText = rawText;
            let animTransform = "";
            let animOpacity = 1;

            if (animation === "fade") {
              animOpacity = Math.min(1, Math.max(0, relTime / 0.5));
            } else if (animation === "typewriter") {
              const charCount = Math.min(
                rawText.length,
                Math.floor((relTime / Math.max(0.5, textClip.duration * 0.4)) * rawText.length),
              );
              animatedText = rawText.slice(0, charCount);
            } else if (animation === "bounce") {
              const bounceY = Math.sin(relTime * 8) * 15 * Math.exp(-relTime * 1.5);
              animTransform = `translateY(${Math.max(-25, Math.min(25, -bounceY))}px)`;
            } else if (animation === "pop") {
              const popScale = 1 + 0.35 * Math.exp(-relTime * 4);
              animTransform = `scale(${popScale})`;
            } else if (animation === "slideUp") {
              const progress = Math.min(1, Math.max(0, relTime / 0.4));
              animTransform = `translateY(${(1 - progress) * 40}px)`;
              animOpacity = progress;
            }

            const clipX = textClip.transform?.x || 0;
            const clipY = textClip.transform?.y || 0;
            const clipScale = textClip.transform?.scale || 1;
            const clipRot = textClip.transform?.rotation || 0;

            return (
              <div
                key={textClip.id}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                style={{
                  transform: `translate(${clipX}px, ${clipY}px) scale(${clipScale}) rotate(${clipRot}deg)`,
                }}
              >
                <div
                  style={{
                    fontFamily,
                    fontSize: `${fontSize}px`,
                    fontWeight,
                    color,
                    textAlign,
                    WebkitTextStroke: strokeWidth > 0 ? `${strokeWidth}px ${strokeColor}` : "none",
                    textShadow:
                      shadowBlur > 0
                        ? `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`
                        : "none",
                    backgroundColor,
                    padding: `${backgroundPadding}px`,
                    borderRadius: `${borderRadius}px`,
                    opacity: animOpacity,
                    transform: animTransform,
                    transition: "opacity 0.1s ease",
                  }}
                  className="max-w-[85%] select-none break-words leading-tight"
                >
                  {animatedText}
                </div>
              </div>
            );
          })}

          {/* Interactive Transform Gizmo for Selected Clip */}
          {selectedClip &&
            ((activeVideoClip && selectedClip.id === activeVideoClip.id) ||
              activeTextClips.some((tc) => tc.id === selectedClip.id)) && (
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDraggingGizmo(true);
                  setGizmoStartPos({
                    x: e.clientX,
                    y: e.clientY,
                    clipX: selectedClip.transform.x,
                    clipY: selectedClip.transform.y,
                  });
                }}
                className="absolute inset-1 border-2 border-[#7c3aed] border-dashed z-30 cursor-move"
                title="Drag to reposition clip on canvas"
              >
                <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#7c3aed] rounded-xs shadow-sm ring-1 ring-white" />
                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#7c3aed] rounded-xs shadow-sm ring-1 ring-white" />
                <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#7c3aed] rounded-xs shadow-sm ring-1 ring-white" />
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#7c3aed] rounded-xs shadow-sm ring-1 ring-white" />
                <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-[#7c3aed] rounded-xs shadow-sm ring-1 ring-white" />
                <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-[#7c3aed] rounded-xs shadow-sm ring-1 ring-white" />
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#7c3aed] rounded-xs shadow-sm ring-1 ring-white" />
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#7c3aed] rounded-xs shadow-sm ring-1 ring-white" />
              </div>
            )}
        </div>
      </div>

      {/* Transport Controls Bar */}
      <div className="h-14 bg-white border-t border-[var(--color-rule)] px-5 flex items-center justify-between z-20 select-none shadow-xs">
        {/* Current Timecode */}
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs font-bold text-[#7c3aed] bg-purple-50 px-3 py-1 rounded-lg border border-purple-200 shadow-2xs">
            {formatTimecode(currentTime)}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">/</span>
          <div className="font-mono text-xs text-slate-600 font-medium">
            {formatTimecode(duration)}
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-medium border border-slate-200">
            {project.fps} FPS
          </span>
        </div>

        {/* Center Transport Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentTime(0)}
            className="p-2 rounded-xl text-slate-600 hover:text-[#7c3aed] hover:bg-purple-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
            title="Return to Start"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => stepFrame(-1)}
            className="p-2 rounded-xl text-slate-600 hover:text-[#7c3aed] hover:bg-purple-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
            title="Step 1 Frame Back (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7c3aed] to-[#9333ea] hover:from-[#6d28d9] hover:to-[#7e22ce] text-white flex items-center justify-center transition-all shadow-md shadow-purple-500/30 hover:scale-105 active:scale-95 mx-1"
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
          </button>

          <button
            onClick={() => stepFrame(1)}
            className="p-2 rounded-xl text-slate-600 hover:text-[#7c3aed] hover:bg-purple-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
            title="Step 1 Frame Forward (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentTime(duration)}
            className="p-2 rounded-xl text-slate-600 hover:text-[#7c3aed] hover:bg-purple-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
            title="Go to End"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-2 rounded-xl ml-1 transition-all hover:-translate-y-0.5 active:translate-y-0 ${
              isLooping
                ? "text-[#7c3aed] bg-purple-50 font-bold border border-purple-200"
                : "text-slate-400 hover:text-[#7c3aed] hover:bg-purple-50"
            }`}
            title="Loop Playback"
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Right Tools: Audio Volume, Fullscreen */}
        <div className="flex items-center gap-3">
          {/* Volume Control */}
          <div className="flex items-center gap-2 group">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl text-slate-600 hover:text-[#7c3aed] hover:bg-purple-50 transition"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || masterVolume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-slate-600 group-hover:text-[#7c3aed]" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : masterVolume}
              onChange={(e) => {
                setMasterVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-18 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#7c3aed]"
              title={`Master Volume: ${Math.round((isMuted ? 0 : masterVolume) * 100)}%`}
            />
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Fullscreen Button */}
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                containerRef.current?.requestFullscreen();
                setIsFullscreen(true);
              } else {
                document.exitFullscreen();
                setIsFullscreen(false);
              }
            }}
            className="p-2 rounded-xl text-slate-600 hover:text-[#7c3aed] hover:bg-purple-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
            title="Toggle Canvas Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface AudioPlayerItemProps {
  clip: Clip;
  src: string;
  currentTime: number;
  isPlaying: boolean;
  masterVolume: number;
  isMuted: boolean;
  track?: Track;
}

const AudioPlayerItem: React.FC<AudioPlayerItemProps> = ({
  clip,
  src,
  currentTime,
  isPlaying,
  masterVolume,
  isMuted,
  track,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const targetTime = Math.max(
    0,
    (currentTime - clip.startOffset) * clip.speed + clip.inPoint,
  );

  // Sync volume, mute & speed
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const trackVol = track?.volume ?? 1;
    const clipVol = clip.audio?.volume ?? 1;
    const finalMuted = isMuted || !!track?.isMuted;

    // Fade in / Fade out calculation
    let fadeMultiplier = 1;
    const relTime = currentTime - clip.startOffset;
    if (clip.audio?.fadeIn && clip.audio.fadeIn > 0 && relTime < clip.audio.fadeIn) {
      fadeMultiplier = Math.max(0, relTime / clip.audio.fadeIn);
    } else if (
      clip.audio?.fadeOut &&
      clip.audio.fadeOut > 0 &&
      clip.duration - relTime < clip.audio.fadeOut
    ) {
      fadeMultiplier = Math.max(0, (clip.duration - relTime) / clip.audio.fadeOut);
    }

    audio.muted = finalMuted;
    audio.volume = finalMuted
      ? 0
      : Math.max(0, Math.min(1, masterVolume * trackVol * clipVol * fadeMultiplier));
    audio.playbackRate = clip.speed || 1;
  }, [
    isMuted,
    track?.isMuted,
    track?.volume,
    clip.audio?.volume,
    clip.audio?.fadeIn,
    clip.audio?.fadeOut,
    clip.speed,
    masterVolume,
    currentTime,
    clip.startOffset,
    clip.duration,
  ]);

  // Sync transport play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      if (Math.abs(audio.currentTime - targetTime) > 0.15) {
        audio.currentTime = targetTime;
      }
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch((err) => {
          if (err.name !== "AbortError") {
            console.warn("Audio clip play error:", err);
          }
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, clip.id]);

  // Sync seeking & scrubbing
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying) {
      if (Math.abs(audio.currentTime - targetTime) > 0.04) {
        audio.currentTime = targetTime;
      }
    } else {
      if (Math.abs(audio.currentTime - targetTime) > 0.5) {
        audio.currentTime = targetTime;
      }
    }
  }, [currentTime, isPlaying, targetTime]);

  return <audio ref={audioRef} src={src} preload="auto" />;
};
