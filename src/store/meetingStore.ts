import { ChatMessage } from "@/lib/openai";
import { create } from "zustand";

export interface MeetingData {
  title: string;
  date: string;
  participants: string[];
  content: string;
}

export type AppState = "idle" | "listening" | "chatting";

export interface MeetingState {
  // App state
  appState: AppState;

  // Meeting data from metin.json
  meetingData: MeetingData | null;
  isMeetingLoaded: boolean;

  // User speech display (gösterim amaçlı)
  currentUserSpeech: string;
  isUserSpeaking: boolean;

  // Accumulated transcript (birikmiş konuşma)
  accumulatedTranscript: string;

  // Chat
  isChatOpen: boolean;
  chatMessages: ChatMessage[];
  isAssistantTyping: boolean;
  isAssistantSpeaking: boolean;

  // Permissions
  hasMicPermission: boolean;
  permissionError: string | null;

  // Actions
  setAppState: (state: AppState) => void;
  setMeetingData: (data: MeetingData) => void;
  setMeetingLoaded: (loaded: boolean) => void;

  setCurrentUserSpeech: (text: string) => void;
  setUserSpeaking: (speaking: boolean) => void;
  appendToTranscript: (text: string) => void;
  clearTranscript: () => void;

  openChat: () => void;
  closeChat: () => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  setAssistantTyping: (typing: boolean) => void;
  setAssistantSpeaking: (speaking: boolean) => void;

  setMicPermission: (hasPermission: boolean) => void;
  setPermissionError: (error: string | null) => void;

  reset: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  // Initial state
  appState: "idle",

  meetingData: null,
  isMeetingLoaded: false,

  currentUserSpeech: "",
  isUserSpeaking: false,
  accumulatedTranscript: "",

  isChatOpen: false,
  chatMessages: [],
  isAssistantTyping: false,
  isAssistantSpeaking: false,

  hasMicPermission: false,
  permissionError: null,

  // Actions
  setAppState: (state) => set({ appState: state }),

  setMeetingData: (data) => set({ meetingData: data, isMeetingLoaded: true }),

  setMeetingLoaded: (loaded) => set({ isMeetingLoaded: loaded }),

  setCurrentUserSpeech: (text) => set({ currentUserSpeech: text }),

  setUserSpeaking: (speaking) => set({ isUserSpeaking: speaking }),

  appendToTranscript: (text) =>
    set((state) => ({
      accumulatedTranscript: state.accumulatedTranscript
        ? `${state.accumulatedTranscript} ${text}`.trim()
        : text.trim(),
    })),

  clearTranscript: () => set({ accumulatedTranscript: "" }),

  openChat: () => set({ isChatOpen: true, appState: "chatting" }),

  closeChat: () => set({ isChatOpen: false, appState: "listening" }),

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  clearChatMessages: () => set({ chatMessages: [] }),

  setAssistantTyping: (typing) => set({ isAssistantTyping: typing }),

  setAssistantSpeaking: (speaking) => set({ isAssistantSpeaking: speaking }),

  setMicPermission: (hasPermission) => set({ hasMicPermission: hasPermission }),

  setPermissionError: (error) => set({ permissionError: error }),

  reset: () =>
    set({
      appState: "idle",
      currentUserSpeech: "",
      isUserSpeaking: false,
      accumulatedTranscript: "",
      isChatOpen: false,
      chatMessages: [],
      isAssistantTyping: false,
      isAssistantSpeaking: false,
    }),
}));
