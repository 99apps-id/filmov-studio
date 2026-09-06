import React, { useState, useEffect } from "react";
import { useHardwareStore } from "@/store/useHardwareStore";
import { Cpu, Zap, CheckCircle2 } from "lucide-react";

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

const BOOT_STEPS = [
  { progress: 15, label: "Menginisialisasi Filmov Core Engine..." },
  { progress: 40, label: "Mendeteksi akselerasi GPU & hardware encoder..." },
  { progress: 65, label: "Menyiapkan multi-track timeline & video decoder..." },
  { progress: 88, label: "Memuat social downloader & voice synthesis..." },
  { progress: 100, label: "Filmov Studio siap digunakan!" },
];

export function SplashScreen({
  onFinish,
  minDurationMs = 2200,
}: SplashScreenProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(10);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const { hardwareInfo } = useHardwareStore();

  useEffect(() => {
    const startTime = Date.now();
    let stepTimer: ReturnType<typeof setTimeout> | undefined;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / minDurationMs) * 100));
      setProgress(pct);

      if (pct < 30) {
        setCurrentStepIndex(0);
      } else if (pct < 55) {
        setCurrentStepIndex(1);
      } else if (pct < 80) {
        setCurrentStepIndex(2);
      } else if (pct < 98) {
        setCurrentStepIndex(3);
      } else {
        setCurrentStepIndex(4);
      }

      if (elapsed >= minDurationMs) {
        clearInterval(interval);
        setProgress(100);
        setCurrentStepIndex(4);

        // Start smooth fade out
        stepTimer = setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setIsHidden(true);
            onFinish?.();
          }, 600);
        }, 400);
      }
    }, 50);

    return () => {
      clearInterval(interval);
      clearTimeout(stepTimer);
    };
  }, [minDurationMs, onFinish]);

  if (isHidden) return null;

  const currentStep = BOOT_STEPS[currentStepIndex];

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none transition-all duration-700 ${
        isFadingOut
          ? "opacity-0 scale-105 pointer-events-none"
          : "opacity-100 scale-100"
      }`}
      style={{
        background:
          "radial-gradient(circle at center, #ffffff 0%, #fbfbfe 60%, #f3f0ff 100%)",
      }}
    >
      {/* Ambient background glowing orbs */}
      <div className="absolute w-96 h-96 -top-20 -left-20 bg-purple-200/40 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-96 h-96 -bottom-20 -right-20 bg-blue-200/40 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Main Container */}
      <div className="relative flex flex-col items-center max-w-sm w-full px-6">
        {/* Logo with ambient backlight glow */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute -inset-6 rounded-full bg-gradient-to-tr from-blue-500/25 via-purple-500/25 to-pink-500/20 blur-2xl animate-pulse" />
          <img
            src="/splash-logo-transparent.png"
            alt="Filmov Studio"
            className="relative w-52 h-52 sm:w-60 sm:h-60 object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/80 shadow-inner mb-3">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-[#7c3aed] transition-all duration-150 ease-out rounded-full relative"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer light effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          </div>
        </div>

        {/* Status text & percentage */}
        <div className="w-full flex items-center justify-between text-xs text-slate-500 font-sans mb-6">
          <div className="flex items-center gap-1.5 truncate">
            {progress === 100 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-[#7c3aed] animate-ping shrink-0" />
            )}
            <span className="font-medium text-slate-700 truncate">
              {currentStep?.label}
            </span>
          </div>
          <span className="font-mono font-semibold text-slate-900 shrink-0 ml-2">
            {progress}%
          </span>
        </div>

        {/* Detected Hardware Badge */}
        {hardwareInfo && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-purple-200/70 shadow-xs backdrop-blur-xs text-[11px] text-slate-600 mb-6">
            <Cpu className="w-3.5 h-3.5 text-[#7c3aed]" />
            <span className="truncate max-w-[220px]">
              {hardwareInfo.gpuName || "GPU Accelerated"}
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-mono text-[9px] font-bold">
              {hardwareInfo.accelerationType?.toUpperCase() || "HW ACCEL"}
            </span>
          </div>
        )}

        {/* Bottom Footer Info */}
        <div className="text-center">
          <p className="text-[11px] text-slate-400 font-sans">
            Filmov Studio • Professional Video Editor & Downloader
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            Versi 1.0.0 (Build 2026.09) • Hardware Accelerated
          </p>
        </div>
      </div>
    </div>
  );
}
