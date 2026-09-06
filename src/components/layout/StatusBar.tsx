import React from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { useHardwareStore } from "@/store/useHardwareStore";
import { useDownloaderStore } from "@/store/useDownloaderStore";
import {
  Zap,
  Layers,
  Clock,
} from "lucide-react";
import { formatTimecode } from "@/utils/time";

export const StatusBar: React.FC = () => {
  const {
    project,
    currentTime,
    duration,
    clips,
    tracks,
    zoom,
    isDirty,
  } = useEditorStore();
  const { hardwareInfo, isExporting, exportProgress } = useHardwareStore();
  const { tasks } = useDownloaderStore();

  const activeDownloads = tasks.filter((t) => t.status === "downloading").length;

  return (
    <footer className="h-7 bg-white border-t border-[var(--color-rule)] px-4 flex items-center justify-between text-[11px] text-slate-500 font-mono select-none z-30 shrink-0 shadow-2xs">
      {/* Left items: System / Project Status */}
      <div className="flex items-center gap-3">
        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 font-medium">
          {isExporting ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#7c3aed] animate-pulse" />
              <span className="text-[#7c3aed] font-semibold">
                Rendering {exportProgress}%
              </span>
            </>
          ) : activeDownloads > 0 ? (
            <>
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span className="text-blue-600 font-semibold">
                Downloading ({activeDownloads})
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
              <span className="text-emerald-700 font-semibold">Ready</span>
            </>
          )}
        </div>

        <div className="h-3 w-px bg-slate-200" />

        {/* Project Name & Status */}
        <div className="flex items-center gap-1 text-slate-600 truncate max-w-[200px]">
          <span className="font-semibold text-slate-800">{project.name}</span>
          {isDirty && (
            <span className="text-amber-500 font-bold" title="Perubahan belum disimpan">*</span>
          )}
        </div>

        <div className="h-3 w-px bg-slate-200" />

        {/* Resolution & Aspect Ratio */}
        <div className="flex items-center gap-1 text-slate-500">
          <span>{project.width}×{project.height}</span>
          <span className="text-slate-400">({project.aspectRatio})</span>
        </div>
      </div>

      {/* Center items: Timeline Summary */}
      <div className="flex items-center gap-3 hidden md:flex">
        <div className="flex items-center gap-1 text-slate-600">
          <Clock className="w-3 h-3 text-[#7c3aed]" />
          <span className="font-semibold text-slate-800">{formatTimecode(currentTime, project.fps)}</span>
          <span className="text-slate-400">/</span>
          <span>{formatTimecode(duration, project.fps)}</span>
        </div>

        <div className="h-3 w-px bg-slate-200" />

        <div className="flex items-center gap-1.5 text-slate-500">
          <Layers className="w-3 h-3 text-slate-400" />
          <span>{clips.length} clips</span>
          <span className="text-slate-400">•</span>
          <span>{tracks.length} tracks</span>
        </div>
      </div>

      {/* Right items: Hardware & System Metrics */}
      <div className="flex items-center gap-3">
        {/* Hardware Acceleration engine */}
        <div
          className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200"
          title={hardwareInfo?.gpuName || "GPU Hardware Acceleration"}
        >
          <Zap className="w-2.5 h-2.5 text-[#7c3aed]" />
          <span>
            {hardwareInfo?.accelerationType?.toUpperCase() || "GPU"} ACCEL
          </span>
        </div>

        <div className="h-3 w-px bg-slate-200" />

        {/* Frame rate */}
        <span className="text-slate-600 font-medium">
          {project.fps} FPS
        </span>

        <div className="h-3 w-px bg-slate-200" />

        {/* Zoom */}
        <span className="text-slate-500 font-medium">
          Zoom: {Math.round(zoom)}px/s
        </span>
      </div>
    </footer>
  );
};
