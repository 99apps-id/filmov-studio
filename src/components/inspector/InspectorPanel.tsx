import React, { useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import {
  MaskType,
  SpeedCurvePreset,
  TransitionType,
  TextAnimationType,
  RichTextProperties,
} from "@/types/editor";
import {
  Sliders,
  Type,
  RotateCcw,
  Trash2,
  Diamond,
  Scissors,
  Layers,
  Sparkles,
  Copy,
  Minimize2,
  Wand2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoveHorizontal,
  Palette,
} from "lucide-react";

export const InspectorPanel: React.FC = () => {
  const {
    clips,
    selectedClipId,
    updateClip,
    deleteClip,
    duplicateClip,
    rippleDeleteClip,
    splitClipAtCurrentTime,
    setClipTransition,
    updateAudioFade,
    currentTime,
  } = useEditorStore();
  const selectedClip = clips.find((c) => c.id === selectedClipId);

  const [activeTab, setActiveTab] = useState<string>("transform");

  if (!selectedClip) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--color-paper-1)] text-[var(--color-ink-faint)] p-6 text-center select-none font-body">
        <Sliders className="w-8 h-8 mb-2 opacity-30 text-[var(--color-accent)]" />
        <span className="text-xs font-semibold text-[var(--color-ink-muted)]">
          No Clip Selected
        </span>
        <p className="text-[11px] text-[var(--color-ink-faint)] mt-1 max-w-[180px]">
          Click any video, audio, or caption clip in the timeline to inspect parameters.
        </p>
      </div>
    );
  }

  const isSubtitle = selectedClip.type === "subtitle";
  const isText = selectedClip.type === "text";
  const isTextOrSubtitle = isSubtitle || isText;
  const isAudio = selectedClip.type === "audio";
  const isVideo = selectedClip.type === "video" || selectedClip.type === "image";
  const clipRelTime = Math.max(0, currentTime - selectedClip.startOffset);

  // Keyframe toggle helper
  const toggleKeyframe = (channel: "scale" | "positionX" | "positionY" | "opacity", value: number) => {
    const existingKeyframes = selectedClip.keyframes?.[channel] || [];
    const index = existingKeyframes.findIndex(
      (k) => Math.abs(k.timeOffset - clipRelTime) < 0.1,
    );

    let updated: any[];
    if (index >= 0) {
      // Remove keyframe
      updated = existingKeyframes.filter((_, i) => i !== index);
    } else {
      // Add keyframe
      updated = [
        ...existingKeyframes,
        {
          id: `kf-${Date.now()}`,
          timeOffset: parseFloat(clipRelTime.toFixed(2)),
          value,
          easing: "easeInOut",
        },
      ];
    }

    updateClip(selectedClip.id, {
      keyframes: {
        ...selectedClip.keyframes,
        [channel]: updated,
      },
    });
  };

  const hasKeyframeAtTime = (channel: "scale" | "positionX" | "positionY" | "opacity") => {
    return selectedClip.keyframes?.[channel]?.some(
      (k) => Math.abs(k.timeOffset - clipRelTime) < 0.15,
    );
  };

  // Mask presets
  const maskOptions: { id: MaskType; name: string }[] = [
    { id: "none", name: "None" },
    { id: "ellipse", name: "Circle / Ellipse" },
    { id: "rectangle", name: "Rectangle" },
    { id: "split", name: "Split Screen" },
    { id: "cinematic", name: "Cinematic Bars" },
    { id: "star", name: "Star" },
  ];

  // Speed curve presets
  const speedCurves: { id: SpeedCurvePreset; label: string; desc: string }[] = [
    { id: "constant", label: "Constant", desc: "Flat constant speed" },
    { id: "montage", label: "Montage", desc: "Fast-Slow-Fast cinematic" },
    { id: "hero", label: "Hero Beat", desc: "Punchy rhythm drop" },
    { id: "bullet-time", label: "Bullet Time", desc: "Ultra slow-mo peak" },
    { id: "flash-in", label: "Flash In", desc: "High velocity entrance" },
  ];

  // Video Transition presets
  const transitionOptions: { id: TransitionType; name: string; icon: string; desc: string }[] = [
    { id: "none", name: "None", icon: "⊘", desc: "Direct hard cut" },
    { id: "dissolve", name: "Dissolve", icon: "▦", desc: "Cross dissolve blend" },
    { id: "fade", name: "Fade Black", icon: "◐", desc: "Fade through black" },
    { id: "wipeleft", name: "Wipe Left", icon: "◀", desc: "Linear wipe left" },
    { id: "wiperight", name: "Wipe Right", icon: "▶", desc: "Linear wipe right" },
    { id: "slideup", name: "Slide Up", icon: "▲", desc: "Slide from bottom" },
    { id: "slidedown", name: "Slide Down", icon: "▼", desc: "Slide from top" },
    { id: "circlecrop", name: "Circle Iris", icon: "◎", desc: "Circular reveal" },
    { id: "zoom", name: "Zoom In", icon: "⊕", desc: "Scale punch entrance" },
  ];

  // Font options
  const fontOptions = [
    "Space Grotesk",
    "Inter",
    "Roboto",
    "Montserrat",
    "Playfair Display",
    "Cinzel",
    "Impact",
  ];

  // Text Animation options
  const animationOptions: { id: TextAnimationType; label: string; desc: string }[] = [
    { id: "none", label: "None", desc: "Static text" },
    { id: "fade", label: "Fade In", desc: "Smooth opacity entrance" },
    { id: "typewriter", label: "Typewriter", desc: "Sequential letter typing" },
    { id: "bounce", label: "Bounce", desc: "Playful downward spring bounce" },
    { id: "pop", label: "Pop", desc: "Snappy elastic scale punch" },
    { id: "slideUp", label: "Slide Up", desc: "Upward slide with soft fade" },
  ];

  const currentTextStyle: RichTextProperties = {
    fontFamily: selectedClip.textStyle?.fontFamily || "Space Grotesk",
    fontSize: selectedClip.textStyle?.fontSize || 36,
    fontWeight: selectedClip.textStyle?.fontWeight || "bold",
    color: selectedClip.textStyle?.color || "#ffffff",
    textAlign: selectedClip.textStyle?.textAlign || "center",
    strokeColor: selectedClip.textStyle?.strokeColor || "#000000",
    strokeWidth: selectedClip.textStyle?.strokeWidth !== undefined ? selectedClip.textStyle.strokeWidth : 2,
    shadowColor: selectedClip.textStyle?.shadowColor || "rgba(0,0,0,0.8)",
    shadowBlur: selectedClip.textStyle?.shadowBlur !== undefined ? selectedClip.textStyle.shadowBlur : 8,
    shadowOffsetX: selectedClip.textStyle?.shadowOffsetX !== undefined ? selectedClip.textStyle.shadowOffsetX : 2,
    shadowOffsetY: selectedClip.textStyle?.shadowOffsetY !== undefined ? selectedClip.textStyle.shadowOffsetY : 2,
    backgroundColor: selectedClip.textStyle?.backgroundColor || "rgba(0,0,0,0.4)",
    backgroundPadding: selectedClip.textStyle?.backgroundPadding !== undefined ? selectedClip.textStyle.backgroundPadding : 8,
    borderRadius: selectedClip.textStyle?.borderRadius !== undefined ? selectedClip.textStyle.borderRadius : 6,
    animation: selectedClip.textStyle?.animation || "none",
  };

  const updateTextStyle = (patch: Partial<RichTextProperties>) => {
    updateClip(selectedClip.id, {
      textStyle: {
        ...currentTextStyle,
        ...patch,
      },
    });
  };

  // Effective tab calculation based on clip type
  let effectiveTab = activeTab;
  if (isTextOrSubtitle && !["typography", "transform", "motion"].includes(effectiveTab)) {
    effectiveTab = "typography";
  } else if (isAudio && !["audio", "speed"].includes(effectiveTab)) {
    effectiveTab = "audio";
  } else if (isVideo && !["transform", "mask", "color", "transitions", "audio", "speed"].includes(effectiveTab)) {
    effectiveTab = "transform";
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-paper-1)] text-[var(--color-ink)] border-l border-[var(--color-rule)] select-none overflow-y-auto font-body">
      {/* Header */}
      <div className="p-3 border-b border-[var(--color-rule)] flex items-center justify-between bg-[var(--color-paper-2)]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded bg-[var(--color-paper-3)] text-[var(--color-accent)] border border-[var(--color-rule)]">
              {selectedClip.type}
            </span>
            <span className="text-xs font-semibold text-[var(--color-ink)] truncate">
              {selectedClip.name}
            </span>
          </div>
          <span className="text-[10px] text-[var(--color-ink-muted)] font-mono">
            Duration: {selectedClip.duration.toFixed(2)}s
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => splitClipAtCurrentTime(selectedClip.id)}
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-paper-3)] rounded transition"
            title="Split Clip at Playhead (Ctrl+B)"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => duplicateClip(selectedClip.id)}
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-paper-3)] rounded transition"
            title="Duplicate Clip (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => rippleDeleteClip(selectedClip.id)}
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-paper-3)] rounded transition"
            title="Ripple Delete - Close gap (Shift+Del)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => deleteClip(selectedClip.id)}
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-paper-3)] rounded transition"
            title="Delete Clip (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Property Tabs */}
      <div className="flex bg-[var(--color-paper-2)] p-1 border-b border-[var(--color-rule)] overflow-x-auto gap-0.5">
        {isTextOrSubtitle ? (
          <>
            <button
              onClick={() => setActiveTab("typography")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition shrink-0 ${
                effectiveTab === "typography"
                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Typography
            </button>
            <button
              onClick={() => setActiveTab("transform")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition shrink-0 ${
                effectiveTab === "transform"
                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Transform
            </button>
            <button
              onClick={() => setActiveTab("motion")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition shrink-0 ${
                effectiveTab === "motion"
                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Motion
            </button>
          </>
        ) : isVideo ? (
          <>
            <button
              onClick={() => setActiveTab("transform")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition shrink-0 ${
                effectiveTab === "transform"
                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Transform
            </button>
            <button
              onClick={() => setActiveTab("mask")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition shrink-0 ${
                effectiveTab === "mask"
                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Mask
            </button>
            <button
              onClick={() => setActiveTab("color")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition shrink-0 ${
                effectiveTab === "color"
                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Color
            </button>
            <button
              onClick={() => setActiveTab("transitions")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition shrink-0 ${
                effectiveTab === "transitions"
                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Transitions
            </button>
            <button
              onClick={() => setActiveTab("audio")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition shrink-0 ${
                effectiveTab === "audio"
                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Audio
            </button>
            <button
              onClick={() => setActiveTab("speed")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition shrink-0 ${
                effectiveTab === "speed"
                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Speed
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab("audio")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition shrink-0 ${
                effectiveTab === "audio"
                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Audio
            </button>
            <button
              onClick={() => setActiveTab("speed")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition shrink-0 ${
                effectiveTab === "speed"
                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              Speed
            </button>
          </>
        )}
      </div>

      {/* TAB CONTENT: TRANSFORM WITH KEYFRAMING (⬥) */}
      {effectiveTab === "transform" && !isAudio && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-ink)] font-display">
              Geometric Transform
            </span>
            <span className="text-[10px] text-[var(--color-accent)] flex items-center gap-1 font-mono">
              <Diamond className="w-2.5 h-2.5 fill-[var(--color-accent)]" />
              Keyframe Ready
            </span>
          </div>

          {/* Scale with Keyframe Toggle */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleKeyframe("scale", selectedClip.transform.scale)}
                  title="Toggle Scale Keyframe (⬥)"
                  className={`p-0.5 rounded transition ${
                    hasKeyframeAtTime("scale")
                      ? "text-cyan-400"
                      : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  <Diamond
                    className={`w-3.5 h-3.5 ${
                      hasKeyframeAtTime("scale") ? "fill-cyan-400" : ""
                    }`}
                  />
                </button>
                <label className="text-[11px] text-slate-300">Scale</label>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">
                {Math.round(selectedClip.transform.scale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.05"
              value={selectedClip.transform.scale}
              onChange={(e) =>
                updateClip(selectedClip.id, {
                  transform: {
                    ...selectedClip.transform,
                    scale: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Position X / Y with Keyframe Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleKeyframe("positionX", selectedClip.transform.x)}
                    className={`p-0.5 rounded ${
                      hasKeyframeAtTime("positionX")
                        ? "text-cyan-400"
                        : "text-slate-600 hover:text-slate-400"
                    }`}
                  >
                    <Diamond
                      className={`w-3 h-3 ${
                        hasKeyframeAtTime("positionX") ? "fill-cyan-400" : ""
                      }`}
                    />
                  </button>
                  <label className="text-[10px] text-slate-400">Position X</label>
                </div>
              </div>
              <input
                type="number"
                value={selectedClip.transform.x}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    transform: {
                      ...selectedClip.transform,
                      x: Number(e.target.value),
                    },
                  })
                }
                className="w-full bg-[#181b24] border border-[#293040] text-xs text-white p-1.5 rounded focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleKeyframe("positionY", selectedClip.transform.y)}
                    className={`p-0.5 rounded ${
                      hasKeyframeAtTime("positionY")
                        ? "text-cyan-400"
                        : "text-slate-600 hover:text-slate-400"
                    }`}
                  >
                    <Diamond
                      className={`w-3 h-3 ${
                        hasKeyframeAtTime("positionY") ? "fill-cyan-400" : ""
                      }`}
                    />
                  </button>
                  <label className="text-[10px] text-slate-400">Position Y</label>
                </div>
              </div>
              <input
                type="number"
                value={selectedClip.transform.y}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    transform: {
                      ...selectedClip.transform,
                      y: Number(e.target.value),
                    },
                  })
                }
                className="w-full bg-[#181b24] border border-[#293040] text-xs text-white p-1.5 rounded focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>

          {/* Rotation */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-300">Rotation</label>
              <span className="text-[11px] font-mono text-cyan-400">
                {selectedClip.transform.rotation}°
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={selectedClip.transform.rotation}
              onChange={(e) =>
                updateClip(selectedClip.id, {
                  transform: {
                    ...selectedClip.transform,
                    rotation: Number(e.target.value),
                  },
                })
              }
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Opacity with Keyframe Toggle */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleKeyframe("opacity", selectedClip.transform.opacity)}
                  className={`p-0.5 rounded ${
                    hasKeyframeAtTime("opacity")
                      ? "text-cyan-400"
                      : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  <Diamond
                    className={`w-3.5 h-3.5 ${
                      hasKeyframeAtTime("opacity") ? "fill-cyan-400" : ""
                    }`}
                  />
                </button>
                <label className="text-[11px] text-slate-300">Opacity</label>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">
                {Math.round(selectedClip.transform.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={selectedClip.transform.opacity}
              onChange={(e) =>
                updateClip(selectedClip.id, {
                  transform: {
                    ...selectedClip.transform,
                    opacity: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full accent-cyan-400"
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT: MASKING (ADAPTED FROM OPENCUT) */}
      {effectiveTab === "mask" && isVideo && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Video Masking</span>
            <span className="text-[10px] text-slate-500">CapCut / OpenCut Style</span>
          </div>

          {/* Mask Shape Selector */}
          <div className="grid grid-cols-2 gap-2">
            {maskOptions.map((opt) => {
              const isActive = (selectedClip.mask?.type || "none") === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() =>
                    updateClip(selectedClip.id, {
                      mask: {
                        type: opt.id,
                        x: selectedClip.mask?.x || 0,
                        y: selectedClip.mask?.y || 0,
                        width: selectedClip.mask?.width || 70,
                        height: selectedClip.mask?.height || 70,
                        rotation: selectedClip.mask?.rotation || 0,
                        feather: selectedClip.mask?.feather || 0,
                        inverted: selectedClip.mask?.inverted || false,
                      },
                    })
                  }
                  className={`p-2 rounded-lg border text-xs font-semibold text-left transition ${
                    isActive
                      ? "border-cyan-500 bg-cyan-500/15 text-cyan-300 font-bold"
                      : "border-[#2b3345] text-slate-400 hover:text-white hover:bg-[#1f2433]"
                  }`}
                >
                  {opt.name}
                </button>
              );
            })}
          </div>

          {selectedClip.mask && selectedClip.mask.type !== "none" && (
            <div className="space-y-3 pt-2 border-t border-[#232938]">
              {/* Mask Size */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-slate-400">Mask Width</label>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {selectedClip.mask.width}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={selectedClip.mask.width}
                  onChange={(e) =>
                    updateClip(selectedClip.id, {
                      mask: {
                        ...selectedClip.mask!,
                        width: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-slate-400">Mask Height</label>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {selectedClip.mask.height}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={selectedClip.mask.height}
                  onChange={(e) =>
                    updateClip(selectedClip.id, {
                      mask: {
                        ...selectedClip.mask!,
                        height: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Feather (Edge blur) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-slate-400">Feather Softness</label>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {selectedClip.mask.feather}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={selectedClip.mask.feather}
                  onChange={(e) =>
                    updateClip(selectedClip.id, {
                      mask: {
                        ...selectedClip.mask!,
                        feather: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Invert mask toggle */}
              <div className="flex items-center justify-between p-2 bg-[#181b24] rounded-lg border border-[#272e3f]">
                <span className="text-xs text-white">Invert Mask</span>
                <input
                  type="checkbox"
                  checked={selectedClip.mask.inverted}
                  onChange={(e) =>
                    updateClip(selectedClip.id, {
                      mask: {
                        ...selectedClip.mask!,
                        inverted: e.target.checked,
                      },
                    })
                  }
                  className="accent-cyan-500 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: COLOR */}
      {effectiveTab === "color" && isVideo && (
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-white">Color Grading</span>
            <button
              onClick={() =>
                updateClip(selectedClip.id, {
                  color: {
                    brightness: 0,
                    contrast: 0,
                    saturation: 0,
                    temperature: 0,
                    tint: 0,
                    exposure: 0,
                  },
                })
              }
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Brightness</label>
              <span className="text-[11px] font-mono text-cyan-400">
                {selectedClip.color.brightness}
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={selectedClip.color.brightness}
              onChange={(e) =>
                updateClip(selectedClip.id, {
                  color: {
                    ...selectedClip.color,
                    brightness: Number(e.target.value),
                  },
                })
              }
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Contrast</label>
              <span className="text-[11px] font-mono text-cyan-400">
                {selectedClip.color.contrast}
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={selectedClip.color.contrast}
              onChange={(e) =>
                updateClip(selectedClip.id, {
                  color: {
                    ...selectedClip.color,
                    contrast: Number(e.target.value),
                  },
                })
              }
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Saturation</label>
              <span className="text-[11px] font-mono text-cyan-400">
                {selectedClip.color.saturation}
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={selectedClip.color.saturation}
              onChange={(e) =>
                updateClip(selectedClip.id, {
                  color: {
                    ...selectedClip.color,
                    saturation: Number(e.target.value),
                  },
                })
              }
              className="w-full accent-cyan-400"
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT: AUDIO */}
      {effectiveTab === "audio" && (
        <div className="p-4 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Clip Volume</label>
              <span className="text-[11px] font-mono text-cyan-400">
                {Math.round(selectedClip.audio.volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={selectedClip.audio.volume}
              onChange={(e) =>
                updateClip(selectedClip.id, {
                  audio: {
                    ...selectedClip.audio,
                    volume: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Audio Fade In & Fade Out Sliders */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-rule)]">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] text-slate-400">Fade In</label>
                <span className="text-[11px] font-mono text-[var(--color-accent)] font-semibold">
                  {(selectedClip.audio?.fadeIn || 0).toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.min(5, selectedClip.duration / 2).toFixed(1)}
                step="0.1"
                value={selectedClip.audio?.fadeIn || 0}
                onChange={(e) =>
                  updateAudioFade(selectedClip.id, parseFloat(e.target.value), undefined)
                }
                className="w-full accent-[var(--color-accent)]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] text-slate-400">Fade Out</label>
                <span className="text-[11px] font-mono text-[var(--color-accent)] font-semibold">
                  {(selectedClip.audio?.fadeOut || 0).toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.min(5, selectedClip.duration / 2).toFixed(1)}
                step="0.1"
                value={selectedClip.audio?.fadeOut || 0}
                onChange={(e) =>
                  updateAudioFade(selectedClip.id, undefined, parseFloat(e.target.value))
                }
                className="w-full accent-[var(--color-accent)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-[#181b24] rounded-lg border border-[#272e3f]">
            <div>
              <span className="text-xs font-semibold text-white block">
                Noise Reduction
              </span>
              <span className="text-[10px] text-slate-400">
                Auto filter hiss and rumble
              </span>
            </div>
            <input
              type="checkbox"
              checked={selectedClip.audio.noiseReduction}
              onChange={(e) =>
                updateClip(selectedClip.id, {
                  audio: {
                    ...selectedClip.audio,
                    noiseReduction: e.target.checked,
                  },
                })
              }
              className="accent-cyan-500 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT: SPEED & SPEED CURVES */}
      {effectiveTab === "speed" && (
        <div className="p-4 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Playback Rate</label>
              <span className="text-[11px] font-mono text-cyan-400">
                {selectedClip.speed}x
              </span>
            </div>
            <input
              type="range"
              min="0.25"
              max="4.0"
              step="0.25"
              value={selectedClip.speed}
              onChange={(e) =>
                updateClip(selectedClip.id, {
                  speed: parseFloat(e.target.value),
                })
              }
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Speed Ramping Curves (Adapted from OpenCut) */}
          <div className="pt-2 border-t border-[#232938]">
            <span className="text-xs font-bold text-white block mb-2">
              CapCut Speed Ramping Curves
            </span>
            <div className="space-y-1.5">
              {speedCurves.map((curve) => {
                const isActive = (selectedClip.speedCurve || "constant") === curve.id;
                return (
                  <button
                    key={curve.id}
                    onClick={() =>
                      updateClip(selectedClip.id, { speedCurve: curve.id })
                    }
                    className={`w-full p-2 rounded-lg border text-left flex items-center justify-between transition ${
                      isActive
                        ? "border-cyan-500 bg-cyan-500/15 text-white font-bold"
                        : "border-[#282f40] text-slate-400 hover:text-white hover:bg-[#1f2433]"
                    }`}
                  >
                    <div>
                      <span className="text-xs block text-white font-semibold">
                        {curve.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {curve.desc}
                      </span>
                    </div>
                    {isActive && (
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: TRANSITIONS (Tahap 2) */}
      {effectiveTab === "transitions" && isVideo && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Video In-Transition</span>
            <span className="text-[10px] text-[var(--color-accent)] font-mono uppercase">
              {selectedClip.transition?.type || "none"}
            </span>
          </div>

          {/* Duration Slider */}
          <div className="bg-[var(--color-paper-2)] p-3 rounded-lg border border-[var(--color-rule)]">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Transition Duration</label>
              <span className="text-[11px] font-mono text-[var(--color-accent)] font-bold">
                {(selectedClip.transition?.duration || 1.0).toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max={Math.min(3.0, selectedClip.duration).toFixed(1)}
              step="0.1"
              value={selectedClip.transition?.duration || 1.0}
              onChange={(e) => {
                const duration = parseFloat(e.target.value);
                const type = selectedClip.transition?.type || "dissolve";
                setClipTransition(selectedClip.id, { type, duration });
              }}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>

          {/* Transitions Grid */}
          <div className="grid grid-cols-3 gap-2">
            {transitionOptions.map((opt) => {
              const isActive = (selectedClip.transition?.type || "none") === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setClipTransition(selectedClip.id, {
                      type: opt.id,
                      duration: selectedClip.transition?.duration || 1.0,
                    });
                  }}
                  className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition text-center ${
                    isActive
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-ink)] font-bold shadow-sm"
                      : "border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]"
                  }`}
                >
                  <span className="text-base">{opt.icon}</span>
                  <span className="text-[10px] font-medium leading-tight">{opt.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: TYPOGRAPHY & STYLING (Tahap 3) */}
      {effectiveTab === "typography" && isTextOrSubtitle && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Title & Text Styling</span>
            <span className="text-[10px] text-[var(--color-accent)] font-mono">
              Rich Typography
            </span>
          </div>

          {/* Text Content */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Text Content</label>
            <textarea
              rows={2}
              value={selectedClip.subtitleText || selectedClip.name || ""}
              onChange={(e) =>
                updateClip(selectedClip.id, {
                  subtitleText: e.target.value,
                  name: e.target.value.slice(0, 24) || "Text Clip",
                })
              }
              className="w-full bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-xs text-[var(--color-ink)] p-2 rounded-lg focus:outline-none focus:border-[var(--color-accent)] resize-none font-medium"
              placeholder="Enter title or caption..."
            />
          </div>

          {/* Font Family & Weight */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Font Family</label>
              <select
                value={currentTextStyle.fontFamily}
                onChange={(e) => updateTextStyle({ fontFamily: e.target.value })}
                className="w-full bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-xs text-[var(--color-ink)] p-1.5 rounded-lg focus:outline-none"
              >
                {fontOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Font Weight</label>
              <select
                value={currentTextStyle.fontWeight}
                onChange={(e) =>
                  updateTextStyle({
                    fontWeight: e.target.value as any,
                  })
                }
                className="w-full bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-xs text-[var(--color-ink)] p-1.5 rounded-lg focus:outline-none"
              >
                <option value="normal">Normal (400)</option>
                <option value="medium">Medium (500)</option>
                <option value="bold">Bold (700)</option>
                <option value="black">Black (900)</option>
              </select>
            </div>
          </div>

          {/* Font Size */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Font Size</label>
              <span className="text-[11px] font-mono text-[var(--color-accent)] font-semibold">
                {currentTextStyle.fontSize}px
              </span>
            </div>
            <input
              type="range"
              min="14"
              max="120"
              value={currentTextStyle.fontSize}
              onChange={(e) => updateTextStyle({ fontSize: parseInt(e.target.value) })}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>

          {/* Text Color & Alignment Row */}
          <div className="grid grid-cols-2 gap-2 items-center">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentTextStyle.color}
                  onChange={(e) => updateTextStyle({ color: e.target.value })}
                  className="w-7 h-7 rounded border border-[var(--color-rule)] cursor-pointer bg-transparent"
                />
                <span className="text-[11px] font-mono text-[var(--color-ink-muted)] uppercase">
                  {currentTextStyle.color}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Align</label>
              <div className="flex rounded-lg border border-[var(--color-rule)] overflow-hidden">
                <button
                  onClick={() => updateTextStyle({ textAlign: "left" })}
                  className={`flex-1 py-1 flex items-center justify-center ${
                    currentTextStyle.textAlign === "left"
                      ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-bold"
                      : "text-[var(--color-ink-muted)] hover:bg-[var(--color-paper-3)]"
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => updateTextStyle({ textAlign: "center" })}
                  className={`flex-1 py-1 flex items-center justify-center border-x border-[var(--color-rule)] ${
                    currentTextStyle.textAlign === "center"
                      ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-bold"
                      : "text-[var(--color-ink-muted)] hover:bg-[var(--color-paper-3)]"
                  }`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => updateTextStyle({ textAlign: "right" })}
                  className={`flex-1 py-1 flex items-center justify-center ${
                    currentTextStyle.textAlign === "right"
                      ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-bold"
                      : "text-[var(--color-ink-muted)] hover:bg-[var(--color-paper-3)]"
                  }`}
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Stroke Outline */}
          <div className="pt-2 border-t border-[var(--color-rule)]">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Text Stroke / Outline</label>
              <span className="text-[11px] font-mono text-[var(--color-accent)]">
                {currentTextStyle.strokeWidth || 0}px
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentTextStyle.strokeColor || "#000000"}
                onChange={(e) => updateTextStyle({ strokeColor: e.target.value })}
                className="w-7 h-7 rounded border border-[var(--color-rule)] cursor-pointer bg-transparent shrink-0"
              />
              <input
                type="range"
                min="0"
                max="8"
                step="0.5"
                value={currentTextStyle.strokeWidth || 0}
                onChange={(e) => updateTextStyle({ strokeWidth: parseFloat(e.target.value) })}
                className="w-full accent-[var(--color-accent)]"
              />
            </div>
          </div>

          {/* Shadow */}
          <div className="pt-2 border-t border-[var(--color-rule)]">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Drop Shadow Glow</label>
              <span className="text-[11px] font-mono text-[var(--color-accent)]">
                {currentTextStyle.shadowBlur || 0}px blur
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              onChange={(e) => updateTextStyle({ shadowBlur: parseInt(e.target.value) })}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>

          {/* Background Box Banner */}
          <div className="pt-2 border-t border-[var(--color-rule)]">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-slate-400">Background Box Banner</label>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={
                  currentTextStyle.backgroundColor && currentTextStyle.backgroundColor.startsWith("#")
                    ? currentTextStyle.backgroundColor
                    : "#000000"
                }
                onChange={(e) => updateTextStyle({ backgroundColor: e.target.value })}
                className="w-7 h-7 rounded border border-[var(--color-rule)] cursor-pointer bg-transparent shrink-0"
              />
              <button
                type="button"
                onClick={() => updateTextStyle({ backgroundColor: "transparent" })}
                className="px-2 py-1 text-[10px] rounded border border-[var(--color-rule)] hover:bg-[var(--color-paper-3)] text-[var(--color-ink-muted)]"
              >
                Clear Box
              </button>
              <button
                type="button"
                onClick={() => updateTextStyle({ backgroundColor: "rgba(0,0,0,0.6)" })}
                className="px-2 py-1 text-[10px] rounded border border-[var(--color-rule)] hover:bg-[var(--color-paper-3)] text-[var(--color-ink-muted)]"
              >
                Semi-Dark
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Padding</span>
                  <span>{currentTextStyle.backgroundPadding || 0}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={currentTextStyle.backgroundPadding || 0}
                  onChange={(e) => updateTextStyle({ backgroundPadding: parseInt(e.target.value) })}
                  className="w-full accent-[var(--color-accent)]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                  <span>Radius</span>
                  <span>{currentTextStyle.borderRadius || 0}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="24"
                  value={currentTextStyle.borderRadius || 0}
                  onChange={(e) => updateTextStyle({ borderRadius: parseInt(e.target.value) })}
                  className="w-full accent-[var(--color-accent)]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: MOTION & ANIMATION (Tahap 3) */}
      {effectiveTab === "motion" && isTextOrSubtitle && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Title Animation Motion</span>
            <span className="text-[10px] text-[var(--color-accent)] font-mono uppercase">
              {currentTextStyle.animation || "none"}
            </span>
          </div>

          <div className="space-y-2">
            {animationOptions.map((anim) => {
              const isActive = (currentTextStyle.animation || "none") === anim.id;
              return (
                <button
                  key={anim.id}
                  onClick={() => updateTextStyle({ animation: anim.id })}
                  className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition ${
                    isActive
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-ink)] font-bold shadow-sm"
                      : "border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]"
                  }`}
                >
                  <div>
                    <span className="text-xs block text-[var(--color-ink)] font-semibold">
                      {anim.label}
                    </span>
                    <span className="text-[10px] text-[var(--color-ink-muted)]">
                      {anim.desc}
                    </span>
                  </div>
                  {isActive && (
                    <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
