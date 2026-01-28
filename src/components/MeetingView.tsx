import { AudioVisualizerCircle } from "@/components/AudioVisualizer";
import { Button } from "@/components/ui/button";
import { VoiceChatInterface } from "@/components/VoiceChatInterface";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useWakeWordListener } from "@/hooks/useWakeWordListener";
import { cn } from "@/lib/utils";
import { sendTranscriptToWebhook } from "@/lib/webhook";
import { MeetingData, useMeetingStore } from "@/store/meetingStore";
import {
  AlertCircle,
  Brain,
  MessageSquare,
  Mic,
  MicOff,
  Sparkles,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function MeetingView() {
  const {
    appState,
    meetingData,
    isMeetingLoaded,
    currentUserSpeech,
    isUserSpeaking,
    accumulatedTranscript,
    isChatOpen,
    permissionError,
    setAppState,
    setMeetingData,
    openChat,
    closeChat,
    clearTranscript,
  } = useMeetingStore();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    audioLevel,
    startRecording: startAudio,
    stopRecording: stopAudio,
  } = useAudioRecorder();

  // Load meeting data from metin.json
  useEffect(() => {
    const loadMeetingData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/metin.json");
        if (!response.ok) {
          throw new Error("Toplantı verisi yüklenemedi");
        }
        const rawData = await response.json();

        // Handle both old format (object) and new format (array of pages)
        let meetingContent: MeetingData;

        if (Array.isArray(rawData)) {
          // New format: array of pages with { page, content }
          const allContent = rawData
            .sort((a: { page: number }, b: { page: number }) => a.page - b.page)
            .map((item: { content: string }) => item.content)
            .join("\n\n");

          meetingContent = {
            title: "Yapay Zeka, Robotik ve Geleceğin Ekonomisi",
            date: new Date().toISOString().split("T")[0],
            participants: [],
            content: allContent,
          };
        } else {
          // Old format: direct object
          meetingContent = rawData as MeetingData;
        }

        setMeetingData(meetingContent);
        setLoadError(null);
      } catch (error) {
        console.error("Failed to load meeting data:", error);
        setLoadError(
          "metin.json dosyası yüklenemedi. Lütfen dosyanın public klasöründe olduğundan emin olun.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadMeetingData();
  }, [setMeetingData]);

  // Handle wake word detection
  const handleWakeWord = useCallback(() => {
    console.log("Wake word detected! Opening voice chat...");
    openChat();
  }, [openChat]);

  // Start wake word listener
  const { startListening, stopListening, isListening } = useWakeWordListener({
    onWakeWord: handleWakeWord,
  });

  // Handle start listening
  const handleStartListening = async () => {
    const audioStarted = await startAudio();
    if (!audioStarted) return;

    const started = await startListening();
    if (started) {
      setAppState("listening");
    } else {
      stopAudio();
    }
  };

  // Handle stop listening
  const handleStopListening = () => {
    stopAudio();
    stopListening();
    setAppState("idle");
  };

  // Handle end of voice chat
  const handleEndVoiceChat = useCallback(async () => {
    closeChat();

    // Send meeting content to webhook when chat ends
    if (meetingData) {
      const result = await sendTranscriptToWebhook(meetingData.content);
      if (result.success) {
        console.log("Meeting data sent to webhook");
      } else {
        console.error("Failed to send meeting data:", result.error);
      }
    }

    // Continue listening for wake word
    setAppState("listening");
  }, [closeChat, meetingData, setAppState]);

  const isIdle = appState === "idle";
  const isChatting = appState === "chatting";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Background orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      {/* Header */}
      <header className="glass-strong relative z-10 border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="gradient-primary flex h-11 w-11 items-center justify-center rounded-xl shadow-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                <span className="gradient-text">Enerwise</span>{" "}
                <span className="text-foreground">AI</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Akıllı Toplantı Asistanı
              </p>
            </div>
          </div>

          {/* Listening Status */}
          <div className="flex items-center gap-3">
            {isListening && (
              <div className="glass flex items-center gap-2 rounded-full px-4 py-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-enerwise-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-enerwise-500" />
                </span>
                <span className="text-sm font-medium text-enerwise-500">
                  Aktif Dinleme
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container relative z-10 mx-auto flex flex-1 flex-col items-center justify-center gap-8 p-8">
        {/* Loading State */}
        {isLoading && (
          <div className="glass slide-up rounded-2xl p-8 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-enerwise-500 border-t-transparent" />
            <p className="text-muted-foreground">
              Toplantı verisi yükleniyor...
            </p>
          </div>
        )}

        {/* Load Error */}
        {loadError && (
          <div className="glass slide-up flex items-center gap-3 rounded-xl px-5 py-4 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{loadError}</p>
          </div>
        )}

        {/* Permission Error */}
        {permissionError && (
          <div className="glass slide-up flex items-center gap-3 rounded-xl px-5 py-4 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{permissionError}</p>
          </div>
        )}

        {/* Main Interface */}
        {isMeetingLoaded && meetingData && !isChatting && (
          <div className="slide-up flex w-full max-w-6xl flex-col gap-8 lg:flex-row lg:items-start">
            {/* Left Side - Visualizer & Controls */}
            <div className="flex flex-col items-center gap-8 lg:w-[400px]">
              {/* Hero Section */}
              <div className="text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-enerwise-500/10 px-4 py-1.5 text-sm font-medium text-enerwise-500">
                  <Sparkles className="h-4 w-4" />
                  Yapay Zeka Destekli
                </div>
                <h2 className="mb-2 text-3xl font-bold text-foreground">
                  Sesli Asistan
                </h2>
                <p className="text-muted-foreground">
                  Toplantı hakkında sorularınızı yanıtlamak için hazır
                </p>
              </div>

              {/* Audio Visualizer Card */}
              <div className="glass relative w-full rounded-3xl p-8">
                <div className="relative flex flex-col items-center">
                  <AudioVisualizerCircle
                    level={audioLevel}
                    isActive={isListening}
                    className="h-52 w-52"
                  />

                  {/* Status Text */}
                  <div className="mt-6 text-center">
                    <p
                      className={cn(
                        "text-lg font-semibold transition-colors",
                        isListening
                          ? "text-enerwise-500"
                          : "text-muted-foreground",
                      )}
                    >
                      {isListening ? (
                        <>
                          <span className="inline-block animate-pulse">
                            "Hey Asistan"
                          </span>{" "}
                          diyerek başlayın
                        </>
                      ) : (
                        "Dinlemeye başlamak için tıklayın"
                      )}
                    </p>
                    {isListening && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Sesli komutları dinliyorum...
                      </p>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="mt-8 flex justify-center gap-4">
                  {isIdle ? (
                    <Button
                      size="lg"
                      onClick={handleStartListening}
                      className="gradient-primary h-14 gap-3 rounded-full px-8 text-lg font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                    >
                      <Mic className="h-5 w-5" />
                      Dinlemeyi Başlat
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      variant="destructive"
                      onClick={() => {
                        handleStopListening();
                        clearTranscript();
                      }}
                      className="h-14 gap-3 rounded-full px-8 text-lg font-semibold shadow-lg transition-all hover:scale-105"
                    >
                      <MicOff className="h-5 w-5" />
                      Dinlemeyi Durdur
                    </Button>
                  )}
                </div>
              </div>

              {/* AI Info Card */}
              <div className="glass w-full rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="gradient-glow flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {meetingData.title || "Toplantı İçeriği"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {(meetingData.content?.length || 0).toLocaleString()}{" "}
                      karakter
                      {meetingData.participants &&
                        ` • ${meetingData.participants.length} katılımcı`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Live Transcript */}
            <div className="flex-1">
              <div className="glass h-full min-h-[500px] rounded-3xl p-6">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between border-b border-border/50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-enerwise-500/10">
                      <MessageSquare className="h-5 w-5 text-enerwise-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Canlı Transkript
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {isListening
                          ? "Konuşmaları yazıya döküyorum..."
                          : "Bekleme modunda"}
                      </p>
                    </div>
                  </div>
                  {isUserSpeaking && (
                    <div className="flex items-center gap-2 rounded-full bg-enerwise-500/10 px-3 py-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-enerwise-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-enerwise-500" />
                      </span>
                      <span className="text-xs font-medium text-enerwise-500">
                        Konuşma algılanıyor
                      </span>
                    </div>
                  )}
                </div>

                {/* Transcript Content */}
                <div className="custom-scrollbar h-[380px] overflow-y-auto pr-2">
                  {!accumulatedTranscript && !currentUserSpeech ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted/30">
                        <Mic className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                      <p className="text-lg font-medium text-muted-foreground/60">
                        {isListening
                          ? "Konuşmaya başlayın..."
                          : "Dinlemeyi başlattığınızda burası dolacak"}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground/40">
                        Söyledikleriniz burada görünecek
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Accumulated Transcript */}
                      {accumulatedTranscript && (
                        <p className="whitespace-pre-wrap text-lg leading-relaxed text-foreground">
                          {accumulatedTranscript}
                        </p>
                      )}

                      {/* Current Speech (interim) */}
                      {currentUserSpeech && isUserSpeaking && (
                        <span className="text-lg font-medium text-enerwise-500">
                          {currentUserSpeech}
                          <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-enerwise-500" />
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Word Count Footer */}
                {accumulatedTranscript && (
                  <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                    <span className="text-sm text-muted-foreground">
                      {
                        accumulatedTranscript.split(/\s+/).filter(Boolean)
                          .length
                      }{" "}
                      kelime
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {accumulatedTranscript.length} karakter
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="glass-strong relative z-10 border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            © 2026{" "}
            <span className="gradient-text font-semibold">Enerwise AI</span> —
            Toplantılarınızı akıllı hale getirin
          </p>
        </div>
      </footer>

      {/* Voice Chat Interface */}
      <VoiceChatInterface open={isChatOpen} onEndChat={handleEndVoiceChat} />
    </div>
  );
}
