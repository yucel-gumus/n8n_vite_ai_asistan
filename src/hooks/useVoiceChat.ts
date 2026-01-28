import {
  ChatMessage,
  getAIResponseAndSpeak,
  playAudio,
  textToSpeech,
} from "@/lib/openai";
import { useMeetingStore } from "@/store/meetingStore";
import { useCallback, useRef, useState } from "react";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const TERMINATION_WORDS = [
  "görüşürüz",
  "gorusuruz",
  "toplantıyı bitir",
  "toplantiyi bitir",
];

export function useVoiceChat() {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isProcessingRef = useRef(false);

  const {
    transcriptBuffer,
    chatMessages,
    addChatMessage,
    setAssistantTyping,
    setAssistantSpeaking,
    setUserSpeaking,
    setCurrentUserSpeech,
    setPermissionError,
  } = useMeetingStore();

  const checkTermination = useCallback((text: string): boolean => {
    const normalizedText = text.toLowerCase().trim();
    return TERMINATION_WORDS.some((word) => normalizedText.includes(word));
  }, []);

  const speakGreeting = useCallback(async () => {
    const greeting =
      "Merhaba! Ben EnerwiseAi . Toplantı hakkında sorularınız varsa yanıtlamaktan memnuniyet duyarım.";

    addChatMessage({ role: "assistant", content: greeting });
    setAssistantSpeaking(true);

    try {
      const audioData = await textToSpeech(greeting);
      if (audioData) {
        await playAudio(audioData);
      }
    } catch (error) {
      console.error("Failed to speak greeting:", error);
    } finally {
      setAssistantSpeaking(false);
    }
  }, [addChatMessage, setAssistantSpeaking]);

  const speakFarewell = useCallback(async () => {
    const farewell = "Toplantı notlarını hazırlıyorum, iyi günler!";

    addChatMessage({ role: "assistant", content: farewell });
    setAssistantSpeaking(true);

    try {
      const audioData = await textToSpeech(farewell);
      if (audioData) {
        await playAudio(audioData);
      }
    } catch (error) {
      console.error("Failed to speak farewell:", error);
    } finally {
      setAssistantSpeaking(false);
    }
  }, [addChatMessage, setAssistantSpeaking]);

  const processUserSpeech = useCallback(
    async (userText: string) => {
      if (isProcessingRef.current || !userText.trim()) return;

      // Termination komutu ise işleme - AI'a sormadan sadece user mesajı ekle
      // Farewell VoiceChatInterface tarafından söylenecek
      if (checkTermination(userText)) {
        addChatMessage({ role: "user", content: userText });
        setCurrentUserSpeech("");
        setUserSpeaking(false);
        return; // AI'a sorma, çakışma olmasın
      }

      isProcessingRef.current = true;

      // Add user message
      addChatMessage({ role: "user", content: userText });
      setCurrentUserSpeech("");
      setUserSpeaking(false);

      // Get AI response and speak
      setAssistantTyping(true);

      try {
        const conversationHistory = chatMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })) as ChatMessage[];

        setAssistantTyping(false);
        setAssistantSpeaking(true);

        const result = await getAIResponseAndSpeak(
          userText,
          transcriptBuffer,
          conversationHistory,
        );
        addChatMessage({ role: "assistant", content: result.text });
      } catch (error) {
        console.error("Error processing speech:", error);
        addChatMessage({
          role: "assistant",
          content: "Üzgünüm, bir hata oluştu.",
        });
      } finally {
        setAssistantTyping(false);
        setAssistantSpeaking(false);
        isProcessingRef.current = false;
      }
    },
    [
      addChatMessage,
      chatMessages,
      transcriptBuffer,
      setAssistantTyping,
      setAssistantSpeaking,
      setCurrentUserSpeech,
      setUserSpeaking,
      checkTermination,
    ],
  );

  const startListening = useCallback(async (): Promise<boolean> => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setPermissionError("Tarayıcınız ses tanıma özelliğini desteklemiyor.");
      return false;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPermissionError("Mikrofon erişimi reddedildi.");
      return false;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "tr-TR";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (interimText) {
        setCurrentUserSpeech(interimText);
        setUserSpeaking(true);
      }

      if (finalText.trim()) {
        setCurrentUserSpeech(finalText);
        processUserSpeech(finalText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Voice chat recognition error:", event.error);
      if (event.error === "not-allowed") {
        setPermissionError("Mikrofon erişimi reddedildi.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if still in chat mode
      if (recognitionRef.current && !isProcessingRef.current) {
        try {
          recognition.start();
        } catch {
          // Ignore
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      return true;
    } catch {
      return false;
    }
  }, [
    setPermissionError,
    setCurrentUserSpeech,
    setUserSpeaking,
    processUserSpeech,
  ]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setUserSpeaking(false);
    setCurrentUserSpeech("");
  }, [setUserSpeaking, setCurrentUserSpeech]);

  return {
    isListening,
    startListening,
    stopListening,
    speakGreeting,
    speakFarewell,
    checkTermination,
  };
}
