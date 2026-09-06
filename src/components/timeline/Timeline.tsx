import React, { useRef, useState, useEffect } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { Clip, Track } from "@/types/editor";
import {
  Scissors,
  MousePointer,
  Trash2,
  Plus,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Film,
  Music,
  Type,
  Magnet,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Minimize2,
} from "lucide-react";
import { getClipWaveformBars } from "@/utils/waveformHelper";

interface DragClipState {
  clipId: string;
  startX: number;
  startY: number;
  initialStartOffset: number;
  initialTrackId: string;
  duration: number;
}

interface TrimmingState {
  clipId: string;
  edge: "left" | "right";
  startX: number;
  initialInPoint: number;
  initialOutPoint: number;
  initialDuration: number;
  initialStartOffset: number;
  mediaDuration?: number;
}

interface FadeDragState {
  clipId: string;
  edge: "in" | "out";
  startX: number;
  initialFade: number;
  maxFade: number;
}

export const Timeline: React.FC = () => {
  const {
    tracks,
    clips,
    currentTime,
    duration,
    zoom,
    snapping,
    selectedClipId,
    activeTool,
    mediaPool,
    setZoom,
    setSnapping,
    setActiveTool,
    setSelectedClipId,
    setCurrentTime,
    splitClipAtCurrentTime,
    duplicateClip,
    rippleDeleteClip,
    deleteClip,
    updateClip,
    moveClip,
    togglePlay,
    toggleTrackMute,
    toggleTrackLock,
    toggleTrackHide,
    addTrack,
    updateAudioFade,
    addTextClip,
  } = useEditorStore();

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const trackHeadersRef = useRef<HTMLDivElement>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [dragClipState, setDragClipState] = useState<DragClipState | null>(null);
  const [trimmingState, setTrimmingState] = useState<TrimmingState | null>(null);
  const [fadeDragState, setFadeDragState] = useState<FadeDragState | null>(null);

  // Ruler ticks and total scrollable canvas width (with plenty of extra room)
  const maxClipEnd =
    clips.length > 0
      ? Math.max(...clips.map((c) => c.startOffset + c.duration))
      : 0;
  const effectiveDuration = Math.max(duration, maxClipEnd + 15);
  const timelineWidth = Math.max(1600, effectiveDuration * zoom);
  const tickIntervalSec = zoom > 80 ? 1 : zoom > 40 ? 2 : 5;
  const totalTicks = Math.ceil(effectiveDuration / tickIntervalSec);

  // Seek on timeline ruler click
  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tracksScrollRef.current) return;
    const rect = tracksScrollRef.current.getBoundingClientRect();
    const scrollLeft = tracksScrollRef.current.scrollLeft;
    const offsetX = e.clientX - rect.left + scrollLeft;
    const clickedTime = Math.max(0, Math.min(effectiveDuration, offsetX / zoom));

    setCurrentTime(clickedTime);
    setIsScrubbing(true);
  };

  // Synchronize Left Track Headers vertical scroll with Right Tracks Canvas
  const handleTracksScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (trackHeadersRef.current) {
      trackHeadersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Keyboard shortcuts for timeline (Ctrl+B split, Delete, V, C, M, Ctrl+D, Shift+Del, Space, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Space: Play / Pause
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
        return;
      }

      // Home / End navigation
      if (e.key === "Home") {
        e.preventDefault();
        setCurrentTime(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        setCurrentTime(effectiveDuration);
        return;
      }

      // Left / Right Arrow frame navigation
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 0.04;
        setCurrentTime(Math.max(0, currentTime - step));
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 0.04;
        setCurrentTime(Math.min(effectiveDuration, currentTime + step));
        return;
      }

      // Duplicate selected clip: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedClipId) {
          duplicateClip(selectedClipId);
        }
        return;
      }

      // Ripple Delete: Shift+Delete
      if (e.shiftKey && (e.key === "Delete" || e.key === "Backspace")) {
        if (selectedClipId) {
          e.preventDefault();
          rippleDeleteClip(selectedClipId);
          return;
        }
      }

      // Delete selected clip: Delete or Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedClipId) {
          e.preventDefault();
          deleteClip(selectedClipId);
          return;
        }
      }

      // Split clip at playhead: Ctrl+B or B
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") ||
        (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "b")
      ) {
        e.preventDefault();
        splitClipAtCurrentTime();
        return;
      }

      // Selection tool: V
      if (e.key.toLowerCase() === "v") {
        setActiveTool("select");
        return;
      }

      // Razor tool: C
      if (e.key.toLowerCase() === "c") {
        setActiveTool("razor");
        return;
      }

      // Snapping toggle: M
      if (e.key.toLowerCase() === "m") {
        setSnapping(!snapping);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedClipId,
    currentTime,
    effectiveDuration,
    deleteClip,
    duplicateClip,
    rippleDeleteClip,
    splitClipAtCurrentTime,
    togglePlay,
    setCurrentTime,
    setActiveTool,
    setSnapping,
    snapping,
  ]);

  // Global Drag & Trim Mouse Move / Up Handler
  useEffect(() => {
    if (!isScrubbing && !trimmingState && !dragClipState && !fadeDragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 1. Scrubbing Playhead
      if (isScrubbing && tracksScrollRef.current) {
        const rect = tracksScrollRef.current.getBoundingClientRect();
        const scrollLeft = tracksScrollRef.current.scrollLeft;
        const offsetX = e.clientX - rect.left + scrollLeft;
        const newTime = Math.max(0, Math.min(effectiveDuration, offsetX / zoom));
        setCurrentTime(newTime);
      }

      // 2. Trimming Clip Edges (Deterministic calculation from mousedown anchor)
      if (trimmingState) {
        const totalDeltaSec = (e.clientX - trimmingState.startX) / zoom;
        if (trimmingState.edge === "left") {
          // Left trim: drag right trims start, drag left restores start
          const maxDeltaLeft = -trimmingState.initialInPoint;
          const maxDeltaRight = trimmingState.initialDuration - 0.2;
          const clampedDelta = Math.max(
            maxDeltaLeft,
            Math.min(maxDeltaRight, totalDeltaSec),
          );

          const newIn = Math.max(0, trimmingState.initialInPoint + clampedDelta);
          const newDuration = Math.max(
            0.2,
            trimmingState.initialDuration - clampedDelta,
          );
          const newStart = Math.max(
            0,
            trimmingState.initialStartOffset + clampedDelta,
          );

          updateClip(trimmingState.clipId, {
            inPoint: parseFloat(newIn.toFixed(3)),
            duration: parseFloat(newDuration.toFixed(3)),
            startOffset: parseFloat(newStart.toFixed(3)),
          });
        } else {
          // Right trim: drag right extends tail, drag left trims tail
          const maxDeltaLeft = -(trimmingState.initialDuration - 0.2);
          const maxDeltaRight = trimmingState.mediaDuration
            ? Math.max(
                0,
                trimmingState.mediaDuration -
                  (trimmingState.initialInPoint + trimmingState.initialDuration),
              )
            : 9999;
          const clampedDelta = Math.max(
            maxDeltaLeft,
            Math.min(maxDeltaRight, totalDeltaSec),
          );

          const newDuration = Math.max(
            0.2,
            trimmingState.initialDuration + clampedDelta,
          );
          const newOut = trimmingState.initialInPoint + newDuration;

          updateClip(trimmingState.clipId, {
            duration: parseFloat(newDuration.toFixed(3)),
            outPoint: parseFloat(newOut.toFixed(3)),
          });
        }
      }

      // 3. Dragging Entire Clip (Position & Track jumping)
      if (dragClipState && tracksScrollRef.current) {
        const totalDeltaSec = (e.clientX - dragClipState.startX) / zoom;
        let targetStart = Math.max(
          0,
          dragClipState.initialStartOffset + totalDeltaSec,
        );

        // Magnetic Snapping
        if (snapping) {
          const snapThreshold = 14 / zoom;
          // Snap to playhead
          if (Math.abs(targetStart - currentTime) < snapThreshold) {
            targetStart = currentTime;
          } else if (
            Math.abs(targetStart + dragClipState.duration - currentTime) <
            snapThreshold
          ) {
            targetStart = currentTime - dragClipState.duration;
          }

          // Snap to other clips
          for (const other of clips) {
            if (other.id === dragClipState.clipId) continue;
            // Snap head to other head
            if (Math.abs(targetStart - other.startOffset) < snapThreshold) {
              targetStart = other.startOffset;
              break;
            }
            // Snap head to other tail
            const otherEnd = other.startOffset + other.duration;
            if (Math.abs(targetStart - otherEnd) < snapThreshold) {
              targetStart = otherEnd;
              break;
            }
            // Snap tail to other head
            if (
              Math.abs(
                targetStart + dragClipState.duration - other.startOffset,
              ) < snapThreshold
            ) {
              targetStart = other.startOffset - dragClipState.duration;
              break;
            }
            // Snap tail to other tail
            if (
              Math.abs(targetStart + dragClipState.duration - otherEnd) <
              snapThreshold
            ) {
              targetStart = otherEnd - dragClipState.duration;
              break;
            }
          }
        }

        // Determine target track with vertical scroll compensation
        let targetTrackId = dragClipState.initialTrackId;
        const clip = clips.find((c) => c.id === dragClipState.clipId);
        if (clip) {
          const rect = tracksScrollRef.current.getBoundingClientRect();
          const scrollTop = tracksScrollRef.current.scrollTop;
          const relativeY = e.clientY - rect.top + scrollTop;

          let accumulatedHeight = 28; // ruler height
          for (const t of tracks) {
            if (
              relativeY >= accumulatedHeight &&
              relativeY <= accumulatedHeight + t.height
            ) {
              if (!t.isLocked) {
                if (
                  (clip.type === "video" && t.type === "video") ||
                  (clip.type === "image" && t.type === "video") ||
                  (clip.type === "audio" && t.type === "audio") ||
                  (clip.type === "subtitle" && (t.type === "subtitle" || t.type === "text")) ||
                  (clip.type === "text" && (t.type === "text" || t.type === "subtitle"))
                ) {
                  targetTrackId = t.id;
                }
              }
              break;
            }
            accumulatedHeight += t.height;
          }
        }

        moveClip(
          dragClipState.clipId,
          targetTrackId,
          parseFloat(Math.max(0, targetStart).toFixed(3)),
        );
      }

      if (fadeDragState) {
        const deltaSec = (e.clientX - fadeDragState.startX) / zoom;
        let newFade =
          fadeDragState.edge === "in"
            ? Math.max(
                0,
                Math.min(
                  fadeDragState.maxFade,
                  fadeDragState.initialFade + deltaSec,
                ),
              )
            : Math.max(
                0,
                Math.min(
                  fadeDragState.maxFade,
                  fadeDragState.initialFade - deltaSec,
                ),
              );
        newFade = parseFloat(newFade.toFixed(2));
        if (fadeDragState.edge === "in") {
          updateAudioFade(fadeDragState.clipId, newFade, undefined);
        } else {
          updateAudioFade(fadeDragState.clipId, undefined, newFade);
        }
      }
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      setDragClipState(null);
      setTrimmingState(null);
      setFadeDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isScrubbing,
    trimmingState,
    dragClipState,
    fadeDragState,
    zoom,
    effectiveDuration,
    snapping,
    currentTime,
    clips,
    tracks,
    setCurrentTime,
    updateClip,
    moveClip,
    updateAudioFade,
  ]);

  return (
    <div
      ref={timelineContainerRef}
      className="flex flex-col h-full bg-[var(--color-paper-1)] text-[var(--color-ink)] border-t border-[var(--color-rule)] select-none font-body min-h-0"
    >
      {/* Timeline Controls Toolbar */}
      <div className="h-11 bg-white border-b border-[var(--color-rule)] px-4 flex items-center justify-between z-20 shrink-0 select-none shadow-2xs">
        {/* Left Tools: Select, Razor, Split, Magnet, Delete */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTool("select")}
            className={`p-2 rounded-xl transition-all ${
              activeTool === "select"
                ? "bg-[#7c3aed] text-white font-bold shadow-md shadow-purple-500/25"
                : "text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-purple-50"
            }`}
            title="Selection Tool (V)"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() =>
              setActiveTool(activeTool === "razor" ? "select" : "razor")
            }
            className={`p-2 rounded-xl transition-all ${
              activeTool === "razor"
                ? "bg-[#7c3aed] text-white font-bold shadow-md shadow-purple-500/25"
                : "text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-purple-50"
            }`}
            title="Razor Tool (C) - Click any clip to cut"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => splitClipAtCurrentTime()}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-purple-50 rounded-xl border border-[var(--color-rule)] hover:border-purple-200 transition-all hover:-translate-y-0.5 active:translate-y-0"
            title="Split Clip at Playhead (Ctrl+B)"
          >
            <Scissors className="w-3 h-3 text-[#7c3aed]" />
            <span>Split (Ctrl+B)</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => setSnapping(!snapping)}
            className={`p-2 rounded-xl transition-all ${
              snapping
                ? "text-[#7c3aed] bg-purple-50 font-bold border border-purple-200"
                : "text-slate-400 hover:text-[#7c3aed] hover:bg-purple-50"
            }`}
            title={snapping ? "Snapping Enabled (M)" : "Snapping Disabled (M)"}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => selectedClipId && duplicateClip(selectedClipId)}
            disabled={!selectedClipId}
            className="p-2 text-slate-500 hover:text-[#7c3aed] hover:bg-purple-50 rounded-xl transition-all disabled:opacity-30"
            title="Duplicate Selected Clip (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => selectedClipId && rippleDeleteClip(selectedClipId)}
            disabled={!selectedClipId}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30"
            title="Ripple Delete - Remove and close gap (Shift+Del)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] font-medium">Ripple Del</span>
          </button>

          <button
            onClick={() => selectedClipId && deleteClip(selectedClipId)}
            disabled={!selectedClipId}
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30"
            title="Delete Selected Clip (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Add Tracks */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => addTrack("video")}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] bg-slate-50 hover:bg-purple-50 hover:text-[#7c3aed] hover:border-purple-200 rounded-xl border border-[var(--color-rule)] transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-2xs"
          >
            <Plus className="w-3 h-3 text-[#7c3aed]" />
            <span>+ Video</span>
          </button>

          <button
            onClick={() => addTrack("audio")}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 rounded-xl border border-[var(--color-rule)] transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-2xs"
          >
            <Plus className="w-3 h-3 text-emerald-500" />
            <span>+ Audio</span>
          </button>

          <button
            onClick={() => addTrack("subtitle")}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] bg-slate-50 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 rounded-xl border border-[var(--color-rule)] transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-2xs"
          >
            <Plus className="w-3 h-3 text-amber-500" />
            <span>+ Subtitle</span>
          </button>

          <button
            onClick={() => addTextClip()}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink)] bg-slate-50 hover:bg-purple-50 hover:text-[#7c3aed] hover:border-purple-200 rounded-xl border border-[var(--color-rule)] transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-2xs"
            title="Add Rich Text / Title Clip at Playhead"
          >
            <Type className="w-3 h-3 text-purple-500" />
            <span>+ Text</span>
          </button>
        </div>

        {/* Right: Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.max(15, zoom - 15))}
            className="p-1.5 text-slate-500 hover:text-[#7c3aed] hover:bg-purple-50 rounded-xl transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min="15"
            max="180"
            step="5"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#7c3aed]"
            title={`Timeline Zoom: ${Math.round(zoom)}px/s`}
          />

          <button
            onClick={() => setZoom(Math.min(180, zoom + 15))}
            className="p-1.5 text-slate-500 hover:text-[#7c3aed] hover:bg-purple-50 rounded-xl transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoom(60)}
            className="p-1 text-slate-500 hover:text-[#7c3aed] hover:bg-purple-50 rounded-lg transition text-[10px] font-mono font-bold px-2 py-0.5 border border-slate-200"
            title="Reset Zoom to 100%"
          >
            100%
          </button>
        </div>
      </div>

      {/* Main Tracks Workspace */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Left Track Headers (Fixed width 180px, synchronized scroll) */}
        <div className="w-44 bg-white border-r border-[var(--color-rule)] flex flex-col shrink-0 z-20 shadow-2xs">
          <div className="h-8 bg-slate-50 border-b border-[var(--color-rule)] px-3.5 flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 shrink-0">
            <span>Tracks ({tracks.length})</span>
          </div>

          <div
            ref={trackHeadersRef}
            className="flex-1 overflow-hidden pointer-events-auto"
          >
            {tracks.map((track) => (
              <div
                key={track.id}
                style={{ height: `${track.height}px` }}
                className="border-b border-[var(--color-rule)] px-3.5 flex items-center justify-between bg-white hover:bg-purple-50/20 text-xs transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {track.type === "video" ? (
                    <Film className="w-3.5 h-3.5 text-[#7c3aed] shrink-0" />
                  ) : track.type === "subtitle" ? (
                    <Type className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <Music className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                  <span className="font-semibold text-[var(--color-ink)] truncate text-[11px]">
                    {track.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  <button
                    onClick={() => toggleTrackMute(track.id)}
                    className={`p-1 rounded hover:text-slate-800 ${
                      track.isMuted ? "text-red-500" : ""
                    }`}
                    title="Mute Track"
                  >
                    {track.isMuted ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => toggleTrackHide(track.id)}
                    className={`p-1 rounded hover:text-slate-800 ${
                      track.isHidden ? "text-amber-500" : ""
                    }`}
                    title="Hide Track"
                  >
                    {track.isHidden ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => toggleTrackLock(track.id)}
                    className={`p-1 rounded hover:text-slate-800 ${
                      track.isLocked ? "text-red-500" : ""
                    }`}
                    title="Lock Track"
                  >
                    {track.isLocked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Canvas */}
        <div
          ref={tracksScrollRef}
          onScroll={handleTracksScroll}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#f8fafc] custom-scrollbar"
        >
          {/* Time Ruler (32px) */}
          <div
            onMouseDown={handleRulerMouseDown}
            style={{ width: `${timelineWidth}px` }}
            className="h-8 bg-slate-50 border-b border-[var(--color-rule)] relative cursor-pointer select-none"
          >
            {Array.from({ length: totalTicks }).map((_, i) => {
              const sec = i * tickIntervalSec;
              const left = sec * zoom;
              const mins = Math.floor(sec / 60);
              const secs = sec % 60;
              const label = `${mins}:${secs.toString().padStart(2, "0")}`;

              return (
                <div
                  key={i}
                  style={{ left: `${left}px` }}
                  className="absolute top-0 bottom-0 flex flex-col justify-end pb-1 border-l border-slate-200"
                >
                  <span className="text-[9px] font-mono font-medium text-slate-400 pl-1">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Track Lanes */}
          <div
            style={{ width: `${timelineWidth}px` }}
            className="relative flex-1"
          >
            {tracks.map((track) => {
              const trackClips = clips.filter((c) => c.trackId === track.id);

              return (
                <div
                  key={track.id}
                  style={{ height: `${track.height}px` }}
                  className="border-b border-[var(--color-rule)] relative bg-[var(--color-paper-0)] transition"
                >
                  {trackClips.map((clip) => {
                    const isSelected = clip.id === selectedClipId;
                    const left = clip.startOffset * zoom;
                    const width = Math.max(20, clip.duration * zoom);

                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          if (activeTool === "razor") {
                            e.stopPropagation();
                            if (!tracksScrollRef.current) return;
                            const rect =
                              tracksScrollRef.current.getBoundingClientRect();
                            const scrollLeft =
                              tracksScrollRef.current.scrollLeft;
                            const clickX = e.clientX - rect.left + scrollLeft;
                            const clickTime = Math.max(0, clickX / zoom);
                            setCurrentTime(clickTime);
                            splitClipAtCurrentTime(clip.id);
                          }
                        }}
                        onMouseDown={(e) => {
                          if (activeTool === "razor") return;
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                          setDragClipState({
                            clipId: clip.id,
                            initialStartOffset: clip.startOffset,
                            startX: e.clientX,
                            startY: e.clientY,
                            initialTrackId: clip.trackId,
                            duration: clip.duration,
                          });
                        }}
                        style={{
                          left: `${left}px`,
                          width: `${width}px`,
                          height: "calc(100% - 6px)",
                          top: "3px",
                        }}
                        className={`absolute rounded-md overflow-hidden transition-shadow select-none group border flex items-center justify-between ${
                          activeTool === "razor"
                            ? "cursor-crosshair"
                            : "cursor-grab active:cursor-grabbing"
                        } ${
                          isSelected
                            ? "border-[var(--color-accent)] ring-1.5 ring-[var(--color-accent)] bg-[var(--color-paper-3)] shadow-lg z-20"
                            : clip.type === "video"
                              ? "border-[var(--color-rule-focus)] bg-[var(--color-paper-2)] hover:border-[var(--color-accent-subtle)]"
                              : clip.type === "subtitle"
                                ? "border-[var(--color-warning)]/30 bg-[var(--color-paper-2)] hover:border-[var(--color-warning)]/60"
                                : clip.type === "text"
                                  ? "border-purple-500/40 bg-[var(--color-paper-2)] hover:border-purple-500/80"
                                  : "border-[var(--color-success)]/30 bg-[var(--color-paper-2)] hover:border-[var(--color-success)]/60"
                        }`}
                      >
                        {/* Video Transition Indicator Badge */}
                        {clip.transition && clip.transition.type !== "none" && (
                          <div
                            className="absolute left-4 top-0.5 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-medium bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/50 text-[var(--color-accent)] backdrop-blur-xs pointer-events-none"
                            title={`Transition: ${clip.transition.type} (${clip.transition.duration}s)`}
                          >
                            <span className="text-[9px]">⇄</span>
                            <span>{clip.transition.type}</span>
                            <span className="text-[7px] opacity-75">{clip.transition.duration}s</span>
                          </div>
                        )}

                        {/* Audio Waveform Bars & Fade Overlays */}
                        {clip.type === "audio" && (
                          <>
                            {/* Audio Waveform Canvas Bars */}
                            <div className="absolute inset-0 flex items-center justify-between gap-[1px] px-3 pointer-events-none opacity-40 overflow-hidden">
                              {getClipWaveformBars(
                                clip.id,
                                Math.max(14, Math.floor(width / 3.5)),
                                mediaPool.find((m) => m.id === clip.mediaId)?.waveformPeaks,
                                clip.inPoint,
                                clip.duration,
                              ).map((bar, idx) => (
                                <div
                                  key={idx}
                                  style={{ height: `${Math.max(12, Math.round(bar * 100))}%` }}
                                  className={`w-[2px] rounded-full transition-all ${
                                    isSelected
                                      ? "bg-[var(--color-accent)]"
                                      : "bg-[var(--color-success)]"
                                  }`}
                                />
                              ))}
                            </div>

                            {/* Audio Fade In & Fade Out Shaded Visual Ramps */}
                            {((clip.audio?.fadeIn && clip.audio.fadeIn > 0) ||
                              (clip.audio?.fadeOut && clip.audio.fadeOut > 0)) && (
                              <svg
                                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                                preserveAspectRatio="none"
                              >
                                {clip.audio?.fadeIn && clip.audio.fadeIn > 0 && (
                                  <polygon
                                    points={`0,0 ${Math.min(width, clip.audio.fadeIn * zoom)},0 0,60`}
                                    fill="rgba(0, 0, 0, 0.45)"
                                  />
                                )}
                                {clip.audio?.fadeOut && clip.audio.fadeOut > 0 && (
                                  <polygon
                                    points={`${Math.max(0, width - clip.audio.fadeOut * zoom)},0 ${width},0 ${width},60`}
                                    fill="rgba(0, 0, 0, 0.45)"
                                  />
                                )}
                              </svg>
                            )}

                            {/* Audio Fade In Draggable Handle */}
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedClipId(clip.id);
                                setFadeDragState({
                                  clipId: clip.id,
                                  edge: "in",
                                  startX: e.clientX,
                                  initialFade: clip.audio?.fadeIn || 0,
                                  maxFade: clip.duration / 2,
                                });
                              }}
                              style={{
                                left: `${Math.min(width - 10, Math.max(6, (clip.audio?.fadeIn || 0) * zoom))}px`,
                              }}
                              className={`absolute top-0.5 -translate-x-1/2 w-3 h-3 bg-white hover:bg-[var(--color-accent)] rounded-full border border-black shadow cursor-ew-resize z-40 hover:scale-125 transition-transform flex items-center justify-center ${
                                isSelected ? "opacity-100 ring-1 ring-[var(--color-accent)]" : "opacity-0 group-hover:opacity-90"
                              }`}
                              title={`Fade In: ${(clip.audio?.fadeIn || 0).toFixed(1)}s (Drag to adjust)`}
                            >
                              <div className="w-1 h-1 bg-black rounded-full" />
                            </div>

                            {/* Audio Fade Out Draggable Handle */}
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedClipId(clip.id);
                                setFadeDragState({
                                  clipId: clip.id,
                                  edge: "out",
                                  startX: e.clientX,
                                  initialFade: clip.audio?.fadeOut || 0,
                                  maxFade: clip.duration / 2,
                                });
                              }}
                              style={{
                                left: `${Math.max(10, Math.min(width - 6, width - (clip.audio?.fadeOut || 0) * zoom))}px`,
                              }}
                              className={`absolute top-0.5 -translate-x-1/2 w-3 h-3 bg-white hover:bg-[var(--color-accent)] rounded-full border border-black shadow cursor-ew-resize z-40 hover:scale-125 transition-transform flex items-center justify-center ${
                                isSelected ? "opacity-100 ring-1 ring-[var(--color-accent)]" : "opacity-0 group-hover:opacity-90"
                              }`}
                              title={`Fade Out: ${(clip.audio?.fadeOut || 0).toFixed(1)}s (Drag to adjust)`}
                            >
                              <div className="w-1 h-1 bg-black rounded-full" />
                            </div>
                          </>
                        )}

                        {/* Left Trim Handle */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const media = mediaPool.find(
                              (m) => m.id === clip.mediaId,
                            );
                            setSelectedClipId(clip.id);
                            setTrimmingState({
                              clipId: clip.id,
                              edge: "left",
                              startX: e.clientX,
                              initialInPoint: clip.inPoint,
                              initialOutPoint: clip.outPoint,
                              initialDuration: clip.duration,
                              initialStartOffset: clip.startOffset,
                              mediaDuration: media?.duration,
                            });
                          }}
                          className="w-3.5 h-full bg-black/40 hover:bg-[var(--color-accent)] cursor-ew-resize shrink-0 transition-colors flex items-center justify-center z-30 group/handle"
                          title="Drag to trim start"
                        >
                          <div className="w-1 h-3.5 bg-white/60 group-hover/handle:bg-black rounded-full" />
                        </div>

                        {/* Clip Content & Label */}
                        <div className="flex-1 px-2 min-w-0 flex items-center gap-1.5 h-full overflow-hidden pointer-events-none relative z-20">
                          {clip.type === "video" ? (
                            <Film className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                          ) : clip.type === "subtitle" ? (
                            <Type className="w-3.5 h-3.5 text-[var(--color-warning)] shrink-0" />
                          ) : clip.type === "text" ? (
                            <Type className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          ) : (
                            <Music className="w-3.5 h-3.5 text-[var(--color-success)] shrink-0" />
                          )}
                          <span className="text-[11px] font-medium text-[var(--color-ink)] truncate font-mono">
                            {clip.subtitleText || clip.name}
                          </span>
                          <span className="text-[9px] text-[var(--color-ink-faint)] font-mono ml-auto shrink-0">
                            {clip.duration.toFixed(1)}s
                          </span>
                        </div>

                        {/* Right Trim Handle */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const media = mediaPool.find(
                              (m) => m.id === clip.mediaId,
                            );
                            setSelectedClipId(clip.id);
                            setTrimmingState({
                              clipId: clip.id,
                              edge: "right",
                              startX: e.clientX,
                              initialInPoint: clip.inPoint,
                              initialOutPoint: clip.outPoint,
                              initialDuration: clip.duration,
                              initialStartOffset: clip.startOffset,
                              mediaDuration: media?.duration,
                            });
                          }}
                          className="w-3.5 h-full bg-black/40 hover:bg-[var(--color-accent)] cursor-ew-resize shrink-0 transition-colors flex items-center justify-center z-30 group/handle"
                          title="Drag to trim end"
                        >
                          <div className="w-1 h-3.5 bg-white/60 group-hover/handle:bg-black rounded-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Draggable Playhead */}
            <div
              style={{ left: `${currentTime * zoom}px` }}
              className="absolute top-0 bottom-0 w-0.5 bg-[#7c3aed] pointer-events-none z-30 shadow-[0_0_10px_rgba(124,58,237,0.5)]"
            >
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsScrubbing(true);
                }}
                className="w-4 h-5 bg-[#7c3aed] rounded-b-md -translate-x-[7px] -top-8 absolute flex items-center justify-center pointer-events-auto cursor-ew-resize shadow-md shadow-purple-500/40 hover:scale-115 transition-transform"
                title="Drag playhead"
              >
                <div className="w-1 h-2.5 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
