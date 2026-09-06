import React, { useState, useRef, useEffect } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { useHardwareStore } from "@/store/useHardwareStore";
import { AspectRatio } from "@/types/editor";
import {
  Magnet,
  Sparkles,
  Zap,
  Download,
  ZoomIn,
  ZoomOut,
  Settings,
  FolderOpen,
  Save,
  FilePlus,
  Undo2,
  Redo2,
  Minus,
  Square,
  Copy,
  X,
} from "lucide-react";

interface HeaderBarProps {
  onOpenExport: () => void;
  onOpenSettings: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onOpenExport,
  onOpenSettings,
}) => {
  const {
    project,
    setProjectName,
    setAspectRatio,
    snapping,
    setSnapping,
    magnetMode,
    setMagnetMode,
    zoom,
    setZoom,
    isDirty,
    projectPath,
    saveProject,
    loadProjectData,
    newProject,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorStore();

  const { hardwareInfo } = useHardwareStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [projectTitle, setProjectTitle] = useState(project.name);
  const [isSaving, setIsSaving] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check and listen to window maximize state
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const initWindowState = async () => {
      if ((window as any).__TAURI_INTERNALS__) {
        try {
          const { getCurrentWindow } = await import("@tauri-apps/api/window");
          const appWin = getCurrentWindow();
          setIsMaximized(await appWin.isMaximized());
          unlisten = await appWin.onResized(async () => {
            setIsMaximized(await appWin.isMaximized());
          });
        } catch (e) {
          console.warn("Failed to listen to window state:", e);
        }
      }
    };
    initWindowState();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleMinimize = async () => {
    if ((window as any).__TAURI_INTERNALS__) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      getCurrentWindow().minimize();
    }
  };

  const handleToggleMaximize = async () => {
    if ((window as any).__TAURI_INTERNALS__) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWin = getCurrentWindow();
      await appWin.toggleMaximize();
      setIsMaximized(await appWin.isMaximized());
    } else {
      setIsMaximized((prev) => !prev);
    }
  };

  const handleClose = async () => {
    if ((window as any).__TAURI_INTERNALS__) {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      getCurrentWindow().close();
    } else {
      if (window.confirm("Keluar dari Filmov?")) {
        window.close();
      }
    }
  };

  // Sync title from state
  useEffect(() => {
    setProjectTitle(project.name);
  }, [project.name]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (projectTitle.trim()) {
      setProjectName(projectTitle.trim());
    }
  };

  const handleSave = async (forceSaveAs = false) => {
    setIsSaving(true);
    try {
      await saveProject(forceSaveAs ? undefined : (projectPath || undefined));
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        const success = loadProjectData(data, file.name);
        if (!success) {
          alert("Gagal membaca file proyek. Pastikan format file .filmov valid.");
        }
      } catch (err) {
        console.error("Failed to parse project file:", err);
        alert("File proyek rusak atau tidak valid JSON.");
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be reselected
    e.target.value = "";
  };

  const handleNewProject = () => {
    if (isDirty) {
      if (
        !window.confirm(
          "Ada perubahan yang belum disimpan. Yakin ingin membuat proyek baru?",
        )
      ) {
        return;
      }
    }
    newProject();
  };

  // Keyboard Shortcuts: Ctrl+S, Ctrl+O, Ctrl+N, Ctrl+Z, Ctrl+Y
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

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          handleSave(e.shiftKey);
        } else if (e.key.toLowerCase() === "o") {
          e.preventDefault();
          handleOpenClick();
        } else if (e.key.toLowerCase() === "n") {
          e.preventDefault();
          handleNewProject();
        } else if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleNewProject, undo, redo, isDirty]);

  const aspectRatios: { label: string; value: AspectRatio; desc: string }[] = [
    { label: "16:9", value: "16:9", desc: "YouTube / Desktop" },
    { label: "9:16", value: "9:16", desc: "TikTok / Shorts / Reels" },
    { label: "1:1", value: "1:1", desc: "Square (IG / Post)" },
    { label: "4:5", value: "4:5", desc: "Portrait Post" },
    { label: "21:9", value: "21:9", desc: "Cinematic Ultrawide" },
  ];

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest("button, input, select, a, .group")) return;
        handleToggleMaximize();
      }}
      className="h-13 bg-[var(--color-paper-1)] border-b border-[var(--color-rule)] px-4 flex items-center justify-between select-none z-30 font-body shadow-xs cursor-default"
    >
      {/* Hidden File Input for Loading Projects */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".filmov,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Brand, Project Actions & Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 group cursor-pointer shrink-0" title="Filmov Studio">
          <img
            src="/logo.png"
            alt="Filmov Logo"
            className="w-8 h-8 object-contain drop-shadow-xs group-hover:scale-105 transition-all duration-200 shrink-0"
          />
          <img
            src="/filmov-text.png"
            alt="Filmov Studio"
            className="h-7 w-auto object-contain group-hover:opacity-85 transition-opacity duration-200 shrink-0"
          />
        </div>

        <div className="h-4 w-px bg-[var(--color-rule)]" />

        {/* Project Quick Actions: New, Open, Save, Undo, Redo */}
        <div className="flex items-center gap-1 bg-[var(--color-paper-2)] p-0.5 rounded-lg border border-[var(--color-rule)]">
          <button
            onClick={handleNewProject}
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-white rounded-md hover:shadow-xs hover:scale-105 active:scale-95 transition-all"
            title="New Project (Ctrl+N)"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleOpenClick}
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-white rounded-md hover:shadow-xs hover:scale-105 active:scale-95 transition-all"
            title="Open Project (.filmov) (Ctrl+O)"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className={`p-1.5 rounded-md transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${
              isDirty
                ? "text-purple-600 bg-purple-50 font-bold shadow-xs"
                : "text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-white"
            }`}
            title="Save Project (Ctrl+S) / Save As (Ctrl+Shift+S)"
          >
            <Save className="w-3.5 h-3.5" />
          </button>

          <div className="h-3 w-px bg-[var(--color-rule)] mx-0.5" />

          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed rounded-md hover:scale-105 active:scale-95 transition-all"
            title="Undo Edit (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed rounded-md hover:scale-105 active:scale-95 transition-all"
            title="Redo Edit (Ctrl+Y / Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-[var(--color-rule)]" />

        {/* Project Title Input with Dirty status */}
        <div className="flex items-center gap-1.5">
          {isEditingTitle ? (
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
              autoFocus
              className="bg-white text-[var(--color-ink)] text-xs px-2.5 py-1 rounded-lg border-2 border-[#7c3aed] shadow-xs focus:outline-none w-44 font-semibold"
            />
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-1.5 text-xs text-[var(--color-ink)] hover:text-[#7c3aed] cursor-pointer px-2.5 py-1 rounded-lg hover:bg-[var(--color-paper-3)] transition-all font-semibold group"
              title="Klik untuk mengubah nama proyek"
            >
              <span className="truncate max-w-[160px]">{projectTitle}</span>
              {isDirty && (
                <span
                  className="w-2 h-2 rounded-full bg-[#7c3aed] animate-pulse shrink-0 ring-2 ring-purple-200"
                  title="Perubahan belum disimpan (Ctrl+S)"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center Controls: Aspect Ratio & Timeline Tools */}
      <div className="flex items-center gap-3">
        {/* Aspect Ratio Selector */}
        <div className="flex items-center bg-[var(--color-paper-2)] p-0.5 rounded-xl border border-[var(--color-rule)] shadow-xs">
          {aspectRatios.map((item) => {
            const active = project.aspectRatio === item.value;
            return (
              <button
                key={item.value}
                onClick={() => setAspectRatio(item.value)}
                title={`${item.label} (${item.desc})`}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition-all ${
                  active
                    ? "bg-[#7c3aed] text-white font-bold shadow-sm scale-[1.02]"
                    : "text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="h-4 w-px bg-[var(--color-rule)]" />

        {/* Snapping & Magnet */}
        <div className="flex items-center gap-0.5 bg-[var(--color-paper-2)] p-0.5 rounded-lg border border-[var(--color-rule)]">
          <button
            onClick={() => setSnapping(!snapping)}
            title={`Snapping: ${snapping ? "On" : "Off"} (S)`}
            className={`p-1.5 rounded-md transition-all hover:scale-105 active:scale-95 ${
              snapping
                ? "bg-purple-100 text-purple-700 font-bold"
                : "text-[var(--color-ink-faint)] hover:text-[#7c3aed] hover:bg-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMagnetMode(!magnetMode)}
            title={`Magnet Mode: ${magnetMode ? "On" : "Off"} (M)`}
            className={`p-1.5 rounded-md transition-all hover:scale-105 active:scale-95 ${
              magnetMode
                ? "bg-purple-100 text-purple-700 font-bold"
                : "text-[var(--color-ink-faint)] hover:text-[#7c3aed] hover:bg-white"
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Slider */}
        <div className="flex items-center gap-1.5 bg-[var(--color-paper-2)] px-2.5 py-1 rounded-lg border border-[var(--color-rule)]">
          <button
            onClick={() => setZoom(zoom - 10)}
            className="text-[var(--color-ink-faint)] hover:text-[#7c3aed] p-0.5 transition hover:scale-110"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={15}
            max={200}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#7c3aed]"
          />
          <button
            onClick={() => setZoom(zoom + 10)}
            className="text-[var(--color-ink-faint)] hover:text-[#7c3aed] p-0.5 transition hover:scale-110"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Controls: Hardware Acceleration & Export */}
      <div className="flex items-center gap-2.5">
        {/* Hardware Acceleration Badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-mono font-medium shadow-2xs"
          title={
            hardwareInfo
              ? `Acceleration Engine: ${hardwareInfo.accelerationType.toUpperCase()} (${hardwareInfo.gpuName || "GPU"})`
              : "Hardware Engine Active (NVENC / QuickSync / AMF)"
          }
        >
          <Zap className="w-3 h-3 text-emerald-600" />
          <span>
            {hardwareInfo?.accelerationType
              ? `${hardwareInfo.accelerationType.toUpperCase()} ACCEL`
              : "HW ENGINE"}
          </span>
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-white rounded-lg border border-transparent hover:border-[var(--color-rule)] hover:shadow-xs transition-all hover:rotate-45"
          title="Project & Hardware Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Clipchamp Vibrant Purple Export CTA Button */}
        <button
          onClick={onOpenExport}
          className="btn-purple flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Video</span>
        </button>

        {/* Custom Window Titlebar Controls (Frameless Tauri Window) */}
        <div className="h-5 w-px bg-slate-200 mx-0.5" />

        <div className="flex items-center gap-0.5" data-tauri-drag-region="false">
          <button
            onClick={handleMinimize}
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleToggleMaximize}
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <Copy className="w-3.5 h-3.5" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
