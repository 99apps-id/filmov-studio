export type MediaType = "video" | "audio" | "image";
export type TrackType = "video" | "audio" | "subtitle" | "text";

export type TransitionType =
  | "none"
  | "fade"
  | "dissolve"
  | "wipeleft"
  | "wiperight"
  | "slideup"
  | "slidedown"
  | "circlecrop"
  | "zoom";

export interface ClipTransition {
  type: TransitionType;
  duration: number; // in seconds (e.g. 0.5 - 2.0s)
}

export type TextAnimationType =
  | "none"
  | "fade"
  | "typewriter"
  | "bounce"
  | "pop"
  | "slideUp";

export interface RichTextProperties {
  text?: string;
  fontFamily: string;
  fontSize: number; // in px
  fontWeight: "normal" | "bold" | "600" | "800";
  color: string;
  textAlign: "left" | "center" | "right";
  // Stroke / Outline
  strokeColor?: string;
  strokeWidth?: number;
  // Shadow
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  // Background box
  backgroundColor?: string;
  backgroundPadding?: number;
  borderRadius?: number;
  // Animation
  animation?: TextAnimationType;
}

export interface MediaItem {
  id: string;
  name: string;
  path: string;
  url: string;
  type: MediaType;
  duration: number; // in seconds
  width?: number;
  height?: number;
  fps?: number;
  thumbnailUrl?: string;
  waveformPeaks?: number[]; // normalized 0..1 peaks for audio
  sizeBytes?: number;
}

export interface TransformProperties {
  x: number; // offset px from center
  y: number; // offset px from center
  scale: number; // 1.0 = 100%
  rotation: number; // degrees 0..360
  opacity: number; // 0..1
}

export type MaskType =
  | "none"
  | "split"
  | "ellipse"
  | "rectangle"
  | "cinematic"
  | "heart"
  | "star";

export interface ClipMask {
  type: MaskType;
  x: number; // offset % from center (-50 .. 50)
  y: number; // offset % from center (-50 .. 50)
  width: number; // size % (10 .. 100)
  height: number; // size % (10 .. 100)
  rotation: number; // 0 .. 360 deg
  feather: number; // 0 .. 50 px blur
  inverted: boolean;
}

export interface Keyframe<T = number> {
  id: string;
  timeOffset: number; // seconds from clip start
  value: T;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
}

export interface ClipKeyframes {
  scale?: Keyframe<number>[];
  positionX?: Keyframe<number>[];
  positionY?: Keyframe<number>[];
  rotation?: Keyframe<number>[];
  opacity?: Keyframe<number>[];
  volume?: Keyframe<number>[];
}

export type SpeedCurvePreset =
  | "constant"
  | "montage"
  | "hero"
  | "bullet-time"
  | "jump-cut"
  | "flash-in";

export interface ColorGrading {
  brightness: number; // -100 .. 100
  contrast: number; // -100 .. 100
  saturation: number; // -100 .. 100
  temperature: number; // -100 .. 100
  tint: number; // -100 .. 100
  exposure: number; // -100 .. 100
}

export interface AudioProperties {
  volume: number; // 0 .. 2.0 (1.0 = 100%)
  pan: number; // -1.0 (left) .. 1.0 (right)
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  noiseReduction: boolean;
  voiceIsolation: boolean;
  pitch: number; // -12 .. +12 semitones
}

export interface Clip {
  id: string;
  mediaId: string;
  trackId: string;
  name: string;
  type: MediaType | "subtitle" | "text";
  startOffset: number; // Timeline position in seconds
  duration: number; // Visible duration on timeline in seconds
  inPoint: number; // Media source in-point in seconds
  outPoint: number; // Media source out-point in seconds
  speed: number; // 0.25 .. 4.0
  speedCurve?: SpeedCurvePreset;
  transform: TransformProperties;
  color: ColorGrading;
  audio: AudioProperties;
  mask?: ClipMask;
  keyframes?: ClipKeyframes;
  transition?: ClipTransition;
  subtitleText?: string;
  textStyle?: RichTextProperties;
  isMuted?: boolean;
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  height: number;
  isMuted: boolean;
  isLocked: boolean;
  isHidden: boolean;
  volume: number;
}

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5" | "21:9";

export interface ProjectSettings {
  name: string;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  fps: number;
  sampleRate: number;
}

export interface SocialMediaFormat {
  formatId: string;
  resolution: string;
  qualityLabel: string;
  ext: string;
  filesizeApprox?: string;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface SocialMediaMetadata {
  id: string;
  url: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
  platform: "youtube" | "instagram" | "twitter" | "tiktok" | "other";
  formats: SocialMediaFormat[];
  recommendedFormatId?: string;
}

export interface DownloadTask {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  platform: string;
  status: "idle" | "downloading" | "completed" | "error";
  progress: number; // 0..100
  speed: string;
  eta: string;
  formatId?: string;
  isAudio?: boolean;
  outputPath?: string;
  errorMessage?: string;
}

export interface HardwareInfo {
  os: string;
  cpuName: string;
  cpuCores: number;
  totalRamGb: number;
  gpuName: string;
  accelerationType: "nvenc" | "qsv" | "amf" | "videotoolbox" | "cpu";
  encodersAvailable: string[];
  isHardwareAccelerated: boolean;
}

export interface SubtitleItem {
  id: string;
  start: number; // seconds
  end: number; // seconds
  text: string;
}
