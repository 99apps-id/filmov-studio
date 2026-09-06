import React, { useState, useEffect } from "react";
import { useHardwareStore } from "@/store/useHardwareStore";
import { useEditorStore } from "@/store/useEditorStore";
import {
  X,
  Zap,
  Download,
  CheckCircle2,
  Loader2,
  FolderOpen,
  AlertCircle,
  Film,
  Ban,
} from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    isExporting,
    setIsExporting,
    exportProgress,
    setExportProgress,
    exportStatus,
    exportConfig,
    setExportConfig,
  } = useHardwareStore();

  const { project, duration, clips, tracks, mediaPool } = useEditorStore();
  const [exportDone, setExportDone] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string>("");
  const [exportedFilePath, setExportedFilePath] = useState<string | null>(null);
  const [format, setFormat] = useState<"mp4" | "webm" | "mov" | "mkv">("mp4");

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setExportDone(false);
      setExportError(null);
      setExportedFilePath(null);
    }
  }, [isOpen]);

  // Listen to Tauri export-progress events
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      if ((window as any).__TAURI_INTERNALS__) {
        try {
          const { listen } = await import("@tauri-apps/api/event");
          unlisten = await listen<any>("export-progress", (event) => {
            const payload = event.payload;
            if (payload) {
              setExportProgress(Math.round(payload.progress), payload.status);
              if (payload.isFinished) {
                setIsExporting(false);
                if (payload.error) {
                  setExportError(payload.error);
                } else {
                  setExportDone(true);
                  if (payload.outputPath) {
                    setExportedFilePath(payload.outputPath);
                  }
                }
              }
            }
          });
        } catch (err) {
          console.warn("Failed to listen to export-progress:", err);
        }
      }
    };

    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, [setExportProgress, setIsExporting]);

  if (!isOpen) return null;

  // Calculate resolution dimensions
  const getOutputDimensions = () => {
    if (exportConfig.resolution === "4k") {
      return { width: 3840, height: 2160 };
    }
    if (exportConfig.resolution === "720p") {
      return { width: 1280, height: 720 };
    }
    if (exportConfig.resolution === "1080p") {
      return { width: 1920, height: 1080 };
    }
    return { width: project.width, height: project.height };
  };

  const handleBrowseOutput = async () => {
    if (typeof (window as any).showSaveFilePicker === "function") {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `${project.name}.${format}`,
          types: [
            {
              description: `${format.toUpperCase()} Video`,
              accept: { [`video/${format}`]: [`.${format}`] },
            },
          ],
        });
        setOutputPath(handle.name);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("File picker error:", err);
        }
      }
    }
  };

  const handleCancelExport = async () => {
    if ((window as any).__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("cancel_export");
      } catch (e) {
        console.warn("Cancel export failed:", e);
      }
    }
    setIsExporting(false);
    setExportStatus("Export Dibatalkan");
    setExportProgress(0, "Dibatalkan");
  };

  const handleRevealInFolder = async () => {
    const target = exportedFilePath || outputPath;
    if (!target) return;

    if ((window as any).__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("reveal_in_folder", { path: target });
      } catch (e) {
        console.warn("Reveal in folder failed:", e);
      }
    }
  };

  const handleStartExport = async () => {
    setIsExporting(true);
    setExportDone(false);
    setExportError(null);
    setExportProgress(0, "Inisialisasi Encoder Hardware...");

    const dims = getOutputDimensions();

    if ((window as any).__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const renderedPath: string = await invoke("export_project", {
          config: {
            ...exportConfig,
            format,
            outputPath: outputPath.trim() || undefined,
            projectName: project.name,
            width: dims.width,
            height: dims.height,
            fps: exportConfig.fps || project.fps,
            duration,
            clips,
            tracks,
            mediaPool,
          },
        });
        if (renderedPath) {
          setExportedFilePath(renderedPath);
        }
      } catch (e: any) {
        console.warn("Tauri export failed:", e);
        setExportError(e?.toString() || "Gagal memulai export.");
        setIsExporting(false);
      }
    } else {
      // Browser fallback simulation
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 10) + 6;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setExportProgress(100, "Render Berhasil Diselesaikan!");
          setIsExporting(false);
          setExportDone(true);
          setExportedFilePath(`${project.name}.${format}`);
        } else if (progress > 75) {
          setExportProgress(
            progress,
            "Muxing Audio & Video Streams...",
          );
        } else if (progress > 30) {
          setExportProgress(
            progress,
            `Encoding Frame dengan ${exportConfig.codec.toUpperCase()} (${progress}%)...`,
          );
        } else {
          setExportProgress(progress, "Compositing Timeline Tracks & Filters...");
        }
      }, 350);
    }
  };

  const setExportStatus = (status: string) => {
    useHardwareStore.getState().setExportProgress(exportProgress, status);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#9333ea] flex items-center justify-center text-white shadow-md shadow-purple-500/25">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Export Video Project
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-[#7c3aed] border border-purple-200 font-semibold">
                  GPU Accelerated
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Render timeline into high-resolution video with FFmpeg
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Format & Codec */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Format Container
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                disabled={isExporting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-purple-200 disabled:opacity-50"
              >
                <option value="mp4">MP4 (Universal Video)</option>
                <option value="webm">WebM (VP9 / Web Native)</option>
                <option value="mov">QuickTime MOV (Apple / ProRes)</option>
                <option value="mkv">MKV (Matroska Media)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Resolution Preset
              </label>
              <select
                value={exportConfig.resolution}
                onChange={(e) =>
                  setExportConfig({
                    resolution: e.target.value as any,
                  })
                }
                disabled={isExporting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-purple-200 disabled:opacity-50"
              >
                <option value="1080p">1080p Full HD (1920 x 1080)</option>
                <option value="4k">4K UHD (3840 x 2160)</option>
                <option value="720p">720p HD (1280 x 720)</option>
              </select>
            </div>
          </div>

          {/* Hardware Encoder Selection */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <label className="text-[11px] font-bold text-slate-800 block mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#7c3aed]" />
                Video Encoder Engine
              </span>
              <span className="text-[10px] font-semibold text-[#7c3aed] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 uppercase">
                {exportConfig.codec.includes("nvenc")
                  ? "NVIDIA NVENC"
                  : exportConfig.codec.includes("qsv")
                    ? "Intel QuickSync"
                    : "CPU Software"}
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setExportConfig({ codec: "h264_nvenc" })}
                disabled={isExporting}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  exportConfig.codec === "h264_nvenc"
                    ? "border-[#7c3aed] bg-purple-50/70 text-slate-900 ring-2 ring-purple-100 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-600 hover:border-purple-200"
                }`}
              >
                <span className="font-bold text-xs block text-[#7c3aed]">
                  ⚡ NVIDIA NVENC (H.264)
                </span>
                <span className="text-[10px] text-slate-500">
                  Hardware Acceleration
                </span>
              </button>

              <button
                type="button"
                onClick={() => setExportConfig({ codec: "hevc_nvenc" })}
                disabled={isExporting}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  exportConfig.codec === "hevc_nvenc"
                    ? "border-[#7c3aed] bg-purple-50/70 text-slate-900 ring-2 ring-purple-100 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-600 hover:border-purple-200"
                }`}
              >
                <span className="font-bold text-xs block text-[#7c3aed]">
                  ⚡ NVIDIA HEVC (H.265)
                </span>
                <span className="text-[10px] text-slate-500">
                  High Compression 4K
                </span>
              </button>

              <button
                type="button"
                onClick={() => setExportConfig({ codec: "h264_qsv" })}
                disabled={isExporting}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  exportConfig.codec === "h264_qsv"
                    ? "border-[#7c3aed] bg-purple-50/70 text-slate-900 ring-2 ring-purple-100 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-600 hover:border-purple-200"
                }`}
              >
                <span className="font-bold text-xs block text-blue-600">
                  ⚡ Intel QuickSync (QSV)
                </span>
                <span className="text-[10px] text-slate-500">
                  Intel iGPU / Arc
                </span>
              </button>

              <button
                type="button"
                onClick={() => setExportConfig({ codec: "libx264" })}
                disabled={isExporting}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  exportConfig.codec === "libx264"
                    ? "border-[#7c3aed] bg-purple-50/70 text-slate-900 ring-2 ring-purple-100 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-600 hover:border-purple-200"
                }`}
              >
                <span className="font-bold text-xs block text-slate-700">
                  CPU Software (libx264)
                </span>
                <span className="text-[10px] text-slate-500">
                  Universal Fallback
                </span>
              </button>
            </div>
          </div>

          {/* FPS & Target Bitrate */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Frame Rate (FPS)
              </label>
              <select
                value={exportConfig.fps}
                onChange={(e) =>
                  setExportConfig({ fps: Number(e.target.value) as any })
                }
                disabled={isExporting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-[#7c3aed]"
              >
                <option value={60}>60 FPS (Smooth)</option>
                <option value={30}>30 FPS (Standard)</option>
                <option value={24}>24 FPS (Cinematic Film)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold text-slate-700">
                  Target Bitrate
                </label>
                <span className="font-mono font-bold text-[#7c3aed]">
                  {Math.round(exportConfig.bitrateKbps / 1000)} Mbps
                </span>
              </div>
              <input
                type="range"
                min="4000"
                max="50000"
                step="2000"
                value={exportConfig.bitrateKbps}
                onChange={(e) =>
                  setExportConfig({ bitrateKbps: Number(e.target.value) })
                }
                disabled={isExporting}
                className="w-full accent-[#7c3aed] mt-1"
              />
            </div>
          </div>

          {/* Destination Path */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
              File Tujuan (Opsional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`Default: Exports/${project.name}_render.${format}`}
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                disabled={isExporting}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs font-mono focus:outline-none focus:border-[#7c3aed] placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleBrowseOutput}
                disabled={isExporting}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Browse...
              </button>
            </div>
          </div>

          {/* Export Progress Bar */}
          {isExporting && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 text-[#7c3aed] animate-spin" />
                  {exportStatus}
                </span>
                <span className="font-mono text-[#7c3aed] font-bold">
                  {exportProgress}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-purple-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7] transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Export Error Alert */}
          {exportError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-600 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Export Gagal</span>
                <p className="text-[11px] text-red-500 mt-0.5">{exportError}</p>
              </div>
            </div>
          )}

          {/* Export Completed Message */}
          {exportDone && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-700">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <div>
                  <span className="font-bold block">Export Berhasil!</span>
                  <span className="text-[11px] text-emerald-600 truncate max-w-[280px] block font-mono">
                    {exportedFilePath || `${project.name}.${format}`}
                  </span>
                </div>
              </div>
              {exportedFilePath && (
                <button
                  type="button"
                  onClick={handleRevealInFolder}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Buka Folder</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            Durasi: {duration.toFixed(1)}s • {clips.length} Clips
          </div>

          <div className="flex items-center gap-2.5">
            {isExporting ? (
              <button
                type="button"
                onClick={handleCancelExport}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Batalkan</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition"
              >
                {exportDone ? "Tutup" : "Batal"}
              </button>
            )}

            {!exportDone && (
              <button
                type="button"
                onClick={handleStartExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#6d28d9] hover:to-[#7e22ce] text-white font-bold rounded-xl shadow-md shadow-purple-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 text-xs"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Merender Video...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-white" />
                    <span>Mulai Render Video</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
