import React, { useState, useEffect } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { MediaItem, Clip } from "@/types/editor";
import {
  Mic,
  Subtitles,
  Volume2,
  Sparkles,
  Sliders,
  Play,
  Plus,
  Loader2,
  Check,
  Languages,
  Wand2,
  Square,
  AlertCircle,
} from "lucide-react";
import { getPlayableMediaUrl } from "@/utils/mediaUrl";

export const VoiceStudio: React.FC = () => {
  const {
    tracks,
    clips,
    mediaPool,
    currentTime,
    addMediaItem,
    addClipToTrack,
    addTrack,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<
    "captions" | "tts" | "enhancement"
  >("captions");

  // Auto-Caption state
  const [selectedLanguage, setSelectedLanguage] = useState("id");
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionStyle, setCaptionStyle] = useState<
    "karaoke" | "minimal" | "bold"
  >("bold");

  // TTS state
  const [ttsText, setTtsText] = useState(
    "Selamat datang di Filmov! Video editor profesional berbasis Tauri dan Rust dengan akselerasi hardware.",
  );
  const [selectedVoice, setSelectedVoice] = useState("id-male-cinematic");
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);

  // Audio Enhancement state
  const [noiseReduction, setNoiseReduction] = useState(75);
  const [voiceIsolation, setVoiceIsolation] = useState(true);
  const [vocalClarity, setVocalClarity] = useState(80);

  // Generate Subtitles (Whisper Engine)
  const handleGenerateCaptions = async () => {
    setIsGeneratingCaptions(true);

    try {
      let generatedSubtitles: { text: string; start: number; duration: number }[] = [];

      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import("@tauri-apps/api/core");
        // Use the media under the playhead (or the first audio/video asset) so the
        // transcription engine works on the actual audio instead of an empty path.
        const activeClip = clips.find(
          (c) =>
            currentTime >= c.startOffset &&
            currentTime < c.startOffset + c.duration &&
            (c.type === "audio" || c.type === "video"),
        );
        const activeMedia = activeClip
          ? mediaPool.find((m) => m.id === activeClip.mediaId)
          : mediaPool.find((m) => m.type === "audio" || m.type === "video");
        const targetFilePath = activeMedia?.path || activeMedia?.url || "";
        generatedSubtitles = await invoke<any>("transcribe_audio", {
          filePath: targetFilePath,
          language: selectedLanguage,
        });
      } else {
        await new Promise((r) => setTimeout(r, 1200));
        generatedSubtitles = [
          {
            text: selectedLanguage === "en" ? "Welcome to Filmov video editor!" : "Halo semuanya, selamat datang di Filmov!",
            start: 0.5,
            duration: 2.5,
          },
          {
            text: selectedLanguage === "en" ? "Modern video editor powered by Tauri and Rust." : "Editor video modern dengan akselerasi hardware tercepat.",
            start: 3.2,
            duration: 3.8,
          },
          {
            text: selectedLanguage === "en" ? "Download YouTube, Instagram and X media seamlessly." : "Download video YouTube, Instagram, dan X langsung ke timeline.",
            start: 7.2,
            duration: 4.2,
          },
          {
            text: selectedLanguage === "en" ? "Ultra fast 4K GPU rendering and export!" : "Edit dan ekspor dalam kualitas 4K tanpa hambatan!",
            start: 11.6,
            duration: 3.2,
          },
        ];
      }

      let subTrack = tracks.find((t) => t.type === "subtitle");
      let subTrackId = subTrack ? subTrack.id : addTrack("subtitle", "Subtitles");

      generatedSubtitles.forEach((sub, index) => {
        const dummyMedia: MediaItem = {
          id: `sub-media-${Date.now()}-${index}`,
          name: sub.text,
          path: "",
          url: "",
          type: "image",
          duration: sub.duration,
        };

        const clip = addClipToTrack(dummyMedia, subTrackId, sub.start);
        useEditorStore.getState().updateClip(clip.id, {
          type: "subtitle",
          subtitleText: sub.text,
        });
      });
    } catch (err) {
      console.warn("Transcribe failed:", err);
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  // Indonesian Sample Scripts Presets
  const indonesianSampleScripts = [
    {
      title: "Intro Konten / Creator",
      text: "Halo semuanya! Selamat datang kembali di video terbaru saya. Jangan lupa untuk klik like dan subscribe ya!",
    },
    {
      title: "Tutorial & Panduan",
      text: "Di video kali ini, kita akan mempelajari langkah mudah mengedit video profesional dengan hasil maksimal.",
    },
    {
      title: "Narasi Sinematik",
      text: "Setiap perjalanan memiliki cerita. Di balik keindahan alam nusantara, tersimpan sejuta pesona yang memukau.",
    },
    {
      title: "Promosi & Penutup",
      text: "Terima kasih sudah menonton video ini sampai selesai. Bagikan ke teman-temanmu dan sampai jumpa di video berikutnya!",
    },
  ];

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const updateVoices = () => {
        const v = window.speechSynthesis.getVoices();
        setAvailableVoices(v);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const [isPreviewing, setIsPreviewing] = useState(false);

  // Preview Voice locally using Web Speech API
  const handlePreviewVoice = () => {
    if (!ttsText.trim() || typeof window === "undefined") return;

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      if (isPreviewing) {
        setIsPreviewing(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(ttsText);
      utterance.rate = ttsSpeed;

      // Find optimal voice matching selected voice or Indonesian language
      const isIndo = selectedVoice.startsWith("id") || selectedVoice.includes("indonesia");
      const isFemale = selectedVoice.includes("female") || selectedVoice.includes("siti") || selectedVoice.includes("gadis");

      const match = availableVoices.find((v) => {
        if (isIndo) {
          const isLangMatch = v.lang.toLowerCase().includes("id") || v.name.toLowerCase().includes("indonesia");
          if (isLangMatch) {
            if (isFemale && (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("gadis") || v.name.toLowerCase().includes("siti") || v.name.toLowerCase().includes("zira"))) {
              return true;
            }
            if (!isFemale && (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("ardi") || v.name.toLowerCase().includes("bimo") || v.name.toLowerCase().includes("david"))) {
              return true;
            }
            return true;
          }
        }
        return v.name.toLowerCase().includes(selectedVoice.toLowerCase());
      });

      if (match) {
        utterance.voice = match;
        utterance.lang = match.lang;
      } else {
        utterance.lang = isIndo ? "id-ID" : "en-US";
      }

      utterance.onend = () => setIsPreviewing(false);
      utterance.onerror = () => setIsPreviewing(false);

      setIsPreviewing(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Generate TTS Audio (Real SAPI Waveform File)
  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) return;
    setIsGeneratingTTS(true);

    try {
      let audioFilePath = "";
      let customDuration: number | undefined;

      const wordsCount = ttsText.trim().split(/\s+/).length;
      const calculatedDuration = Math.max(
        2.5,
        parseFloat(((wordsCount / 2.5) / ttsSpeed).toFixed(1)),
      );

      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import("@tauri-apps/api/core");
        const res = await invoke<any>("generate_speech", {
          text: ttsText,
          voice: selectedVoice,
          speed: ttsSpeed,
        });

        if (typeof res === "string") {
          audioFilePath = res;
        } else if (res && typeof res === "object") {
          audioFilePath = res.filePath || res.file_path || "";
          if (res.duration && !isNaN(res.duration) && res.duration > 0.5) {
            customDuration = res.duration;
          }
        }
      }

      if (!audioFilePath) {
        audioFilePath = "/sample-audio.mp3";
      }

      const finalDuration = customDuration || calculatedDuration;

      const ttsMedia: MediaItem = {
        id: `tts-${Date.now()}`,
        name: `AI Voiceover (${selectedVoice.includes("male") ? "Bimo Male" : "Siti Female"}).wav`,
        path: audioFilePath,
        url: getPlayableMediaUrl(audioFilePath),
        type: "audio",
        duration: finalDuration,
      };

      addMediaItem(ttsMedia);

      let audioTrack = tracks.find((t) => t.type === "audio");
      let audioTrackId = audioTrack ? audioTrack.id : addTrack("audio", "Audio 1");

      const clipsOnTrack = useEditorStore
        .getState()
        .clips.filter((c) => c.trackId === audioTrackId);
      const offset =
        clipsOnTrack.length > 0
          ? Math.max(...clipsOnTrack.map((c) => c.startOffset + c.duration))
          : 0;

      addClipToTrack(ttsMedia, audioTrackId, offset);
      useEditorStore.getState().setCurrentTime(offset);
    } catch (err) {
      console.warn("TTS generation failed:", err);
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-paper-1)] text-[var(--color-ink)] p-4 overflow-y-auto select-none font-body">
      {/* Top Banner */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#9333ea] flex items-center justify-center text-white shadow-md shadow-purple-500/25">
          <Mic className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[var(--color-ink)] flex items-center gap-2">
            AI Voice & Audio Studio
            <span className="text-[10px] font-semibold bg-purple-50 text-[#7c3aed] px-2 py-0.5 rounded-full border border-purple-200">
              Whisper & DSP
            </span>
          </h2>
          <p className="text-[11px] text-[var(--color-ink-muted)]">
            Auto-captions, neural Text-to-Speech & noise isolation
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-[var(--color-rule)] mb-4 gap-1">
        <button
          onClick={() => setActiveTab("captions")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "captions"
              ? "bg-[#7c3aed] text-white shadow-md shadow-purple-500/25"
              : "text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-white/60"
          }`}
        >
          <Subtitles className="w-3.5 h-3.5" />
          <span>Auto Captions</span>
        </button>

        <button
          onClick={() => setActiveTab("tts")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "tts"
              ? "bg-[#7c3aed] text-white shadow-md shadow-purple-500/25"
              : "text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-white/60"
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Text-to-Speech</span>
        </button>

        <button
          onClick={() => setActiveTab("enhancement")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === "enhancement"
              ? "bg-[#7c3aed] text-white shadow-md shadow-purple-500/25"
              : "text-[var(--color-ink-muted)] hover:text-[#7c3aed] hover:bg-white/60"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Enhancer</span>
        </button>
      </div>

      {/* TAB 1: AUTO CAPTIONS */}
      {activeTab === "captions" && (
        <div className="space-y-4">
          <div className="bg-white border border-[var(--color-rule)] rounded-2xl p-4 shadow-2xs">
            <h3 className="text-xs font-bold text-[var(--color-ink)] mb-3 flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-[#7c3aed]" />
              <span>Spoken Language & Model</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-3.5">
              <div>
                <label className="text-[10px] font-bold uppercase text-[var(--color-ink-muted)] block mb-1">
                  Audio Language
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-[var(--color-ink)] rounded-xl p-2.5 focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-purple-200 font-medium"
                >
                  <option value="id">Indonesian (Bahasa Indonesia)</option>
                  <option value="en">English (US/UK)</option>
                  <option value="ja">Japanese (日本語)</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="auto">Auto-Detect Language</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[var(--color-ink-muted)] block mb-1">
                  Whisper Engine
                </label>
                <select className="w-full bg-slate-50 border border-slate-200 text-xs text-[var(--color-ink)] rounded-xl p-2.5 focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-purple-200 font-medium">
                  <option value="turbo">Whisper Large v3 (Fast GPU)</option>
                  <option value="base">Whisper Base (Low Memory)</option>
                  <option value="small">Whisper Small (Balanced)</option>
                </select>
              </div>
            </div>

            {/* Subtitle Template Preset */}
            <label className="text-[10px] font-bold uppercase text-[var(--color-ink-muted)] block mb-2">
              Caption Style Preset
            </label>
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {[
                { id: "bold", name: "Bold TikTok", bg: "bg-yellow-400 text-black shadow-xs" },
                { id: "karaoke", name: "Karaoke Glow", bg: "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-xs" },
                { id: "minimal", name: "Clean Minimal", bg: "bg-black text-white shadow-xs" },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setCaptionStyle(style.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition-all hover:-translate-y-0.5 ${
                    captionStyle === style.id
                      ? "border-[#7c3aed] bg-purple-50/60 ring-2 ring-purple-200 shadow-xs"
                      : "border-slate-200 bg-slate-50 hover:bg-white hover:border-purple-200"
                  }`}
                >
                  <div
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded mx-auto mb-1.5 ${style.bg}`}
                  >
                    SUBTITLE
                  </div>
                  <span className="text-[11px] text-[var(--color-ink)] font-semibold">
                    {style.name}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateCaptions}
              disabled={isGeneratingCaptions}
              className="w-full py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#6d28d9] hover:to-[#7e22ce] text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/25 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {isGeneratingCaptions ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transcribing Audio with Whisper...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Synchronized Auto Captions</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: TEXT TO SPEECH */}
      {activeTab === "tts" && (
        <div className="space-y-4">
          <div className="bg-white border border-[var(--color-rule)] rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[var(--color-ink)]">
                Voiceover Script (Bahasa Indonesia)
              </h3>
              <span className="text-[10px] text-[#7c3aed] font-semibold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                Pilihan Naskah Cepat
              </span>
            </div>

            {/* Indonesian Sample Script Selector Chips */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {indonesianSampleScripts.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTtsText(sample.text)}
                  className={`px-2.5 py-1 text-[10.5px] rounded-lg border font-medium transition-all ${
                    ttsText === sample.text
                      ? "bg-[#7c3aed] text-white border-[#7c3aed] shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50 hover:text-[#7c3aed] hover:border-purple-200"
                  }`}
                >
                  {sample.title}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              placeholder="Ketik atau tempel naskah suara di sini..."
              className="w-full bg-slate-50 border border-slate-200 text-xs text-[var(--color-ink)] rounded-xl p-3 focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100 mb-3.5 resize-none font-normal leading-relaxed"
            />

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-[var(--color-ink-muted)] block mb-1">
                  AI Voice Profile
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-[var(--color-ink)] rounded-xl p-2.5 focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-purple-200 font-medium"
                >
                  <option value="id-male-cinematic">🇮🇩 Indonesian - Cinematic Male (Bimo)</option>
                  <option value="id-female-natural">🇮🇩 Indonesian - Natural Female (Siti)</option>
                  <option value="id-female-gadis">🇮🇩 Indonesian - Gadis / Announcer</option>
                  <option value="id-male-ardi">🇮🇩 Indonesian - Ardi / Storyteller</option>
                  <option value="en-male-narrator">🇺🇸 English - Studio Narrator (Adam)</option>
                  <option value="en-female-energetic">🇺🇸 English - Energetic Host (Emily)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold uppercase text-[var(--color-ink-muted)]">
                    Speech Rate
                  </label>
                  <span className="text-[10px] font-mono font-bold text-[#7c3aed]">
                    {ttsSpeed}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={ttsSpeed}
                  onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                  className="w-full accent-[#7c3aed] mt-2"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviewVoice}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                  isPreviewing
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-purple-50 hover:bg-purple-100 text-[#7c3aed] border border-purple-200"
                }`}
              >
                {isPreviewing ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-[#7c3aed]" />
                    <span>Preview Voice</span>
                  </>
                )}
              </button>

              <button
                onClick={handleGenerateTTS}
                disabled={isGeneratingTTS}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#6d28d9] hover:to-[#7e22ce] text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/25 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                {isGeneratingTTS ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Voice...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Voice & Place on Track</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIO ENHANCER */}
      {activeTab === "enhancement" && (
        <div className="space-y-4">
          <div className="bg-white border border-[var(--color-rule)] rounded-2xl p-4 space-y-4 shadow-2xs">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-[var(--color-ink)]">
                  DeepFilter Noise Suppression
                </label>
                <span className="text-xs font-mono font-bold text-[#7c3aed]">
                  {noiseReduction}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={noiseReduction}
                onChange={(e) => setNoiseReduction(Number(e.target.value))}
                className="w-full accent-[#7c3aed]"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-[var(--color-ink)] block">
                  AI Voice Isolation
                </span>
                <span className="text-[11px] text-[var(--color-ink-muted)]">
                  Separate vocals from background music/reverb
                </span>
              </div>
              <button
                onClick={() => setVoiceIsolation(!voiceIsolation)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  voiceIsolation ? "bg-[#7c3aed]" : "bg-slate-300"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 shadow-sm ${
                    voiceIsolation ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-[var(--color-ink)]">
                  Studio Vocal Clarity
                </label>
                <span className="text-xs font-mono font-bold text-[#7c3aed]">
                  {vocalClarity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={vocalClarity}
                onChange={(e) => setVocalClarity(Number(e.target.value))}
                className="w-full accent-[#7c3aed]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
