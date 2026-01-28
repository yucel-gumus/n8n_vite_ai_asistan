import { ChatMessage } from "@/lib/openai";
import { create } from "zustand";

export type RecordingState =
  | "idle"
  | "recording"
  | "processing"
  | "completed"
  | "chatting";

export interface MeetingState {
  // Recording state
  recordingState: RecordingState;
  startTime: Date | null;
  duration: number;

  // Transcript
  transcriptBuffer: string;
  interimTranscript: string;

  // Chat
  isChatOpen: boolean;
  chatMessages: ChatMessage[];
  isAssistantTyping: boolean;
  isAssistantSpeaking: boolean;
  isUserSpeaking: boolean;
  currentUserSpeech: string;

  // Permissions
  hasMicPermission: boolean;
  permissionError: string | null;

  // Actions
  setRecordingState: (state: RecordingState) => void;
  startRecording: () => void;
  stopRecording: () => void;
  startChatMode: () => void;

  appendTranscript: (text: string) => void;
  setInterimTranscript: (text: string) => void;
  clearTranscript: () => void;

  openChat: () => void;
  closeChat: () => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  setAssistantTyping: (typing: boolean) => void;
  setAssistantSpeaking: (speaking: boolean) => void;
  setUserSpeaking: (speaking: boolean) => void;
  setCurrentUserSpeech: (text: string) => void;

  setMicPermission: (hasPermission: boolean) => void;
  setPermissionError: (error: string | null) => void;

  updateDuration: () => void;
  reset: () => void;
}

export const useMeetingStore = create<MeetingState>((set, get) => ({
  // Initial state
  recordingState: "idle",
  startTime: null,
  duration: 0,

  transcriptBuffer: "",
  interimTranscript: "",

  isChatOpen: false,
  chatMessages: [],
  isAssistantTyping: false,
  isAssistantSpeaking: false,
  isUserSpeaking: false,
  currentUserSpeech: "",

  hasMicPermission: false,
  permissionError: null,

  // Actions
  setRecordingState: (state) => set({ recordingState: state }),

  startRecording: () =>
    set({
      recordingState: "recording",
      startTime: new Date(),
      duration: 0,
      transcriptBuffer: "",
      interimTranscript: "",
    }),

  stopRecording: () =>
    set({
      recordingState: "completed",
      interimTranscript: "",
    }),

  startChatMode: () =>
    set({
      recordingState: "chatting",
      isChatOpen: true,
      interimTranscript: "",
    }),

  appendTranscript: (text) =>
    set((state) => ({
      transcriptBuffer: state.transcriptBuffer
        ? `${state.transcriptBuffer} ${text}`.trim()
        : text.trim(),
    })),

  setInterimTranscript: (text) => set({ interimTranscript: text }),

  clearTranscript: () => set({ transcriptBuffer: "", interimTranscript: "" }),

  openChat: () => set({ isChatOpen: true }),

  closeChat: () => set({ isChatOpen: false }),

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  clearChatMessages: () => set({ chatMessages: [] }),

  setAssistantTyping: (typing) => set({ isAssistantTyping: typing }),

  setAssistantSpeaking: (speaking) => set({ isAssistantSpeaking: speaking }),

  setUserSpeaking: (speaking) => set({ isUserSpeaking: speaking }),

  setCurrentUserSpeech: (text) => set({ currentUserSpeech: text }),

  setMicPermission: (hasPermission) => set({ hasMicPermission: hasPermission }),

  setPermissionError: (error) => set({ permissionError: error }),

  updateDuration: () => {
    const { startTime } = get();
    if (startTime) {
      const now = new Date();
      const seconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      set({ duration: seconds });
    }
  },

  reset: () =>
    set({
      recordingState: "idle",
      startTime: null,
      duration: 0,
      transcriptBuffer: "",
      interimTranscript: "",
      isChatOpen: false,
      chatMessages: [],
      isAssistantTyping: false,
      isAssistantSpeaking: false,
      isUserSpeaking: false,
      currentUserSpeech: "",
    }),
}));
