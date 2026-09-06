import React, { useRef, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { MediaItem } from "@/types/editor";
import {
  FolderOpen,
  Plus,
  Film,
  Music,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  Play,
  X,
  Volume2,
  Loader2,
} from "lucide-react";
import { getPlayableMediaUrl } from "@/utils/mediaUrl";

export const MediaPool: React.FC = () => {
  const { mediaPool, addMediaItem, removeMediaItem, addClipToTrack, tracks } =
    useEditorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reliable, high quality streaming demo assets with valid video & audio codecs
  const sampleStockAssets: MediaItem[] = [
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
      path: "https://vjs.zencdn.net/v/oceans.mp4",
      url: "https://vjs.zencdn.net/v/oceans.mp4",
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
      name: "Viper Synth Soundtrack.mp3",
      path: "/sample-audio.mp3",
      url: "/sample-audio.mp3",
      type: "audio",
      duration: 30.0,
      waveformPeaks: [
        0.3, 0.7, 0.9, 0.6, 0.8, 0.4, 0.9, 1.0, 0.8, 0.5, 0.7, 0.9, 0.6, 0.3,
      ],
    },
  ];

  // Fetch a real waveform for audio/video files on disk (Tauri backend) so the
  // timeline shows the actual audio shape instead of a synthetic curve.
  const enrichWaveform = async (item: MediaItem): Promise<MediaItem> => {
    if (!(window as any).__TAURI_INTERNALS__) return item;
    const srcPath = item.path;
    if (!srcPath || !srcPath.includes(":")) return item;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const peaks = await invoke<number[]>("extract_waveform", {
        filePath: srcPath,
      });
      if (Array.isArray(peaks) && peaks.length > 0) {
        item.waveformPeaks = peaks;
      }
    } catch {
      // Ignore - fall back to the synthetic waveform bars in the timeline.
    }
    return item;
  };

  const commitItem = async (item: MediaItem) => {
    const enriched = await enrichWaveform(item);
    addMediaItem(enriched);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const objectUrl = URL.createObjectURL(file);
      const isVideo = file.type.startsWith("video");
      const isAudio = file.type.startsWith("audio");
      const isImage = file.type.startsWith("image");

      const itemId = `local-${Date.now()}-${i}`;
      const newItem: MediaItem = {
        id: itemId,
        name: file.name,
        path: (file as any).path || file.name,
        url: objectUrl,
        type: isVideo ? "video" : isAudio ? "audio" : "image",
        duration: isVideo ? 10 : isAudio ? 20 : 5,
        thumbnailUrl: isImage ? objectUrl : undefined,
      };

      // Probe accurate video/audio duration and resolution
      if (isVideo) {
        const probeVideo = document.createElement("video");
        probeVideo.preload = "metadata";
        probeVideo.src = objectUrl;
        probeVideo.onloadedmetadata = () => {
          if (probeVideo.duration && !isNaN(probeVideo.duration)) {
            newItem.duration = parseFloat(probeVideo.duration.toFixed(2));
          }
          if (probeVideo.videoWidth) {
            newItem.width = probeVideo.videoWidth;
            newItem.height = probeVideo.videoHeight;
          }
          commitItem(newItem);
        };
        probeVideo.onerror = () => {
          commitItem(newItem);
        };
      } else if (isAudio) {
        const probeAudio = document.createElement("audio");
        probeAudio.preload = "metadata";
        probeAudio.src = objectUrl;
        probeAudio.onloadedmetadata = () => {
          if (probeAudio.duration && !isNaN(probeAudio.duration)) {
            newItem.duration = parseFloat(probeAudio.duration.toFixed(2));
          }
          commitItem(newItem);
        };
        probeAudio.onerror = () => {
          commitItem(newItem);
        };
      } else {
        commitItem(newItem);
      }
    }
  };

  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertMsg, setConvertMsg] = useState<string | null>(null);

  const handleConvertToMp3 = async (item: MediaItem) => {
    if (!(window as any).__TAURI_INTERNALS__) {
      setConvertMsg("Konversi ke MP3 hanya tersedia di aplikasi desktop (Tauri).");
      return;
    }
    const srcPath = item.path || item.url;
    if (!srcPath || !srcPath.includes(":")) {
      setConvertMsg("Media ini belum tersimpan di disk, tidak bisa dikonversi.");
      return;
    }
    setConvertingId(item.id);
    setConvertMsg(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const out = await invoke<string>("convert_media_to_mp3", {
        sourcePath: srcPath,
      });
      const newItem: MediaItem = {
        id: `conv-${Date.now()}`,
        name: `${item.name.replace(/\.[^.]+$/, "")}.mp3`,
        path: out,
        url: getPlayableMediaUrl(out),
        type: "audio",
        duration: item.duration,
      };
      addMediaItem(newItem);
      setConvertMsg("✓ Converted ke MP3 & ditambahkan ke Media Pool");
    } catch (e: any) {
      setConvertMsg("Konversi gagal: " + (e?.toString?.() || e));
    } finally {
      setConvertingId(null);
    }
  };

  const handleInsertClip = (item: MediaItem) => {
    const isAudio =
      item.type === "audio" ||
      (item.path || "").toLowerCase().endsWith(".mp3") ||
      (item.path || "").toLowerCase().endsWith(".wav") ||
      (item.path || "").toLowerCase().endsWith(".m4a");

    const editorState = useEditorStore.getState();
    let targetTrack = editorState.tracks.find((t) =>
      isAudio ? t.type === "audio" : t.type === "video",
    );
    if (!targetTrack) {
      const newTrackId = editorState.addTrack(
        isAudio ? "audio" : "video",
        isAudio ? "Audio 1" : "Video 1",
      );
      targetTrack = useEditorStore.getState().tracks.find((t) => t.id === newTrackId);
    }
    if (targetTrack) {
      const clipsOnTrack = useEditorStore
        .getState()
        .clips.filter((c) => c.trackId === targetTrack!.id);
      const offset =
        clipsOnTrack.length > 0
          ? Math.max(...clipsOnTrack.map((c) => c.startOffset + c.duration))
          : 0;

      editorState.addClipToTrack(item, targetTrack.id, offset);
      editorState.setCurrentTime(offset);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-paper-1)] text-[var(--color-ink)] p-4 overflow-y-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2 tracking-tight text-[var(--color-ink)]">
            <FolderOpen className="w-4 h-4 text-[#7c3aed]" />
            Media Pool
          </h2>
          <p className="text-[11px] text-[var(--color-ink-muted)]">
            Organize, import, and sequence project media
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold text-xs rounded-xl shadow-md shadow-purple-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span>Import Media</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          accept="video/*,audio/*,image/*"
          className="hidden"
        />
      </div>

      {/* Quick Add Demo Stock Footage */}
      <div className="mb-4 p-3.5 bg-white border border-[var(--color-rule)] rounded-2xl shadow-2xs">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold text-[var(--color-ink)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#7c3aed]" />
            Stock Reference Clips
          </span>
          <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-medium border border-purple-100">
            Direct Stream
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {sampleStockAssets.map((sample) => (
            <button
              key={sample.id}
              onClick={() => {
                addMediaItem(sample);
                handleInsertClip(sample);
              }}
              className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-purple-50/60 border border-slate-200 hover:border-purple-300 rounded-xl text-left transition-all hover:-translate-y-0.5 group active:scale-[0.99] shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-black/60 overflow-hidden shrink-0 relative flex items-center justify-center border border-slate-200">
                {sample.thumbnailUrl ? (
                  <img
                    src={sample.thumbnailUrl}
                    alt={sample.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music className="w-4 h-4 text-[#7c3aed]" />
                )}
                <div className="absolute inset-0 bg-[#7c3aed]/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  <Plus className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-medium text-[var(--color-ink)] block truncate group-hover:text-[#7c3aed]">
                  {sample.name}
                </span>
                <span className="text-[10px] text-[var(--color-ink-muted)] font-mono">
                  {sample.duration}s • {sample.type.toUpperCase()}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* User Media Pool Assets */}
      <div>
        <h3 className="text-[11px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider mb-2.5">
          Project Assets ({mediaPool.length})
        </h3>

        {mediaPool.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="text-center py-10 border-2 border-dashed border-[var(--color-rule)] hover:border-[#7c3aed] hover:bg-purple-50/40 rounded-2xl text-[var(--color-ink-faint)] hover:text-[#7c3aed] text-xs cursor-pointer transition-all duration-200 group"
          >
            <Film className="w-8 h-8 mx-auto mb-2 opacity-40 group-hover:opacity-100 group-hover:text-[#7c3aed] transition" />
            <span className="font-medium block mb-1 text-[var(--color-ink)]">Click to import media</span>
            <span className="text-[11px] text-[var(--color-ink-muted)]">Supports MP4, WebM, MOV, MP3, PNG, JPG</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {mediaPool.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-[var(--color-rule)] hover:border-purple-300 hover:ring-2 hover:ring-purple-100 rounded-xl overflow-hidden group transition-all duration-200 hover:-translate-y-0.5 shadow-2xs hover:shadow-md"
              >
                <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : item.type === "audio" ? (
                    <div className="flex flex-col items-center gap-1 text-[#7c3aed]">
                      <Music className="w-7 h-7 text-purple-400" />
                      <span className="text-[10px] text-purple-200 font-mono">Audio</span>
                    </div>
                  ) : (
                    <Film className="w-7 h-7 text-slate-400" />
                  )}

                  {/* Duration badge */}
                  <span className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                    {item.duration.toFixed(1)}s
                  </span>

                  {/* Hover action overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewItem(item);
                      }}
                      className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-bold transition shadow-md hover:scale-110 active:scale-95"
                      title="Preview Media"
                    >
                      <Play className="w-4 h-4 fill-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInsertClip(item);
                      }}
                      className="p-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-white font-bold transition shadow-md hover:scale-110 active:scale-95"
                      title="Add to Timeline"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMediaItem(item.id);
                      }}
                      className="p-2 bg-white/20 hover:bg-red-600 text-white rounded-lg transition shadow-md hover:scale-110 active:scale-95"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {(item.type === "audio" || item.type === "video") &&
                      !(item.path || "").toLowerCase().endsWith(".mp3") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConvertToMp3(item);
                          }}
                          disabled={convertingId === item.id}
                          className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-md hover:scale-110 active:scale-95 disabled:opacity-60"
                          title="Convert to MP3"
                        >
                          {convertingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Music className="w-4 h-4" />
                          )}
                        </button>
                      )}
                  </div>
                </div>

                <div className="p-2.5 bg-white">
                  <span className="text-xs font-semibold text-[var(--color-ink)] block truncate group-hover:text-[#7c3aed] transition">
                    {item.name}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-[var(--color-ink-muted)] font-mono mt-1">
                    <span className="uppercase font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded">
                      {item.type}
                    </span>
                    {item.width && item.height ? (
                      <span>
                        {item.width}×{item.height}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Convert feedback banner */}
      {convertMsg && (
        <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-700 font-medium">
          {convertMsg}
        </div>
      )}

      {/* Asset Quick Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2 min-w-0">
                {previewItem.type === "audio" ? (
                  <Music className="w-4 h-4 text-purple-400 shrink-0" />
                ) : (
                  <Film className="w-4 h-4 text-purple-400 shrink-0" />
                )}
                <span className="text-xs font-bold text-white truncate">
                  {previewItem.name}
                </span>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col items-center justify-center bg-black min-h-[220px]">
              {previewItem.type === "audio" ? (
                <div className="w-full flex flex-col items-center gap-4 py-6">
                  <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 animate-pulse">
                    <Volume2 className="w-8 h-8" />
                  </div>
                  <audio
                    src={getPlayableMediaUrl(previewItem.url || previewItem.path)}
                    controls
                    autoPlay
                    className="w-full max-w-md accent-[#7c3aed]"
                  />
                </div>
              ) : (
                <video
                  src={getPlayableMediaUrl(previewItem.url || previewItem.path)}
                  controls
                  autoPlay
                  className="w-full max-h-[380px] rounded-lg object-contain"
                />
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Duration: {previewItem.duration.toFixed(1)}s
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleInsertClip(previewItem);
                    setPreviewItem(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold rounded-lg shadow-md transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Timeline</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
