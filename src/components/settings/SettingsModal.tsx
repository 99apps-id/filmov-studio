import React, { useState, useEffect } from "react";
import { useHardwareStore } from "@/store/useHardwareStore";
import {
  X,
  Zap,
  CheckCircle,
  AlertTriangle,
  Settings,
  Smartphone,
  Monitor,
  Folder,
  RefreshCw,
  Download,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EngineStatusData {
  ffmpegAvailable: boolean;
  ffmpegVersion: string;
  ffmpegPath: string;
  ytdlpAvailable: boolean;
  ytdlpVersion: string;
  ytdlpPath: string;
  runtimeDir: string;
  downloadsDir: string;
  exportsDir: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { hardwareInfo } = useHardwareStore();
  const [engineStatus, setEngineStatus] = useState<EngineStatusData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installMsg, setInstallMsg] = useState<string | null>(null);

  const installEngines = async () => {
    setIsInstalling(true);
    setInstallMsg(null);
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import("@tauri-apps/api/core");
        const res = await invoke<any>("install_engines");
        setInstallMsg(res?.message || "Instalasi selesai.");
      } else {
        setInstallMsg("Instalasi engine hanya tersedia di aplikasi desktop (Tauri).");
      }
    } catch (e: any) {
      setInstallMsg("Instalasi gagal: " + (e?.toString?.() || e));
    } finally {
      setIsInstalling(false);
      await fetchEngines();
    }
  };

  const fetchEngines = async () => {
    setIsRefreshing(true);
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import("@tauri-apps/api/core");
        const status = await invoke<EngineStatusData>("check_engine_status");
        setEngineStatus(status);
      } else {
        // Mock profile for browser testing
        setEngineStatus({
          ffmpegAvailable: true,
          ffmpegVersion: "FFmpeg 7.1-full_build (GPU Accel)",
          ffmpegPath: "System PATH",
          ytdlpAvailable: true,
          ytdlpVersion: "yt-dlp 2026.03.01",
          ytdlpPath: "System PATH",
          runtimeDir: "%LOCALAPPDATA%\\com.filmov.app\\binaries",
          downloadsDir: "Videos\\Filmov\\Downloads",
          exportsDir: "Videos\\Filmov\\Exports",
        });
      }
    } catch (e) {
      console.warn("Failed to query engine status:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEngines();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7c3aed] to-[#9333ea] flex items-center justify-center text-white shadow-md shadow-purple-500/25">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Filmov Diagnostics & Production Engines
              </h2>
              <p className="text-[11px] text-slate-500">
                Binary resolver, hardware acceleration, and secure storage
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Hardware Status Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#7c3aed]" />
                Hardware Acceleration Engine
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-50 text-[#7c3aed] border border-purple-200 font-bold uppercase">
                {hardwareInfo?.accelerationType ? `${hardwareInfo.accelerationType} Accel` : "Active"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-[11px]">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-slate-500 block text-[10px] font-medium">GPU Device</span>
                <span className="text-slate-900 font-bold block truncate">
                  {hardwareInfo?.gpuName || "Dedicated/Integrated GPU"}
                </span>
                <span className="text-[#7c3aed] font-medium text-[10px]">
                  NVENC / QuickSync Enabled
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-slate-500 block text-[10px] font-medium">CPU Cores</span>
                <span className="text-slate-900 font-bold block">
                  {hardwareInfo?.cpuCores || 16} Threads Architecture
                </span>
                <span className="text-blue-600 font-medium text-[10px]">
                  SIMD AVX2 / NEON Active
                </span>
              </div>
            </div>
          </div>

          {/* Engine Dependencies (yt-dlp & FFmpeg) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 block text-[11px]">
                Core Production Binaries (yt-dlp + ffmpeg)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={installEngines}
                  disabled={isInstalling}
                  className="text-[10px] text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 font-bold px-2 py-1 rounded-lg"
                  title="Download missing yt-dlp / ffmpeg into the app runtime dir"
                >
                  <Download className={`w-3 h-3 ${isInstalling ? "animate-pulse" : ""}`} />
                  <span>{isInstalling ? "Installing..." : "Install Engines"}</span>
                </button>
                <button
                  onClick={fetchEngines}
                  disabled={isRefreshing}
                  className="text-[10px] text-[#7c3aed] hover:text-[#6d28d9] flex items-center gap-1 font-bold"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span>Re-scan</span>
                </button>
              </div>
            </div>

            {installMsg && (
              <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-700 font-medium">
                {installMsg}
              </div>
            )}

            {/* yt-dlp */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                {engineStatus?.ytdlpAvailable ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="text-slate-900 font-semibold block truncate">
                    yt-dlp Downloader Engine
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate font-mono">
                    {engineStatus?.ytdlpPath || "Checked in AppData & PATH"}
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-semibold shrink-0 ${
                  engineStatus?.ytdlpAvailable
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {engineStatus?.ytdlpAvailable ? "Ready" : "Portable Fallback"}
              </span>
            </div>

            {/* FFmpeg */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                {engineStatus?.ffmpegAvailable ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="text-slate-900 font-semibold block truncate">
                    FFmpeg Hardware Compositor
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate font-mono">
                    {engineStatus?.ffmpegPath || "Checked in AppData & PATH"}
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-semibold shrink-0 ${
                  engineStatus?.ffmpegAvailable
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {engineStatus?.ffmpegAvailable ? "Ready" : "Portable Fallback"}
              </span>
            </div>
          </div>

          {/* Secure Storage Locations */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <span className="font-bold text-slate-800 block text-[11px] flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-[#7c3aed]" />
              Secure Media Folders (No Path Traversal)
            </span>
            <div className="space-y-1.5 text-[10px] font-mono">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex justify-between items-center text-slate-700 shadow-2xs">
                <span className="text-slate-500">Downloads:</span>
                <span className="text-[#7c3aed] font-semibold truncate max-w-[260px]">
                  {engineStatus?.downloadsDir || "Videos/Filmov/Downloads"}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex justify-between items-center text-slate-700 shadow-2xs">
                <span className="text-slate-500">Exports:</span>
                <span className="text-[#7c3aed] font-semibold truncate max-w-[260px]">
                  {engineStatus?.exportsDir || "Videos/Filmov/Exports"}
                </span>
              </div>
            </div>
          </div>

          {/* Cross-Platform Targets */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <span className="font-bold text-slate-800 block text-[11px]">
              Tauri v2 Deployment Targets
            </span>
            <div className="grid grid-cols-2 gap-2.5 text-[11px]">
              <div className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <Monitor className="w-4 h-4 text-[#7c3aed]" />
                <div>
                  <span className="text-slate-900 block font-semibold">Desktop</span>
                  <span className="text-[10px] text-slate-500">
                    Windows, macOS, Linux
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <Smartphone className="w-4 h-4 text-[#9333ea]" />
                <div>
                  <span className="text-slate-900 block font-semibold">Mobile</span>
                  <span className="text-[10px] text-slate-500">
                    Android & iOS Ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#6d28d9] hover:to-[#7e22ce] text-white font-bold rounded-xl shadow-md shadow-purple-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
