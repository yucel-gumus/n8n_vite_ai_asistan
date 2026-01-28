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

interface SpeechRecognitionInstance extends EventTarget {
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

interface UseWakeWordListenerProps {
  onWakeWord: () => void;
}

export function useWakeWordListener({ onWakeWord }: UseWakeWordListenerProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isProcessingWakeWord = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    setMicPermission,
    setPermissionError,
    setCurrentUserSpeech,
    setUserSpeaking,
    appendToTranscript,
  } = useMeetingStore();

  // Hızlı yeniden başlatma
  const quickRestart = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }

    restartTimeoutRef.current = setTimeout(() => {
      if (recognitionRef.current && !isProcessingWakeWord.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Zaten çalışıyor olabilir
        }
      }
    }, 50); // Çok hızlı restart
  }, []);

  const startListening = useCallback(async (): Promise<boolean> => {
    // Check for browser support
    const SpeechRecognitionAPI =
      (
        window as unknown as {
          SpeechRecognition?: new () => SpeechRecognitionInstance;
          webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setPermissionError("Bu tarayıcı ses tanıma desteklemiyor.");
      return false;
    }

    // Request microphone permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission(true);
    } catch {
      setPermissionError("Mikrofon izni reddedildi.");
      return false;
    }

    // Reset state
    isProcessingWakeWord.current = false;

    // Create recognition instance
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "tr-TR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3; // Daha fazla alternatif

    recognition.onstart = () => {
      console.log("Wake word listener started");
      setIsListening(true);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setPermissionError("Mikrofon izni reddedildi.");
        setIsListening(false);
      } else if (event.error !== "aborted") {
        // Hızlı yeniden başlat
        quickRestart();
      }
    };

    recognition.onend = () => {
      console.log("Wake word listener ended");
      // Çok hızlı yeniden başlat
      if (!isProcessingWakeWord.current && recognitionRef.current) {
        quickRestart();
      }
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update UI with current speech
      const currentSpeech = interimTranscript || finalTranscript;
      if (currentSpeech) {
        setCurrentUserSpeech(currentSpeech);
        setUserSpeaking(true);
      }

      // Append final transcript to accumulated transcript
      if (finalTranscript.trim()) {
        appendToTranscript(finalTranscript.trim());
      }

      // Check for wake word
      const fullText = (finalTranscript + interimTranscript).toLowerCase();
      const wakeWordPatterns = [
        "hey asistan",
        "hey assistant",
        "heyasistan",
        "he asistan",
        "merhaba asistan",
        "hey asis",
        "heyasis",
      ];

      const hasWakeWord = wakeWordPatterns.some((pattern) =>
        fullText.includes(pattern),
      );

      if (hasWakeWord && !isProcessingWakeWord.current) {
        console.log("Wake word detected:", fullText);
        isProcessingWakeWord.current = true;
        setUserSpeaking(false);
        setCurrentUserSpeech("");

        // Stop recognition before triggering wake word
        recognition.stop();
        setIsListening(false);

        onWakeWord();
      }

      // Keep speech display showing (don't clear after final results)
      if (finalTranscript && !hasWakeWord) {
        // Just mark as not actively speaking, but keep currentUserSpeech
        setTimeout(() => {
          setUserSpeaking(false);
        }, 300);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      return true;
    } catch (error) {
      console.error("Failed to start recognition:", error);
      return false;
    }
  }, [
    onWakeWord,
    setMicPermission,
    setPermissionError,
    setCurrentUserSpeech,
    setUserSpeaking,
    appendToTranscript,
    quickRestart,
  ]);

  const stopListening = useCallback(() => {
    isProcessingWakeWord.current = true; // Prevent auto-restart

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setUserSpeaking(false);
    setCurrentUserSpeech("");
  }, [setUserSpeaking, setCurrentUserSpeech]);

  const resetWakeWordState = useCallback(() => {
    isProcessingWakeWord.current = false;
  }, []);

  return {
    isListening,
    startListening,
    stopListening,
    resetWakeWordState,
  };
}
