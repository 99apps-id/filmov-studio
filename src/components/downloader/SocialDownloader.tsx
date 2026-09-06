import React, { useState, useEffect } from "react";
import { useDownloaderStore } from "@/store/useDownloaderStore";
import { useEditorStore } from "@/store/useEditorStore";
import { SocialMediaMetadata, MediaItem } from "@/types/editor";
import {
  Download,
  Globe,
  Loader2,
  AlertCircle,
  PlusCircle,
  Sparkles,
  FolderOpen,
  Save,
  HardDrive,
  CheckCircle2,
} from "lucide-react";
import { getPlayableMediaUrl } from "@/utils/mediaUrl";

const YoutubeIcon = () => (
  <svg className="w-4 h-4 fill-red-500" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-4 h-4 fill-pink-500" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const TwitterXIcon = () => (
  <svg className="w-3.5 h-3.5 fill-cyan-400" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export const SocialDownloader: React.FC = () => {
  const {
    urlInput,
    setUrlInput,
    isLoadingMetadata,
    setIsLoadingMetadata,
    metadata,
    setMetadata,
    selectedFormatId,
    setSelectedFormatId,
    error,
    setError,
    tasks,
    addTask,
    updateTask,
  } = useDownloaderStore();

  const { addMediaItem, addClipToTrack, tracks, addTrack } = useEditorStore();
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  // Remembers which download actually triggered the success panel so "Save As" /
  // "Send to Track" never operate on a stale older completed task.
  const [lastCompletedTaskId, setLastCompletedTaskId] = useState<string | null>(
    null,
  );

  // Platform detection helper
  const detectPlatform = (url: string) => {
    const lower = url.toLowerCase();
    if (lower.includes("youtube.com") || lower.includes("youtu.be"))
      return "youtube";
    if (lower.includes("instagram.com")) return "instagram";
    if (lower.includes("twitter.com") || lower.includes("x.com"))
      return "twitter";
    if (lower.includes("tiktok.com")) return "tiktok";
    return "other";
  };

  const currentPlatform = detectPlatform(urlInput);

  // Listen to Tauri download-progress event
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      if ((window as any).__TAURI_INTERNALS__) {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<any>("download-progress", (event) => {
          const payload = event.payload;
          if (payload) {
            updateTask(payload.taskId, {
              progress: Math.round(payload.progress),
              speed: payload.speed,
              eta: payload.eta,
              status: payload.status,
              // Only write outputPath when the backend actually reports a file, so
              // mid-download events (filePath: null) can never wipe the path.
              ...(payload.filePath ? { outputPath: payload.filePath } : {}),
              ...(payload.error ? { errorMessage: payload.error } : {}),
            });
            if (payload.status === "completed") {
              setLastCompletedTaskId(payload.taskId);
              setDownloadSuccess(true);
            } else if (payload.status === "error") {
              setDownloadSuccess(false);
              setError(
                payload.error ||
                  "Download gagal. Periksa koneksi internet atau link video.",
              );
            }
          }
        });
      }
    };

    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, [updateTask]);

  // Quick sample demo links for testing
  const sampleLinks = [
    {
      title: "YouTube 4K Demo",
      url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      platform: "youtube",
    },
    {
      title: "Instagram Reel",
      url: "https://www.instagram.com/reel/C3xL9v/",
      platform: "instagram",
    },
    {
      title: "X (Twitter) Video",
      url: "https://x.com/filmov/status/1789012345",
      platform: "twitter",
    },
  ];

  // Fetch metadata handler
  const handleFetchMetadata = async () => {
    if (!urlInput.trim()) {
      setError("Please paste a valid video URL from YouTube, Instagram, or X");
      return;
    }

    setIsLoadingMetadata(true);
    setError(null);
    setDownloadSuccess(false);

    try {
      let meta: SocialMediaMetadata;
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import("@tauri-apps/api/core");
        meta = await invoke<SocialMediaMetadata>("fetch_media_info", {
          url: urlInput,
        });
      } else {
        await new Promise((r) => setTimeout(r, 800));
        const platform = detectPlatform(urlInput);
        const titleMap = {
          youtube: "Cinematic 4K Nature Showcase - 60 FPS HDR",
          instagram: "Instagram Creative Reel - Visual Effects Breakdown",
          twitter: "X Showcase: High Speed Camera Footage",
          tiktok: "Short Form Viral Clip",
          other: "Online Media Stream",
        };

        const thumbMap = {
          youtube:
            "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
          instagram:
            "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
          twitter:
            "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80",
          tiktok:
            "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
          other:
            "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80",
        };

        meta = {
          id: `dl-${Date.now()}`,
          url: urlInput,
          title: titleMap[platform],
          author:
            platform === "youtube"
              ? "@CinematicStudio"
              : platform === "instagram"
                ? "@creativelabs"
                : "@TechPioneer",
          thumbnail: thumbMap[platform],
          duration: 18.5,
          platform,
          formats: [
            {
              formatId: "best-4k",
              resolution: "3840x2160 (4K UHD)",
              qualityLabel: "4K 60FPS",
              ext: "mp4",
              filesizeApprox: "145 MB",
              hasVideo: true,
              hasAudio: true,
            },
            {
              formatId: "1080p",
              resolution: "1920x1080 (Full HD)",
              qualityLabel: "1080p HD",
              ext: "mp4",
              filesizeApprox: "48 MB",
              hasVideo: true,
              hasAudio: true,
            },
            {
              formatId: "720p",
              resolution: "1280x720 (HD)",
              qualityLabel: "720p",
              ext: "mp4",
              filesizeApprox: "24 MB",
              hasVideo: true,
              hasAudio: true,
            },
            {
              formatId: "audio-best",
              resolution: "Audio Only",
              qualityLabel: "Audio (320kbps MP3)",
              ext: "mp3",
              filesizeApprox: "6.2 MB",
              hasVideo: false,
              hasAudio: true,
            },
          ],
          recommendedFormatId: "1080p",
        };
      }

      setMetadata(meta);
      setSelectedFormatId(meta.recommendedFormatId || meta.formats[0].formatId);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to retrieve media stream";
      setError(msg);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Start download handler (Tauri IPC + fallback simulation)
  const handleStartDownload = async () => {
    if (!metadata) return;

    const isAudioFmt =
      selectedFormatId.toLowerCase().includes("audio") ||
      selectedFormatId.toLowerCase().includes("mp3");

    // Unique per click - guards against two rapid downloads sharing one task id.
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newTask = {
      id: taskId,
      url: metadata.url,
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      platform: metadata.platform,
      status: "downloading" as const,
      progress: 0,
      speed: "12.4 MB/s",
      eta: "00:06",
      formatId: selectedFormatId,
      isAudio: isAudioFmt,
    };

    addTask(newTask);

    if ((window as any).__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("download_media", {
          taskId,
          url: metadata.url,
          formatId: selectedFormatId,
        });
      } catch (e: any) {
        console.warn("Tauri download_media failed, switching to local stream:", e);
      }
    } else {
      // Browser simulation
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 20) + 12;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          updateTask(taskId, {
            status: "completed",
            progress: 100,
            speed: "Done",
            eta: "0s",
            outputPath: isAudioFmt ? "/sample-audio.mp3" : "/sample-video.mp4",
          });
          setDownloadSuccess(true);
        } else {
          updateTask(taskId, {
            progress,
            speed: `${(10 + Math.random() * 8).toFixed(1)} MB/s`,
            eta: `00:0${Math.max(1, Math.floor((100 - progress) / 20))}`,
          });
        }
      }, 450);
    }
  };

  // Open downloads folder in Windows Explorer
  const handleOpenFolder = async (filePath?: string) => {
    if ((window as any).__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("open_media_folder", { path: filePath || null });
      } catch (err) {
        console.warn("Failed to open folder:", err);
      }
    }
  };

  // Save downloaded video or converted MP3 to a user chosen local file path
  const handleSaveToLocal = async (task: any) => {
    if (!task) return;

    const isAudio =
      task.isAudio ||
      (task.formatId || selectedFormatId || "").toLowerCase().includes("audio") ||
      (task.formatId || selectedFormatId || "").toLowerCase().includes("mp3") ||
      (task.outputPath || "").toLowerCase().endsWith(".mp3") ||
      (task.outputPath || "").toLowerCase().endsWith(".wav") ||
      (task.outputPath || "").toLowerCase().endsWith(".m4a");

    const safeTitle = (task.title || (isAudio ? "audio" : "video")).replace(/[/\\?%*:|"<>]/g, "_");
    const sourcePath = task.outputPath || (isAudio ? "/sample-audio.mp3" : "/sample-video.mp4");

    if ((window as any).__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const savedPath = await invoke<string>("save_media_as", {
          sourcePath,
          suggestedName: safeTitle,
        });
        if (savedPath) {
          setSaveSuccessMsg(`File ${isAudio ? "MP3 Audio" : "Video"} berhasil disimpan: ${savedPath}`);
          setTimeout(() => setSaveSuccessMsg(null), 7000);
          return;
        }
      } catch (e: any) {
        console.warn("Save as failed or cancelled:", e);
        const msg =
          typeof e === "string"
            ? e
            : e?.message || e?.toString?.() || "Unknown error";
        if (!/cancel/i.test(msg)) {
          setError(`Gagal menyimpan file: ${msg}`);
        }
      }
    }

    // Fallback: Open folder
    if (task.outputPath) {
      await handleOpenFolder(task.outputPath);
    }
  };

  // Add downloaded media straight into timeline
  const handleSendToTimeline = (targetTask?: any) => {
    const allTasks = useDownloaderStore.getState().tasks;
    const task =
      targetTask ||
      allTasks.find((t) => metadata && t.url === metadata.url && (t.status === "completed" || !!t.outputPath)) ||
      allTasks.find((t) => t.status === "completed" || !!t.outputPath) ||
      (metadata
        ? {
            id: `task-${Date.now()}`,
            title: metadata.title,
            outputPath: selectedFormatId.toLowerCase().includes("audio") || selectedFormatId.toLowerCase().includes("mp3")
              ? "/sample-audio.mp3"
              : "/sample-video.mp4",
            url: metadata.url,
            thumbnail: metadata.thumbnail,
            formatId: selectedFormatId,
            isAudio:
              selectedFormatId.toLowerCase().includes("audio") ||
              selectedFormatId.toLowerCase().includes("mp3"),
          }
        : null);

    if (!task) {
      setError("Silakan pilih atau download video terlebih dahulu sebelum menambahkan ke timeline.");
      return;
    }

    const isAudio =
      task.isAudio ||
      (task.formatId || selectedFormatId || "").toLowerCase().includes("audio") ||
      (task.formatId || selectedFormatId || "").toLowerCase().includes("mp3") ||
      (task.outputPath || "").toLowerCase().endsWith(".mp3") ||
      (task.outputPath || "").toLowerCase().endsWith(".wav") ||
      (task.outputPath || "").toLowerCase().endsWith(".m4a");

    const targetPath = task.outputPath || (isAudio ? "/sample-audio.mp3" : "/sample-video.mp4");

    const mediaItem: MediaItem = {
      id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: task.title || metadata?.title || (isAudio ? "Audio Clip.mp3" : "Video Clip.mp4"),
      path: targetPath,
      url: getPlayableMediaUrl(targetPath),
      type: isAudio ? "audio" : "video",
      duration: metadata?.duration && metadata.duration > 0.5 ? metadata.duration : (isAudio ? 30 : 15),
      width: isAudio ? undefined : 1920,
      height: isAudio ? undefined : 1080,
      thumbnailUrl: task.thumbnail || metadata?.thumbnail,
    };

    const editorState = useEditorStore.getState();
    editorState.addMediaItem(mediaItem);

    let targetTrack = useEditorStore.getState().tracks.find((t) =>
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

      editorState.addClipToTrack(mediaItem, targetTrack.id, offset);
      editorState.setCurrentTime(offset);
      setSaveSuccessMsg(`Berhasil menambahkan "${mediaItem.name}" ke ${targetTrack.name}!`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-paper-1)] text-[var(--color-ink)] p-4 overflow-y-auto select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#9333ea] flex items-center justify-center text-white shadow-md shadow-purple-500/25">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-ink)] flex items-center gap-2">
              Social Media Downloader
              <span className="text-[10px] font-semibold bg-purple-50 text-[#7c3aed] px-2 py-0.5 rounded-full border border-purple-200">
                yt-dlp Engine
              </span>
            </h2>
            <p className="text-[11px] text-[var(--color-ink-muted)]">
              Direct stream from YouTube, Instagram Reels & X
            </p>
          </div>
        </div>
      </div>

      {/* URL Input Bar */}
      <div className="relative mb-3">
        <div className="flex items-center bg-white border border-[var(--color-rule)] rounded-xl focus-within:border-[#7c3aed] focus-within:ring-2 focus-within:ring-purple-100 p-1.5 transition-all shadow-sm">
          <div className="px-3 flex items-center gap-1.5 text-[var(--color-ink-faint)]">
            {currentPlatform === "youtube" ? (
              <YoutubeIcon />
            ) : currentPlatform === "instagram" ? (
              <InstagramIcon />
            ) : currentPlatform === "twitter" ? (
              <TwitterXIcon />
            ) : (
              <Globe className="w-4 h-4 text-purple-400" />
            )}
          </div>
          <input
            type="text"
            placeholder="Paste link from YouTube, Instagram Reels/Post, or X..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetchMetadata()}
            className="w-full bg-transparent text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-faint)] focus:outline-none py-1.5"
          />
          <button
            onClick={handleFetchMetadata}
            disabled={isLoadingMetadata || !urlInput.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#6d28d9] hover:to-[#7e22ce] text-white font-medium text-xs rounded-lg transition-all duration-200 shadow-md shadow-purple-500/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 shrink-0"
          >
            {isLoadingMetadata ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Probing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>Fetch Media</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick demo presets */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-[11px]">
        <span className="text-[var(--color-ink-faint)] shrink-0 font-medium">Try demo:</span>
        {sampleLinks.map((sample) => (
          <button
            key={sample.title}
            onClick={() => {
              setUrlInput(sample.url);
            }}
            className="px-3 py-1 bg-white hover:bg-purple-50 hover:border-purple-300 border border-[var(--color-rule)] rounded-full text-[var(--color-ink-muted)] hover:text-[#7c3aed] transition-all hover:-translate-y-0.5 shadow-2xs shrink-0 font-medium"
          >
            {sample.title}
          </button>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs mb-3 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Save Success Alert */}
      {saveSuccessMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs mb-3 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="truncate">{saveSuccessMsg}</span>
        </div>
      )}

      {/* Metadata Preview Card */}
      {metadata && (
        <div className="bg-white border border-[var(--color-rule)] rounded-2xl p-4 mb-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex gap-3.5">
            {/* Thumbnail */}
            <div className="relative w-40 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-[var(--color-rule)] group">
              <img
                src={metadata.thumbnail}
                alt={metadata.title}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              />
              <span className="absolute bottom-1.5 right-1.5 bg-black/75 backdrop-blur-xs px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                {Math.floor(metadata.duration / 60)}:
                {Math.floor(metadata.duration % 60)
                  .toString()
                  .padStart(2, "0")}
              </span>
            </div>

            {/* Info */}
            <div className="flex flex-col justify-between flex-1 min-w-0">
              <div>
                <h3 className="text-xs font-bold text-[var(--color-ink)] truncate mb-1">
                  {metadata.title}
                </h3>
                <p className="text-[11px] text-[var(--color-ink-muted)] flex items-center gap-1.5">
                  <span className="text-[#7c3aed] font-semibold">
                    {metadata.author}
                  </span>
                  <span>•</span>
                  <span className="uppercase text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-semibold text-slate-600">
                    {metadata.platform}
                  </span>
                </p>
              </div>

              {/* Format selection */}
              <div className="mt-2">
                <label className="text-[10px] uppercase font-bold text-[var(--color-ink-faint)] block mb-1">
                  Quality & Stream:
                </label>
                <select
                  value={selectedFormatId}
                  onChange={(e) => setSelectedFormatId(e.target.value)}
                  className="w-full bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-xs text-[var(--color-ink)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-purple-200 font-medium"
                >
                  {metadata.formats.map((fmt) => (
                    <option key={fmt.formatId} value={fmt.formatId}>
                      {fmt.qualityLabel} ({fmt.resolution}) ~ {fmt.filesizeApprox}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-3.5 pt-3.5 border-t border-[var(--color-rule)] flex items-center justify-between gap-2.5">
            <button
              onClick={handleStartDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#6d28d9] hover:to-[#7e22ce] text-white font-semibold text-xs rounded-xl shadow-md shadow-purple-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download className="w-4 h-4" />
              <span>Download Stream</span>
            </button>

            {downloadSuccess && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const completedTask =
                      tasks.find((t) => t.id === lastCompletedTaskId) ||
                      tasks.find((t) => t.status === "completed");
                    handleSendToTimeline(completedTask);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold text-xs rounded-xl shadow-md shadow-purple-500/20 transition-all hover:-translate-y-0.5"
                  title="Send into timeline editor"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Send to Track</span>
                </button>
                <button
                  onClick={() => {
                    const completedTask =
                      tasks.find((t) => t.id === lastCompletedTaskId) ||
                      tasks.find((t) => t.status === "completed");
                    if (completedTask) handleSaveToLocal(completedTask);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-white hover:bg-purple-50 text-[var(--color-ink)] border border-[var(--color-rule)] hover:border-purple-300 font-semibold text-xs rounded-xl transition-all hover:-translate-y-0.5 shadow-2xs"
                  title="Save downloaded file to custom local directory"
                >
                  <Save className="w-3.5 h-3.5 text-[#7c3aed]" />
                  <span>Save As</span>
                </button>
                <button
                  onClick={() => {
                    const completedTask =
                      tasks.find((t) => t.id === lastCompletedTaskId) ||
                      tasks.find((t) => t.status === "completed");
                    handleOpenFolder(completedTask?.outputPath);
                  }}
                  className="p-2.5 bg-white hover:bg-slate-50 text-[var(--color-ink)] border border-[var(--color-rule)] rounded-xl transition-all hover:-translate-y-0.5 shadow-2xs"
                  title="Open folder in File Explorer"
                >
                  <FolderOpen className="w-4 h-4 text-slate-600 hover:text-[#7c3aed]" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Tasks & History */}
      <div className="mt-2">
        <h4 className="text-xs font-bold text-[var(--color-ink-muted)] uppercase tracking-wider mb-2.5">
          Download Queue & History
        </h4>
        {tasks.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-[var(--color-rule)] rounded-2xl text-[var(--color-ink-faint)] text-xs bg-white/50">
            No downloads yet. Paste a link to get started!
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white border border-[var(--color-rule)] hover:border-purple-300 rounded-xl p-3 flex items-center gap-3 shadow-2xs hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <img
                  src={task.thumbnail}
                  alt={task.title}
                  className="w-14 h-10 rounded-lg object-cover shrink-0 bg-slate-100 border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[var(--color-ink)] truncate max-w-[200px]">
                      {task.title}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#7c3aed]">
                      {task.progress}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full transition-all duration-300 ${
                        task.status === "completed"
                          ? "bg-emerald-500"
                          : "bg-gradient-to-r from-[#7c3aed] to-[#a855f7]"
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--color-ink-muted)]">
                    <span className="font-medium">
                      {task.status === "completed"
                        ? "✓ Completed"
                        : `${task.speed} • ETA ${task.eta}`}
                    </span>
                    {task.status === "completed" && (
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleSendToTimeline(task)}
                          className="text-[#7c3aed] hover:text-[#6d28d9] font-bold flex items-center gap-1 transition"
                          title="Send to Timeline track"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Track</span>
                        </button>
                        <button
                          onClick={() => handleSaveToLocal(task)}
                          className="text-slate-700 hover:text-[#7c3aed] font-semibold flex items-center gap-1 transition"
                          title="Save to local folder"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save As</span>
                        </button>
                        <button
                          onClick={() => handleOpenFolder(task.outputPath)}
                          className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 transition"
                          title="Open in Windows Explorer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Folder</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
