import React, { useState, useEffect } from "react";
import { HeaderBar } from "@/components/layout/HeaderBar";
import { MediaPool } from "@/components/media/MediaPool";
import { SocialDownloader } from "@/components/downloader/SocialDownloader";
import { VoiceStudio } from "@/components/voice/VoiceStudio";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { InspectorPanel } from "@/components/inspector/InspectorPanel";
import { Timeline } from "@/components/timeline/Timeline";
import { ExportModal } from "@/components/export/ExportModal";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { StatusBar } from "@/components/layout/StatusBar";
import { SplashScreen } from "@/components/common/SplashScreen";
import { useHardwareStore } from "@/store/useHardwareStore";
import {
  FolderOpen,
  Download,
  Mic,
  Sliders,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export function App() {
  const [activeLeftTab, setActiveLeftTab] = useState<
    "media" | "downloader" | "voice"
  >("media");
  const [isLeftDockOpen, setIsLeftDockOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Resizable Panel States
  const [leftPanelWidth, setLeftPanelWidth] = useState(360);
  const [inspectorWidth, setInspectorWidth] = useState(320);
  const [timelineHeight, setTimelineHeight] = useState(280);
  const [activeResizer, setActiveResizer] = useState<
    "left" | "inspector" | "timeline" | null
  >(null);

  const { setHardwareInfo } = useHardwareStore();

  // Detect hardware on initial load
  useEffect(() => {
    const detectHardware = async () => {
      try {
        if ((window as any).__TAURI_INTERNALS__) {
          const { invoke } = await import("@tauri-apps/api/core");
          const info = await invoke<any>("detect_hardware");
          if (info) setHardwareInfo(info);
        } else {
          // Default detected profile
          setHardwareInfo({
            os: "Windows 11 / Multiplatform",
            cpuName: "Multi-core Processor",
            cpuCores: 16,
            totalRamGb: 32,
            gpuName: "NVIDIA GeForce RTX (NVENC Accelerated)",
            accelerationType: "nvenc",
            encodersAvailable: ["h264_nvenc", "hevc_nvenc", "libx264"],
            isHardwareAccelerated: true,
          });
        }
      } catch (e) {
        console.warn("Using fallback hardware profile:", e);
      }
    };

    detectHardware();
  }, [setHardwareInfo]);

  // Handle panel resizing
  useEffect(() => {
    if (!activeResizer) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (activeResizer === "left") {
        // Icon bar is 48px (w-12)
        const newWidth = Math.max(220, Math.min(650, e.clientX - 48));
        setLeftPanelWidth(newWidth);
      } else if (activeResizer === "inspector") {
        const newWidth = Math.max(220, Math.min(550, window.innerWidth - e.clientX));
        setInspectorWidth(newWidth);
      } else if (activeResizer === "timeline") {
        const newHeight = Math.max(
          150,
          Math.min(window.innerHeight - 180, window.innerHeight - e.clientY),
        );
        setTimelineHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setActiveResizer(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeResizer]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--color-paper-0)] text-[var(--color-ink)] select-none">
      {/* Invisible shield to capture mouse events during resize dragging */}
      {activeResizer && (
        <div
          className={`fixed inset-0 z-50 select-none ${
            activeResizer === "timeline"
              ? "cursor-row-resize"
              : "cursor-col-resize"
          }`}
        />
      )}

      {/* 1. Header Bar */}
      <HeaderBar
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* 2. Middle Work Area (Left Dock, Player, Inspector) */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Left Vertical Icon Rail (Clipchamp Style: Crisp White & Purple Active Capsule) */}
        <div className="w-16 bg-[var(--color-paper-1)] border-r border-[var(--color-rule)] flex flex-col items-center py-3 gap-3 z-30 shrink-0 select-none shadow-2xs">
          <button
            onClick={() => {
              if (activeLeftTab === "media" && isLeftDockOpen) {
                setIsLeftDockOpen(false);
              } else {
                setActiveLeftTab("media");
                setIsLeftDockOpen(true);
              }
            }}
            className={`w-12 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-150 cursor-pointer ${
              activeLeftTab === "media" && isLeftDockOpen
                ? "bg-[#7c3aed] text-white shadow-md shadow-purple-500/25 scale-[1.03]"
                : "text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-purple-50 hover:scale-105"
            }`}
            title="Media Pool (My Media)"
          >
            <FolderOpen className="w-4.5 h-4.5" />
            <span className="text-[9px] font-medium leading-none">Media</span>
          </button>

          <button
            onClick={() => {
              if (activeLeftTab === "downloader" && isLeftDockOpen) {
                setIsLeftDockOpen(false);
              } else {
                setActiveLeftTab("downloader");
                setIsLeftDockOpen(true);
              }
            }}
            className={`w-12 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-150 cursor-pointer ${
              activeLeftTab === "downloader" && isLeftDockOpen
                ? "bg-[#7c3aed] text-white shadow-md shadow-purple-500/25 scale-[1.03]"
                : "text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-purple-50 hover:scale-105"
            }`}
            title="Social Downloader (YouTube, IG, X)"
          >
            <Download className="w-4.5 h-4.5" />
            <span className="text-[9px] font-medium leading-none">Stream</span>
          </button>

          <button
            onClick={() => {
              if (activeLeftTab === "voice" && isLeftDockOpen) {
                setIsLeftDockOpen(false);
              } else {
                setActiveLeftTab("voice");
                setIsLeftDockOpen(true);
              }
            }}
            className={`w-12 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-150 cursor-pointer ${
              activeLeftTab === "voice" && isLeftDockOpen
                ? "bg-[#7c3aed] text-white shadow-md shadow-purple-500/25 scale-[1.03]"
                : "text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-purple-50 hover:scale-105"
            }`}
            title="AI Voice & Captions"
          >
            <Mic className="w-4.5 h-4.5" />
            <span className="text-[9px] font-medium leading-none">Voice AI</span>
          </button>
        </div>

        {/* Left Collapsible & Resizable Panel Content */}
        {isLeftDockOpen && (
          <>
            <div
              style={{ width: `${leftPanelWidth}px` }}
              className="border-r border-[var(--color-rule)] bg-[var(--color-paper-1)] flex flex-col shrink-0 z-20 overflow-hidden relative shadow-xs"
            >
              {activeLeftTab === "media" && <MediaPool />}
              {activeLeftTab === "downloader" && <SocialDownloader />}
              {activeLeftTab === "voice" && <VoiceStudio />}

              {/* Collapse button */}
              <button
                onClick={() => setIsLeftDockOpen(false)}
                className="absolute top-3 right-3 p-1 text-[var(--color-ink-faint)] hover:text-[#7c3aed] rounded-lg hover:bg-purple-50 z-30 transition hover:scale-105"
                title="Collapse Panel"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Left Vertical Resizer Splitter */}
            <div
              onMouseDown={() => setActiveResizer("left")}
              className="w-1.5 hover:w-2 bg-[var(--color-rule)] hover:bg-[#7c3aed] active:bg-[#7c3aed] cursor-col-resize z-30 transition-all shrink-0 flex items-center justify-center group"
              title="Drag to resize panel width"
            >
              <div className="w-0.5 h-6 bg-slate-300 group-hover:bg-white rounded-full transition" />
            </div>
          </>
        )}

        {/* Center Preview Player */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <VideoPlayer />
        </div>

        {/* Right Inspector Panel (Collapsible & Resizable) */}
        {isInspectorOpen ? (
          <>
            {/* Inspector Vertical Resizer Splitter */}
            <div
              onMouseDown={() => setActiveResizer("inspector")}
              className="w-1.5 hover:w-2 bg-[var(--color-rule)] hover:bg-[#7c3aed] active:bg-[#7c3aed] cursor-col-resize z-30 transition-all shrink-0 flex items-center justify-center group"
              title="Drag to resize inspector width"
            >
              <div className="w-0.5 h-6 bg-slate-300 group-hover:bg-white rounded-full transition" />
            </div>

            <div
              style={{ width: `${inspectorWidth}px` }}
              className="border-l border-[var(--color-rule)] bg-[var(--color-paper-1)] flex flex-col shrink-0 z-20 overflow-hidden relative shadow-xs"
            >
              <InspectorPanel />
              <button
                onClick={() => setIsInspectorOpen(false)}
                className="absolute top-3 right-3 p-1 text-[var(--color-ink-faint)] hover:text-[#7c3aed] rounded-lg hover:bg-purple-50 z-30 transition hover:scale-105"
                title="Collapse Inspector"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => setIsInspectorOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2.5 bg-white border-l border-y border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-purple-50 rounded-l-xl z-30 shadow-md transition-all hover:scale-105"
            title="Open Inspector Panel"
          >
            <Sliders className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Horizontal Timeline Resizer Splitter */}
      <div
        onMouseDown={() => setActiveResizer("timeline")}
        className="h-1.5 hover:h-2 bg-[var(--color-rule)] hover:bg-[#7c3aed] active:bg-[#7c3aed] cursor-row-resize z-30 transition-all shrink-0 flex items-center justify-center group select-none"
        title="Drag to resize timeline height"
      >
        <div className="h-0.5 w-16 bg-slate-300 group-hover:bg-white rounded-full transition" />
      </div>

      {/* 3. Bottom Multi-Track Timeline (Resizable Height) */}
      <div
        style={{ height: `${timelineHeight}px` }}
        className="w-full shrink-0 z-10 flex flex-col overflow-hidden min-h-0"
      >
        <Timeline />
      </div>

      {/* 4. Bottom Studio Status Bar */}
      <StatusBar />

      {/* 5. Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* 6. Launch Splash Screen */}
      <SplashScreen />
    </div>
  );
}

export default App;
