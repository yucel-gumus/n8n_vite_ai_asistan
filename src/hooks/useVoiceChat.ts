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
  onaudiostart?: (() => void) | null;
  onspeechend?: (() => void) | null;
}

const TERMINATION_WORDS = [
  "görüşürüz",
  "gorusuruz",
  "toplantıyı bitir",
  "toplantiyi bitir",
];

// 3 saniye sessizlik sonrası AI yanıt verir
const SILENCE_TIMEOUT = 3000;

export function useVoiceChat() {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isProcessingRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedTextRef = useRef<string>("");
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const meetingDataRef = useRef<typeof meetingData>(null);
  const chatMessagesRef = useRef<typeof chatMessages>([]);

  const {
    meetingData,
    chatMessages,
    isAssistantSpeaking,
    addChatMessage,
    setAssistantTyping,
    setAssistantSpeaking,
    setUserSpeaking,
    setCurrentUserSpeech,
    setPermissionError,
  } = useMeetingStore();

  // meetingData değiştiğinde ref'i güncelle (stale closure önleme)
  meetingDataRef.current = meetingData;
  chatMessagesRef.current = chatMessages;

  const checkTermination = useCallback((text: string): boolean => {
    const normalizedText = text.toLowerCase().trim();
    return TERMINATION_WORDS.some((word) => normalizedText.includes(word));
  }, []);

  // Silence timer'ı temizle
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Silence timer'ı başlat - 3 saniye sessizlik sonrası AI yanıtlar
  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();

    silenceTimerRef.current = setTimeout(() => {
      const textToProcess = accumulatedTextRef.current.trim();
      if (textToProcess && !isProcessingRef.current) {
        console.log("3 saniye sessizlik - AI yanıt veriyor:", textToProcess);
        processUserSpeechInternal(textToProcess);
        accumulatedTextRef.current = "";
      }
    }, SILENCE_TIMEOUT);
  }, []);

  const speakGreeting = useCallback(async () => {
    const greeting =
      "Merhaba! Ben EnerwiseAi. Toplantı hakkında sorularınız varsa yanıtlamaktan memnuniyet duyarım.";

    addChatMessage({ role: "assistant", content: greeting });
    setAssistantSpeaking(true);

    // AI konuşurken mikrofonu durdur
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
    }

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

    // AI konuşurken mikrofonu durdur
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
    }

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

  // Internal process function
  const processUserSpeechInternal = useCallback(
    async (userText: string) => {
      if (isProcessingRef.current || !userText.trim()) return;

      // Termination komutu kontrolü
      if (checkTermination(userText)) {
        addChatMessage({ role: "user", content: userText });
        setCurrentUserSpeech("");
        setUserSpeaking(false);
        return;
      }

      isProcessingRef.current = true;
      clearSilenceTimer();

      // Dinlemeyi durdur - AI konuşacak
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        setIsListening(false);
      }

      // Add user message
      addChatMessage({ role: "user", content: userText });
      setCurrentUserSpeech("");
      setUserSpeaking(false);

      // Get AI response and speak
      setAssistantTyping(true);

      try {
        // Ref'lerden güncel değerleri al (stale closure önleme)
        const currentMeetingData = meetingDataRef.current;
        const currentChatMessages = chatMessagesRef.current;

        const conversationHistory = currentChatMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })) as ChatMessage[];

        setAssistantTyping(false);
        setAssistantSpeaking(true);

        const result = await getAIResponseAndSpeak(
          userText,
          currentMeetingData?.content || "",
          conversationHistory,
        );
        addChatMessage({ role: "assistant", content: result.text });

        // AI konuşması bittikten sonra tekrar dinlemeye başla
        setAssistantSpeaking(false);
        isProcessingRef.current = false;

        // Kısa bir gecikme sonrası dinlemeyi tekrar başlat
        setTimeout(() => {
          if (!isProcessingRef.current) {
            startRecognition();
          }
        }, 500);
      } catch (error) {
        console.error("Error processing speech:", error);
        addChatMessage({
          role: "assistant",
          content: "Üzgünüm, bir hata oluştu.",
        });
        setAssistantTyping(false);
        setAssistantSpeaking(false);
        isProcessingRef.current = false;

        // Hata durumunda da dinlemeyi tekrar başlat
        setTimeout(() => {
          startRecognition();
        }, 500);
      }
    },
    [
      addChatMessage,
      setAssistantTyping,
      setAssistantSpeaking,
      setCurrentUserSpeech,
      setUserSpeaking,
      checkTermination,
      clearSilenceTimer,
    ],
  );

  // Recognition başlatma fonksiyonu
  const startRecognition = useCallback(() => {
    const SpeechRecognitionAPI =
      (
        window as unknown as {
          SpeechRecognition?: new () => SpeechRecognition;
          webkitSpeechRecognition?: new () => SpeechRecognition;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => SpeechRecognition;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      return;
    }

    // Eğer AI konuşuyorsa başlatma
    if (isAssistantSpeaking || isProcessingRef.current) {
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "tr-TR";
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      console.log("Voice recognition started");
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // AI konuşuyorsa sonuçları işleme
      if (isAssistantSpeaking || isProcessingRef.current) {
        return;
      }

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

      // Konuşma algılandı - timer'ı sıfırla
      lastSpeechTimeRef.current = Date.now();

      if (interimText) {
        setCurrentUserSpeech(accumulatedTextRef.current + " " + interimText);
        setUserSpeaking(true);
        clearSilenceTimer();
      }

      if (finalText.trim()) {
        accumulatedTextRef.current = (
          accumulatedTextRef.current +
          " " +
          finalText
        ).trim();
        setCurrentUserSpeech(accumulatedTextRef.current);
        setUserSpeaking(true);

        // 3 saniye sessizlik timer'ı başlat
        startSilenceTimer();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Voice chat recognition error:", event.error);

      if (event.error === "not-allowed") {
        setPermissionError("Mikrofon erişimi reddedildi.");
        return;
      }

      // Diğer hatalarda otomatik yeniden başlat
      if (
        event.error !== "aborted" &&
        !isProcessingRef.current &&
        !isAssistantSpeaking
      ) {
        setTimeout(() => {
          if (
            recognitionRef.current &&
            !isProcessingRef.current &&
            !isAssistantSpeaking
          ) {
            try {
              recognitionRef.current.start();
            } catch {
              // Ignore
            }
          }
        }, 100);
      }
    };

    recognition.onend = () => {
      console.log("Voice recognition ended");
      setIsListening(false);

      // AI konuşmuyorsa ve işlem yoksa otomatik yeniden başlat
      if (
        !isProcessingRef.current &&
        !isAssistantSpeaking &&
        recognitionRef.current
      ) {
        setTimeout(() => {
          if (!isProcessingRef.current && !isAssistantSpeaking) {
            try {
              recognition.start();
            } catch {
              // Ignore - might already be started
            }
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error("Failed to start recognition:", error);
    }
  }, [
    isAssistantSpeaking,
    setCurrentUserSpeech,
    setUserSpeaking,
    setPermissionError,
    clearSilenceTimer,
    startSilenceTimer,
  ]);

  const startListening = useCallback(async (): Promise<boolean> => {
    const SpeechRecognitionAPI =
      (
        window as unknown as {
          SpeechRecognition?: new () => SpeechRecognition;
          webkitSpeechRecognition?: new () => SpeechRecognition;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => SpeechRecognition;
        }
      ).webkitSpeechRecognition;

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

    // Reset state
    accumulatedTextRef.current = "";
    isProcessingRef.current = false;

    startRecognition();
    return true;
  }, [setPermissionError, startRecognition]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    accumulatedTextRef.current = "";
    isProcessingRef.current = true; // Yeniden başlamayı engelle

    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    setIsListening(false);
    setUserSpeaking(false);
    setCurrentUserSpeech("");
  }, [setUserSpeaking, setCurrentUserSpeech, clearSilenceTimer]);

  return {
    isListening,
    startListening,
    stopListening,
    speakGreeting,
    speakFarewell,
    checkTermination,
  };
}
