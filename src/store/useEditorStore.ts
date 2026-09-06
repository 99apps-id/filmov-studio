import { create } from "zustand";
import {
  Clip,
  Track,
  MediaItem,
  ProjectSettings,
  AspectRatio,
  ClipTransition,
  RichTextProperties,
} from "@/types/editor";

export interface HistorySnapshot {
  tracks: Track[];
  clips: Clip[];
  selectedClipId: string | null;
  duration: number;
}

interface EditorState {
  // Project
  project: ProjectSettings;
  projectPath: string | null;
  isDirty: boolean;
  setProjectSettings: (settings: Partial<ProjectSettings>) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setProjectName: (name: string) => void;
  saveProject: (customPath?: string) => Promise<boolean>;
  loadProjectData: (data: any, filePath?: string) => boolean;
  newProject: () => void;

  // History
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Media Pool
  mediaPool: MediaItem[];
  addMediaItem: (item: MediaItem) => void;
  removeMediaItem: (id: string) => void;

  // Timeline
  tracks: Track[];
  clips: Clip[];
  selectedClipId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  zoom: number; // pixels per second
  snapping: boolean;
  magnetMode: boolean;
  activeTool: "select" | "split" | "trim" | "razor";

  // Actions
  setSelectedClipId: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setZoom: (zoom: number) => void;
  setSnapping: (snapping: boolean) => void;
  setMagnetMode: (magnet: boolean) => void;
  setActiveTool: (tool: "select" | "split" | "trim" | "razor") => void;

  // Track Actions
  addTrack: (
    type: "video" | "audio" | "subtitle" | "text",
    name?: string,
  ) => string;
  removeTrack: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackHide: (trackId: string) => void;

  // Clip Actions
  addClipToTrack: (
    media: MediaItem,
    trackId: string,
    startOffset: number,
  ) => Clip;
  addTextClip: (
    trackId?: string,
    startOffset?: number,
    text?: string,
  ) => Clip;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  moveClip: (clipId: string, newTrackId: string, newStartOffset: number) => void;
  trimClip: (
    clipId: string,
    edge: "left" | "right",
    deltaSeconds: number,
  ) => void;
  splitClipAtCurrentTime: (clipId?: string) => void;
  duplicateClip: (clipId?: string) => void;
  rippleDeleteClip: (clipId: string) => void;
  deleteClip: (clipId: string) => void;
  updateAudioFade: (
    clipId: string,
    fadeIn?: number,
    fadeOut?: number,
  ) => void;
  setClipTransition: (
    clipId: string,
    transition: ClipTransition,
  ) => void;

  // Recalculate duration
  recalculateDuration: () => void;
}

const DEFAULT_TRACKS: Track[] = [
  {
    id: "track-v1",
    name: "Video 1",
    type: "video",
    height: 64,
    isMuted: false,
    isLocked: false,
    isHidden: false,
    volume: 1,
  },
  {
    id: "track-v2",
    name: "Overlay 2",
    type: "video",
    height: 64,
    isMuted: false,
    isLocked: false,
    isHidden: false,
    volume: 1,
  },
  {
    id: "track-sub",
    name: "Subtitles",
    type: "subtitle",
    height: 48,
    isMuted: false,
    isLocked: false,
    isHidden: false,
    volume: 1,
  },
  {
    id: "track-a1",
    name: "Audio 1",
    type: "audio",
    height: 52,
    isMuted: false,
    isLocked: false,
    isHidden: false,
    volume: 1,
  },
];

const INITIAL_DEMO_MEDIA: MediaItem[] = [
  {
    id: "sample-blazes",
    name: "Big Buck Bunny 1080p.mp4",
    path: "/sample-video.mp4",
    url: "/sample-video.mp4",
    type: "video",
    duration: 60.0,
    width: 1920,
    height: 1080,
    fps: 30,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "sample-bunny",
    name: "Ocean Cinematic Showcase.mp4",
    path: "/sample-video.mp4",
    url: "/sample-video.mp4",
    type: "video",
    duration: 12.0,
    width: 1920,
    height: 1080,
    fps: 30,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "sample-audio",
    name: "Lo-Fi Chill Beats.mp3",
    path: "/sample-audio.mp3",
    url: "/sample-audio.mp3",
    type: "audio",
    duration: 30.0,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
  },
];

const INITIAL_CLIPS: Clip[] = [
  {
    id: "clip-initial-video",
    mediaId: "sample-blazes",
    trackId: "track-v1",
    name: "Big Buck Bunny 1080p.mp4",
    type: "video",
    startOffset: 0,
    duration: 14.5,
    inPoint: 0,
    outPoint: 14.5,
    speed: 1,
    transform: {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
    },
    color: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0,
      tint: 0,
      exposure: 0,
    },
    audio: {
      volume: 1,
      pan: 0,
      fadeIn: 0,
      fadeOut: 0,
      noiseReduction: false,
      voiceIsolation: false,
      pitch: 0,
    },
  },
  {
    id: "clip-initial-audio",
    mediaId: "sample-audio",
    trackId: "track-a1",
    name: "Lo-Fi Chill Beats.mp3",
    type: "audio",
    startOffset: 0,
    duration: 18.0,
    inPoint: 0,
    outPoint: 18.0,
    speed: 1,
    transform: {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
    },
    color: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      temperature: 0,
      tint: 0,
      exposure: 0,
    },
    audio: {
      volume: 0.8,
      pan: 0,
      fadeIn: 1,
      fadeOut: 1.5,
      noiseReduction: false,
      voiceIsolation: false,
      pitch: 0,
    },
  },
];

const createSnapshot = (state: {
  tracks: Track[];
  clips: Clip[];
  selectedClipId: string | null;
  duration: number;
}): HistorySnapshot => ({
  tracks: JSON.parse(JSON.stringify(state.tracks)),
  clips: JSON.parse(JSON.stringify(state.clips)),
  selectedClipId: state.selectedClipId,
  duration: state.duration,
});

const pushHistory = (state: EditorState): Partial<EditorState> => {
  const currentSnapshot = createSnapshot(state);
  const newPast = [...state.past, currentSnapshot].slice(-30);
  return {
    past: newPast,
    future: [],
    canUndo: true,
    canRedo: false,
    isDirty: true,
  };
};

export const useEditorStore = create<EditorState>((set, get) => ({
  project: {
    name: "Cinematic Film Project",
    width: 1920,
    height: 1080,
    aspectRatio: "16:9",
    fps: 30,
    sampleRate: 48000,
  },
  projectPath: null,
  isDirty: false,

  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  setProjectSettings: (settings) =>
    set((state) => ({
      project: { ...state.project, ...settings },
      isDirty: true,
    })),

  setProjectName: (name) =>
    set((state) => ({
      project: { ...state.project, name },
      isDirty: true,
    })),

  setAspectRatio: (ratio) =>
    set((state) => {
      let width = 1920;
      let height = 1080;
      if (ratio === "9:16") {
        width = 1080;
        height = 1920;
      } else if (ratio === "1:1") {
        width = 1080;
        height = 1080;
      } else if (ratio === "4:5") {
        width = 1080;
        height = 1350;
      } else if (ratio === "21:9") {
        width = 2560;
        height = 1080;
      }
      return {
        project: {
          ...state.project,
          aspectRatio: ratio,
          width,
          height,
        },
        isDirty: true,
      };
    }),

  saveProject: async (customPath?: string) => {
    const state = get();
    const projectData = {
      filmov_version: "1.0",
      savedAt: new Date().toISOString(),
      project: state.project,
      tracks: state.tracks,
      clips: state.clips,
      mediaPool: state.mediaPool,
      duration: state.duration,
      currentTime: state.currentTime,
    };
    const jsonStr = JSON.stringify(projectData, null, 2);
    const targetPath = customPath || state.projectPath;

    if (targetPath && (window as any).__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("save_project_file", { path: targetPath, content: jsonStr });
        set({ projectPath: targetPath, isDirty: false });
        return true;
      } catch (err) {
        console.error("Failed to save via Tauri:", err);
      }
    }

    // Try HTML5 showSaveFilePicker if available
    if (typeof (window as any).showSaveFilePicker === "function") {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `${state.project.name || "Project"}.filmov`,
          types: [
            {
              description: "Filmov Project (*.filmov)",
              accept: { "application/json": [".filmov", ".json"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
        set({ projectPath: handle.name, isDirty: false });
        return true;
      } catch (err: any) {
        if (err.name === "AbortError") return false;
      }
    }

    // Browser fallback download
    try {
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.project.name || "Project"}.filmov`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      set({ isDirty: false });
      return true;
    } catch (e) {
      console.error("Download fallback failed:", e);
      return false;
    }
  },

  loadProjectData: (data: any, filePath?: string) => {
    try {
      if (!data || !data.tracks || !data.clips) {
        console.error("Invalid project file structure", data);
        return false;
      }
      set({
        project: data.project || get().project,
        tracks: data.tracks,
        clips: data.clips,
        mediaPool: data.mediaPool || [],
        duration: data.duration || 30,
        currentTime: data.currentTime || 0,
        selectedClipId: data.clips.length > 0 ? data.clips[0].id : null,
        projectPath: filePath || get().projectPath,
        past: [],
        future: [],
        canUndo: false,
        canRedo: false,
        isDirty: false,
      });
      get().recalculateDuration();
      return true;
    } catch (e) {
      console.error("Error loading project data:", e);
      return false;
    }
  },

  newProject: () => {
    set({
      project: {
        name: "Untitled Project",
        width: 1920,
        height: 1080,
        aspectRatio: "16:9",
        fps: 30,
        sampleRate: 48000,
      },
      tracks: DEFAULT_TRACKS,
      clips: [],
      mediaPool: [],
      selectedClipId: null,
      currentTime: 0,
      duration: 30,
      projectPath: null,
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      isDirty: false,
    });
  },

  undo: () => {
    const { past, future, tracks, clips, selectedClipId, duration } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const currentSnapshot: HistorySnapshot = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      clips: JSON.parse(JSON.stringify(clips)),
      selectedClipId,
      duration,
    };
    set({
      past: newPast,
      future: [currentSnapshot, ...future].slice(0, 30),
      tracks: previous.tracks,
      clips: previous.clips,
      selectedClipId: previous.selectedClipId,
      duration: previous.duration,
      canUndo: newPast.length > 0,
      canRedo: true,
      isDirty: true,
    });
  },

  redo: () => {
    const { past, future, tracks, clips, selectedClipId, duration } = get();
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    const currentSnapshot: HistorySnapshot = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      clips: JSON.parse(JSON.stringify(clips)),
      selectedClipId,
      duration,
    };
    set({
      past: [...past, currentSnapshot].slice(-30),
      future: newFuture,
      tracks: next.tracks,
      clips: next.clips,
      selectedClipId: next.selectedClipId,
      duration: next.duration,
      canUndo: true,
      canRedo: newFuture.length > 0,
      isDirty: true,
    });
  },

  mediaPool: INITIAL_DEMO_MEDIA,
  addMediaItem: (item) =>
    set((state) => ({
      mediaPool: [item, ...state.mediaPool.filter((m) => m.id !== item.id)],
      isDirty: true,
    })),
  removeMediaItem: (id) =>
    set((state) => ({
      ...pushHistory(state),
      mediaPool: state.mediaPool.filter((m) => m.id !== id),
      clips: state.clips.filter((c) => c.mediaId !== id),
    })),

  tracks: DEFAULT_TRACKS,
  clips: INITIAL_CLIPS,
  selectedClipId: "clip-initial-video",
  currentTime: 0,
  duration: 30,
  isPlaying: false,
  zoom: 60,
  snapping: true,
  magnetMode: false,
  activeTool: "select",

  setSelectedClipId: (id) => set({ selectedClipId: id }),
  setCurrentTime: (time) =>
    set({ currentTime: Math.max(0, parseFloat(time.toFixed(3))) }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setZoom: (zoom) =>
    set({ zoom: Math.min(200, Math.max(15, parseFloat(zoom.toFixed(1)))) }),
  setSnapping: (snapping) => set({ snapping }),
  setMagnetMode: (magnetMode) => set({ magnetMode }),
  setActiveTool: (activeTool) => set({ activeTool }),

  addTrack: (type, name) => {
    const id = `track-${type}-${Date.now()}`;
    const defaultName =
      name ||
      `${type.charAt(0).toUpperCase() + type.slice(1)} ${get().tracks.filter((t) => t.type === type).length + 1}`;
    const newTrack: Track = {
      id,
      name: defaultName,
      type,
      height:
        type === "video" ? 64 : type === "subtitle" || type === "text" ? 48 : 52,
      isMuted: false,
      isLocked: false,
      isHidden: false,
      volume: 1,
    };
    set((state) => ({
      ...pushHistory(state),
      tracks: [...state.tracks, newTrack],
    }));
    return id;
  },

  removeTrack: (trackId) =>
    set((state) => ({
      ...pushHistory(state),
      tracks: state.tracks.filter((t) => t.id !== trackId),
      clips: state.clips.filter((c) => c.trackId !== trackId),
    })),

  toggleTrackMute: (trackId) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, isMuted: !t.isMuted } : t,
      ),
      isDirty: true,
    })),

  toggleTrackLock: (trackId) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, isLocked: !t.isLocked } : t,
      ),
      isDirty: true,
    })),

  toggleTrackHide: (trackId) =>
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, isHidden: !t.isHidden } : t,
      ),
      isDirty: true,
    })),

  addClipToTrack: (media, trackId, startOffset) => {
    const duration = media.duration || 5;
    const clipId = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newClip: Clip = {
      id: clipId,
      mediaId: media.id,
      trackId,
      name: media.name,
      type: media.type,
      startOffset: Math.max(0, startOffset),
      duration,
      inPoint: 0,
      outPoint: duration,
      speed: 1,
      transform: {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
      },
      color: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        temperature: 0,
        tint: 0,
        exposure: 0,
      },
      audio: {
        volume: 1,
        pan: 0,
        fadeIn: 0,
        fadeOut: 0,
        noiseReduction: false,
        voiceIsolation: false,
        pitch: 0,
      },
    };

    set((state) => ({
      ...pushHistory(state),
      clips: [...state.clips, newClip],
      selectedClipId: clipId,
    }));
    get().recalculateDuration();
    return newClip;
  },

  updateClip: (clipId, updates) => {
    set((state) => ({
      clips: state.clips.map((c) =>
        c.id === clipId ? { ...c, ...updates } : c,
      ),
      isDirty: true,
    }));
    get().recalculateDuration();
  },

  moveClip: (clipId, newTrackId, newStartOffset) => {
    const { tracks } = get();
    const targetTrack = tracks.find((t) => t.id === newTrackId);
    if (targetTrack?.isLocked) return;

    set((state) => {
      const currentClip = state.clips.find((c) => c.id === clipId);
      if (!currentClip) return state;
      const currentTrack = state.tracks.find((t) => t.id === currentClip.trackId);
      if (currentTrack?.isLocked) return state;

      return {
        ...pushHistory(state),
        clips: state.clips.map((c) =>
          c.id === clipId
            ? {
                ...c,
                trackId: newTrackId,
                startOffset: Math.max(0, parseFloat(newStartOffset.toFixed(3))),
              }
            : c,
        ),
      };
    });
    get().recalculateDuration();
  },

  trimClip: (clipId, edge, deltaSeconds) => {
    set((state) => {
      const clip = state.clips.find((c) => c.id === clipId);
      if (!clip) return state;
      const track = state.tracks.find((t) => t.id === clip.trackId);
      if (track?.isLocked) return state;

      if (edge === "left") {
        const maxDeltaLeft = -clip.inPoint;
        const maxDeltaRight = clip.duration - 0.2;
        const clampedDelta = Math.max(maxDeltaLeft, Math.min(maxDeltaRight, deltaSeconds));

        const newIn = Math.max(0, clip.inPoint + clampedDelta);
        const newDuration = Math.max(0.2, clip.duration - clampedDelta);
        const newStart = Math.max(0, clip.startOffset + clampedDelta);

        return {
          ...pushHistory(state),
          clips: state.clips.map((c) =>
            c.id === clipId
              ? {
                  ...c,
                  inPoint: parseFloat(newIn.toFixed(3)),
                  duration: parseFloat(newDuration.toFixed(3)),
                  startOffset: parseFloat(newStart.toFixed(3)),
                }
              : c,
          ),
        };
      } else {
        const maxDeltaLeft = -(clip.duration - 0.2);
        const media = state.mediaPool.find((m) => m.id === clip.mediaId);
        const maxDeltaRight = media?.duration
          ? Math.max(0, media.duration - clip.outPoint)
          : 9999;
        const clampedDelta = Math.max(maxDeltaLeft, Math.min(maxDeltaRight, deltaSeconds));

        const newDuration = Math.max(0.2, clip.duration + clampedDelta);
        const newOut = clip.inPoint + newDuration;

        return {
          ...pushHistory(state),
          clips: state.clips.map((c) =>
            c.id === clipId
              ? {
                  ...c,
                  duration: parseFloat(newDuration.toFixed(3)),
                  outPoint: parseFloat(newOut.toFixed(3)),
                }
              : c,
          ),
        };
      }
    });
    get().recalculateDuration();
  },

  splitClipAtCurrentTime: (clipId) => {
    const { currentTime, clips, selectedClipId, tracks } = get();
    // 1. Try explicit clipId or selectedClipId if under playhead
    let targetClip: Clip | undefined;
    if (clipId) {
      targetClip = clips.find((c) => c.id === clipId);
    } else if (selectedClipId) {
      const selected = clips.find((c) => c.id === selectedClipId);
      if (
        selected &&
        currentTime > selected.startOffset + 0.04 &&
        currentTime < selected.startOffset + selected.duration - 0.04
      ) {
        targetClip = selected;
      }
    }

    // 2. If not found, automatically pick the clip directly under the playhead
    if (!targetClip) {
      const unlockedTrackIds = new Set(
        tracks.filter((t) => !t.isLocked).map((t) => t.id),
      );
      targetClip = clips.find(
        (c) =>
          unlockedTrackIds.has(c.trackId) &&
          currentTime > c.startOffset + 0.04 &&
          currentTime < c.startOffset + c.duration - 0.04,
      );
    }

    if (!targetClip) return;

    // Check if the clip's track is locked
    const track = tracks.find((t) => t.id === targetClip?.trackId);
    if (track?.isLocked) return;

    const firstDuration = currentTime - targetClip.startOffset;
    const secondDuration = targetClip.duration - firstDuration;

    const firstFadeIn = targetClip.audio?.fadeIn || 0;
    const firstFadeOut = targetClip.audio?.fadeOut || 0;

    const firstClip: Clip = {
      ...targetClip,
      duration: parseFloat(firstDuration.toFixed(3)),
      outPoint: parseFloat((targetClip.inPoint + firstDuration).toFixed(3)),
      audio: targetClip.audio
        ? {
            ...targetClip.audio,
            fadeIn: Math.min(firstFadeIn, firstDuration / 2),
            fadeOut: 0,
          }
        : targetClip.audio,
    };

    const secondClip: Clip = {
      ...targetClip,
      id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      startOffset: parseFloat(currentTime.toFixed(3)),
      duration: parseFloat(secondDuration.toFixed(3)),
      inPoint: parseFloat((targetClip.inPoint + firstDuration).toFixed(3)),
      transition: undefined,
      audio: targetClip.audio
        ? {
            ...targetClip.audio,
            fadeIn: 0,
            fadeOut: Math.min(firstFadeOut, secondDuration / 2),
          }
        : targetClip.audio,
    };

    set((state) => ({
      ...pushHistory(state),
      clips: state.clips
        .map((c) => (c.id === targetClip!.id ? firstClip : c))
        .concat(secondClip),
      selectedClipId: secondClip.id,
    }));
    get().recalculateDuration();
  },

  duplicateClip: (clipId) => {
    const { clips, selectedClipId } = get();
    const targetId = clipId || selectedClipId;
    if (!targetId) return;
    const target = clips.find((c) => c.id === targetId);
    if (!target) return;

    const newClipId = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newClip: Clip = {
      ...JSON.parse(JSON.stringify(target)),
      id: newClipId,
      name: `${target.name} (Copy)`,
      startOffset: parseFloat((target.startOffset + target.duration).toFixed(3)),
    };

    set((state) => ({
      ...pushHistory(state),
      clips: [...state.clips, newClip],
      selectedClipId: newClipId,
    }));
    get().recalculateDuration();
  },

  rippleDeleteClip: (clipId) => {
    const { clips, tracks } = get();
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;
    const track = tracks.find((t) => t.id === clip.trackId);
    if (track?.isLocked) return;

    const shiftAmount = clip.duration;
    const clipStart = clip.startOffset;

    set((state) => ({
      ...pushHistory(state),
      clips: state.clips
        .filter((c) => c.id !== clipId)
        .map((c) => {
          if (c.trackId === clip.trackId && c.startOffset > clipStart) {
            return {
              ...c,
              startOffset: Math.max(
                0,
                parseFloat((c.startOffset - shiftAmount).toFixed(3)),
              ),
            };
          }
          return c;
        }),
      selectedClipId: null,
    }));
    get().recalculateDuration();
  },

  addTextClip: (trackId, startOffset, text) => {
    let targetTrack = get().tracks.find((t) => t.id === trackId);
    if (!targetTrack) {
      targetTrack = get().tracks.find(
        (t) => t.type === "subtitle" || t.type === "text",
      );
    }
    if (!targetTrack) {
      const newTrackId = get().addTrack("text", "Text 1");
      targetTrack = get().tracks.find((t) => t.id === newTrackId);
    }
    const finalTrackId = targetTrack
      ? targetTrack.id
      : get().tracks[0]?.id || "track-v1";
    const offset = startOffset !== undefined ? startOffset : get().currentTime;
    const clipId = `clip-text-${Date.now()}`;
    const initialText = text || "Heading Text";

    const newClip: Clip = {
      id: clipId,
      mediaId: "text-media",
      trackId: finalTrackId,
      name: initialText,
      type: "text",
      startOffset: Math.max(0, offset),
      duration: 4.0,
      inPoint: 0,
      outPoint: 4.0,
      speed: 1,
      transform: {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
      },
      color: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        temperature: 0,
        tint: 0,
        exposure: 0,
      },
      audio: {
        volume: 1,
        pan: 0,
        fadeIn: 0,
        fadeOut: 0,
        noiseReduction: false,
        voiceIsolation: false,
        pitch: 0,
      },
      subtitleText: initialText,
      textStyle: {
        text: initialText,
        fontFamily: "Space Grotesk",
        fontSize: 48,
        fontWeight: "bold",
        color: "#ffffff",
        textAlign: "center",
        strokeColor: "#000000",
        strokeWidth: 2,
        shadowColor: "rgba(0,0,0,0.7)",
        shadowBlur: 8,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        animation: "fade",
      },
    };

    set((state) => ({
      ...pushHistory(state),
      clips: [...state.clips, newClip],
      selectedClipId: clipId,
    }));
    get().recalculateDuration();
    return newClip;
  },

  updateAudioFade: (clipId, fadeIn, fadeOut) => {
    set((state) => ({
      clips: state.clips.map((c) => {
        if (c.id !== clipId) return c;
        const newAudio = { ...c.audio };
        if (fadeIn !== undefined) {
          newAudio.fadeIn = Math.max(
            0,
            Math.min(c.duration, parseFloat(fadeIn.toFixed(2))),
          );
        }
        if (fadeOut !== undefined) {
          newAudio.fadeOut = Math.max(
            0,
            Math.min(c.duration, parseFloat(fadeOut.toFixed(2))),
          );
        }
        return { ...c, audio: newAudio };
      }),
      isDirty: true,
    }));
  },

  setClipTransition: (clipId, transition) => {
    set((state) => ({
      ...pushHistory(state),
      clips: state.clips.map((c) =>
        c.id === clipId
          ? {
              ...c,
              transition: transition.type === "none" ? undefined : transition,
            }
          : c,
      ),
    }));
  },

  deleteClip: (clipId) => {
    set((state) => ({
      ...pushHistory(state),
      clips: state.clips.filter((c) => c.id !== clipId),
      selectedClipId:
        state.selectedClipId === clipId ? null : state.selectedClipId,
    }));
    get().recalculateDuration();
  },

  recalculateDuration: () => {
    const { clips } = get();
    let maxTime = 30; // minimum 30s view
    for (const clip of clips) {
      const end = clip.startOffset + clip.duration;
      if (end > maxTime) {
        maxTime = end;
      }
    }
    set({ duration: Math.ceil(maxTime + 5) }); // add buffer
  },
}));
