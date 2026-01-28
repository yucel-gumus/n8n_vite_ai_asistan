import {
  AudioVisualizer,
  AudioVisualizerCircle,
} from "@/components/AudioVisualizer";
import { RecordingIndicator } from "@/components/RecordingIndicator";
import { Button } from "@/components/ui/button";
import { VoiceChatInterface } from "@/components/VoiceChatInterface";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { cn } from "@/lib/utils";
import { sendTranscriptToWebhook } from "@/lib/webhook";
import { useMeetingStore } from "@/store/meetingStore";
import { AlertCircle, Play, Square, Zap } from "lucide-react";
import { useCallback, useEffect } from "react";

export function MeetingView() {
  const {
    recordingState,
    duration,
    transcriptBuffer,
    interimTranscript,
    isChatOpen,
    permissionError,
    startRecording: startMeetingRecording,
    stopRecording: stopMeetingRecording,
    startChatMode,
    closeChat,
    updateDuration,
    reset,
  } = useMeetingStore();

  const {
    audioLevels,
    audioLevel,
    startRecording: startAudio,
    stopRecording: stopAudio,
  } = useAudioRecorder();

  const handleWakeWord = useCallback(() => {
    console.log(
      "Wake word detected! Stopping recording and starting voice chat...",
    );
    stopAudio();
    startChatMode();
  }, [stopAudio, startChatMode]);

  const handleTermination = useCallback(async () => {
    console.log("Termination command detected during recording!");
    stopAudio();
    stopMeetingRecording();

    // Send transcript to webhook
    if (transcriptBuffer) {
      const result = await sendTranscriptToWebhook(transcriptBuffer, duration);
      if (result.success) {
        console.log("Transcript sent successfully");
      } else {
        console.error("Failed to send transcript:", result.error);
      }
    }
  }, [stopAudio, stopMeetingRecording, transcriptBuffer, duration]);

  const { startRecognition, stopRecognition } = useSpeechRecognition({
    onWakeWord: handleWakeWord,
    onTerminationCommand: handleTermination,
  });

  // Handle end of voice chat - send to webhook
  const handleEndVoiceChat = useCallback(async () => {
    closeChat();
    stopMeetingRecording();

    if (transcriptBuffer) {
      const result = await sendTranscriptToWebhook(transcriptBuffer, duration);
      if (result.success) {
        console.log("Transcript sent successfully to webhook");
      } else {
        console.error("Failed to send transcript:", result.error);
      }
    }

    // Reset after a delay
    setTimeout(() => {
      reset();
    }, 1000);
  }, [closeChat, stopMeetingRecording, transcriptBuffer, duration, reset]);

  // Update duration every second while recording
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (recordingState === "recording") {
      interval = setInterval(updateDuration, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recordingState, updateDuration]);

  const handleStartRecording = async () => {
    const audioStarted = await startAudio();
    if (!audioStarted) return;

    const recognitionStarted = await startRecognition();
    if (!recognitionStarted) {
      stopAudio();
      return;
    }

    startMeetingRecording();
  };

  const handleStopRecording = async () => {
    stopAudio();
    stopRecognition();
    stopMeetingRecording();

    // Send transcript to webhook
    if (transcriptBuffer) {
      const result = await sendTranscriptToWebhook(transcriptBuffer, duration);
      if (result.success) {
        console.log("Transcript sent successfully");
      } else {
        console.error("Failed to send transcript:", result.error);
      }
    }
  };

  const isRecording = recordingState === "recording";
  const isChatting = recordingState === "chatting";
  const isCompleted = recordingState === "completed";
  const displayTranscript =
    transcriptBuffer + (interimTranscript ? ` ${interimTranscript}` : "");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-enerwise-500 to-enerwise-700">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Enerwise AI</h1>
              <p className="text-xs text-muted-foreground">
                Akıllı Toplantı Asistanı
              </p>
            </div>
          </div>

          <RecordingIndicator isRecording={isRecording} duration={duration} />
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto flex flex-1 flex-col items-center justify-center gap-8 p-8">
        {/* Permission Error */}
        {permissionError && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{permissionError}</p>
          </div>
        )}

        {/* Completed state */}
        {isCompleted && (
          <div className="text-center">
            <div className="mb-4 flex h-24 w-24 mx-auto items-center justify-center rounded-full bg-enerwise-500/20">
              <Zap className="h-12 w-12 text-enerwise-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Toplantı Tamamlandı
            </h2>
            <p className="text-muted-foreground mb-6">
              Transkript webhook'a gönderildi.
            </p>
            <Button
              onClick={reset}
              className="bg-enerwise-600 hover:bg-enerwise-700"
            >
              Yeni Toplantı Başlat
            </Button>
          </div>
        )}

        {/* Recording/Idle state */}
        {!isCompleted && !isChatting && (
          <>
            {/* Audio Visualizer */}
            <div className="relative">
              <AudioVisualizerCircle
                level={audioLevel}
                isActive={isRecording}
                className="h-64 w-64"
              />
            </div>

            {/* Bar Visualizer */}
            <AudioVisualizer
              levels={audioLevels}
              isActive={isRecording}
              className="h-16"
            />

            {/* Status */}
            <div className="text-center">
              <p
                className={cn(
                  "text-lg font-medium",
                  isRecording ? "text-enerwise-500" : "text-muted-foreground",
                )}
              >
                {isRecording
                  ? '"Hey Asistan" diyerek sesli sohbete geçin'
                  : "Toplantıyı başlatmak için kayda basın"}
              </p>
              {isRecording && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Toplantı kaydediliyor... AI ile sohbet etmek için "Hey
                  Asistan" deyin
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-4">
              {!isRecording ? (
                <Button
                  size="lg"
                  onClick={handleStartRecording}
                  className="gap-2 bg-enerwise-600 hover:bg-enerwise-700"
                >
                  <Play className="h-5 w-5" />
                  Toplantıyı Başlat
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleStopRecording}
                  className="gap-2"
                >
                  <Square className="h-5 w-5" />
                  Toplantıyı Bitir
                </Button>
              )}
            </div>

            {/* Live Transcript Preview */}
            {displayTranscript && (
              <div className="w-full max-w-2xl rounded-lg border bg-card/50 p-4">
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                  Canlı Transkript
                </h3>
                <p className="text-sm leading-relaxed text-foreground">
                  {displayTranscript}
                  {interimTranscript && (
                    <span className="text-muted-foreground animate-pulse">
                      |
                    </span>
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 py-4">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>© 2026 Enerwise AI - Toplantılarınızı akıllı hale getirin</p>
        </div>
      </footer>

      {/* Voice Chat Interface */}
      <VoiceChatInterface
        open={isChatOpen && isChatting}
        onEndChat={handleEndVoiceChat}
      />
    </div>
  );
}
