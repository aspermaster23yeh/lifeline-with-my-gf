"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Category } from "@/lib/domain/types";
import type { StatusFilter } from "@/lib/domain/filters";

export type MapView = "map" | "summary" | "money";

export type ViewportCommand =
  | { type: "today" }
  | { type: "year"; year: number }
  | { type: "project"; projectId: string }
  | { type: "zoom-in" }
  | { type: "zoom-out" };

type ViewportRequest = ViewportCommand & { nonce: number };

type DeleteTarget =
  | { kind: "project"; id: string; label: string }
  | { kind: "task"; id: string; label: string }
  | { kind: "connection"; id: string; label: string };

type UiState = {
  view: MapView;
  query: string;
  category: Category | "all";
  status: StatusFilter;
  year: number | "all";
  ownerId: string | "all";
  selectedProjectId: string | null;
  sidebarOpen: boolean;
  createOpen: boolean;
  settingsOpen: boolean;
  showOriginalDates: boolean;
  zoom: number;
  seenHistoryAt: string | null;
  viewportRequest: ViewportRequest | null;
  deleteTarget: DeleteTarget | null;
  setView: (view: MapView) => void;
  setQuery: (query: string) => void;
  setCategory: (category: Category | "all") => void;
  setStatus: (status: StatusFilter) => void;
  setYear: (year: number | "all") => void;
  setOwnerId: (ownerId: string | "all") => void;
  selectProject: (projectId: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setCreateOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setShowOriginalDates: (show: boolean) => void;
  setZoom: (zoom: number) => void;
  markHistorySeen: (createdAt: string) => void;
  requestViewport: (request: ViewportCommand) => void;
  askDelete: (target: DeleteTarget) => void;
  clearDelete: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      view: "map",
      query: "",
      category: "all",
      status: "all",
      year: "all",
      ownerId: "all",
      selectedProjectId: null,
      sidebarOpen: true,
      createOpen: false,
      settingsOpen: false,
      showOriginalDates: true,
      zoom: 1,
      seenHistoryAt: null,
      viewportRequest: null,
      deleteTarget: null,
      setView: (view) => set({ view }),
      setQuery: (query) => set({ query }),
      setCategory: (category) => set({ category }),
      setStatus: (status) => set({ status }),
      setYear: (year) => set({ year }),
      setOwnerId: (ownerId) => set({ ownerId }),
      selectProject: (selectedProjectId) => set({ selectedProjectId }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setCreateOpen: (createOpen) => set({ createOpen }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      setShowOriginalDates: (showOriginalDates) => set({ showOriginalDates }),
      setZoom: (zoom) => set({ zoom }),
      markHistorySeen: (seenHistoryAt) => set({ seenHistoryAt }),
      requestViewport: (request) =>
        set({ viewportRequest: { ...request, nonce: (get().viewportRequest?.nonce ?? 0) + 1 } }),
      askDelete: (deleteTarget) => set({ deleteTarget }),
      clearDelete: () => set({ deleteTarget: null }),
    }),
    {
      name: "our-life-map-ui",
      partialize: (state) => ({
        view: state.view,
        showOriginalDates: state.showOriginalDates,
        seenHistoryAt: state.seenHistoryAt,
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
);
