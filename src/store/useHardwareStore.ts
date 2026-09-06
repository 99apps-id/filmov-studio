import { create } from "zustand";
import { HardwareInfo } from "@/types/editor";

interface ExportConfig {
  resolution: "1080p" | "4k" | "720p" | "custom";
  customWidth?: number;
  customHeight?: number;
  fps: 24 | 30 | 60;
  codec: "h264_nvenc" | "hevc_nvenc" | "h264_qsv" | "h264_amf" | "libx264";
  format: "mp4" | "mov" | "webm";
  bitrateKbps: number;
}

interface HardwareState {
  hardwareInfo: HardwareInfo | null;
  isDetecting: boolean;
  isExporting: boolean;
  exportProgress: number; // 0..100
  exportStatus: string;
  exportConfig: ExportConfig;

  setHardwareInfo: (info: HardwareInfo) => void;
  setIsDetecting: (isDetecting: boolean) => void;
  setIsExporting: (isExporting: boolean) => void;
  setExportProgress: (progress: number, status?: string) => void;
  setExportConfig: (config: Partial<ExportConfig>) => void;
}

export const useHardwareStore = create<HardwareState>((set) => ({
  hardwareInfo: null,
  isDetecting: false,
  isExporting: false,
  exportProgress: 0,
  exportStatus: "Idle",
  exportConfig: {
    resolution: "1080p",
    fps: 30,
    codec: "libx264",
    format: "mp4",
    bitrateKbps: 12000,
  },

  setHardwareInfo: (hardwareInfo) =>
    set((state) => ({
      hardwareInfo,
      exportConfig: {
        ...state.exportConfig,
        codec:
          (hardwareInfo.encodersAvailable[0] as ExportConfig["codec"]) ||
          "libx264",
      },
    })),
  setIsDetecting: (isDetecting) => set({ isDetecting }),
  setIsExporting: (isExporting) => set({ isExporting }),
  setExportProgress: (exportProgress, status) =>
    set((state) => ({
      exportProgress,
      exportStatus: status || state.exportStatus,
    })),
  setExportConfig: (config) =>
    set((state) => ({
      exportConfig: { ...state.exportConfig, ...config },
    })),
}));
