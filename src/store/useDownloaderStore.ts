import { create } from "zustand";
import { DownloadTask, SocialMediaMetadata } from "@/types/editor";

interface DownloaderState {
  urlInput: string;
  isLoadingMetadata: boolean;
  metadata: SocialMediaMetadata | null;
  selectedFormatId: string;
  error: string | null;
  tasks: DownloadTask[];

  setUrlInput: (url: string) => void;
  setIsLoadingMetadata: (loading: boolean) => void;
  setMetadata: (data: SocialMediaMetadata | null) => void;
  setSelectedFormatId: (formatId: string) => void;
  setError: (error: string | null) => void;

  addTask: (task: DownloadTask) => void;
  updateTask: (taskId: string, updates: Partial<DownloadTask>) => void;
  removeTask: (taskId: string) => void;
}

export const useDownloaderStore = create<DownloaderState>((set) => ({
  urlInput: "",
  isLoadingMetadata: false,
  metadata: null,
  selectedFormatId: "",
  error: null,
  tasks: [],

  setUrlInput: (urlInput) => set({ urlInput, error: null }),
  setIsLoadingMetadata: (isLoadingMetadata) => set({ isLoadingMetadata }),
  setMetadata: (metadata) =>
    set({
      metadata,
      selectedFormatId:
        metadata?.recommendedFormatId || metadata?.formats[0]?.formatId || "",
      error: null,
    }),
  setSelectedFormatId: (selectedFormatId) => set({ selectedFormatId }),
  setError: (error) => set({ error }),

  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t,
      ),
    })),
  removeTask: (taskId) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) })),
}));
