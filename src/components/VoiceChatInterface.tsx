import { Button } from "@/components/ui/button";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { cn } from "@/lib/utils";
import { useMeetingStore } from "@/store/meetingStore";
import { Bot, Mic, MicOff, PhoneOff, User, Volume2, Waves } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

interface VoiceChatInterfaceProps {
  open: boolean;
  onEndChat: () => void;
}

export function VoiceChatInterface({
  open,
  onEndChat,
}: VoiceChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasGreetedRef = useRef(false);

  const {
    chatMessages,
    isAssistantTyping,
    isAssistantSpeaking,
    isUserSpeaking,
    currentUserSpeech,
  } = useMeetingStore();

  const {
    isListening,
    startListening,
    stopListening,
    speakGreeting,
    speakFarewell,
    checkTermination,
  } = useVoiceChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAssistantTyping, currentUserSpeech]);

  // Start voice chat when dialog opens
  useEffect(() => {
    if (open && !hasGreetedRef.current) {
      hasGreetedRef.current = true;

      // Greet and start listening
      const initChat = async () => {
        await speakGreeting();
        await startListening();
      };
      initChat();
    }

    return () => {
      if (!open) {
        stopListening();
        hasGreetedRef.current = false;
      }
    };
  }, [open, speakGreeting, startListening, stopListening]);

  // Check for termination command in messages
  useEffect(() => {
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage?.role === "user" && checkTermination(lastMessage.content)) {
      handleEndChat();
    }
  }, [chatMessages, checkTermination]);

  const handleEndChat = useCallback(async () => {
    stopListening();
    await speakFarewell();
    setTimeout(() => {
      onEndChat();
    }, 1500);
  }, [stopListening, speakFarewell, onEndChat]);

  const toggleListening = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  if (!open) return null;

  // Determine current state for UI
  const isAISpeaking = isAssistantSpeaking;
  const isUserTurn = isListening && !isAssistantSpeaking;
  const isProcessing = isAssistantTyping;

  return (
    <div className="voice-chat-overlay fixed inset-0 z-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-xl">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Sesli Asistan</h1>
            <p className="text-sm text-white/60">
              {isAISpeaking
                ? "Asistan konuşuyor..."
                : isProcessing
                  ? "Düşünüyor..."
                  : isUserTurn
                    ? "Sizi dinliyorum..."
                    : "Hazır"}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-2 transition-all",
            isAISpeaking
              ? "bg-enerwise-500/20"
              : isUserTurn
                ? "bg-blue-500/20"
                : "bg-white/10",
          )}
        >
          {isAISpeaking ? (
            <>
              <Volume2 className="h-4 w-4 animate-pulse text-enerwise-400" />
              <span className="text-sm font-medium text-enerwise-400">
                AI Konuşuyor
              </span>
            </>
          ) : isUserTurn ? (
            <>
              <Mic className="h-4 w-4 animate-pulse text-blue-400" />
              <span className="text-sm font-medium text-blue-400">
                Dinleniyor
              </span>
            </>
          ) : (
            <>
              <Waves className="h-4 w-4 text-white/60" />
              <span className="text-sm font-medium text-white/60">Bekleme</span>
            </>
          )}
        </div>
      </header>

      {/* Main Content - Conversation */}
      <div className="flex-1 overflow-hidden p-6">
        <div
          ref={scrollRef}
          className="custom-scrollbar h-full overflow-y-auto space-y-4 pr-2"
        >
          {chatMessages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "message-enter flex items-end gap-3",
                message.role === "user" && "flex-row-reverse",
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  message.role === "user"
                    ? "bg-blue-500/20"
                    : "gradient-primary",
                )}
              >
                {message.role === "user" ? (
                  <User className="h-5 w-5 text-blue-400" />
                ) : (
                  <Bot className="h-5 w-5 text-white" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={cn(
                  "max-w-[70%] rounded-2xl px-5 py-3",
                  message.role === "user"
                    ? "rounded-br-sm bg-blue-500 text-white"
                    : "rounded-bl-sm bg-white/10 text-white",
                )}
              >
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {/* Current user speech (interim) */}
          {currentUserSpeech && (
            <div className="message-enter flex items-end gap-3 flex-row-reverse">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20">
                <User className="h-5 w-5 text-blue-400" />
              </div>
              <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-blue-500/50 px-5 py-3">
                <p className="text-[15px] text-white/90 italic">
                  {currentUserSpeech}
                  <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-white/70" />
                </p>
              </div>
            </div>
          )}

          {/* Assistant typing/thinking indicator */}
          {isAssistantTyping && (
            <div className="message-enter flex items-end gap-3">
              <div className="gradient-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-white/10 px-5 py-4">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full bg-white/60 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-2 w-2 rounded-full bg-white/60 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 rounded-full bg-white/60 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="border-t border-white/10 px-6 py-6">
        {/* Voice Activity Indicator */}
        <div className="mb-6 flex justify-center">
          <div
            className={cn(
              "relative flex items-center justify-center",
              isAISpeaking && "speaking-pulse",
            )}
          >
            {/* Ripple effects when active */}
            {(isAISpeaking || isUserSpeaking) && (
              <>
                <div
                  className={cn(
                    "absolute h-32 w-32 rounded-full opacity-20 ripple",
                    isAISpeaking ? "bg-enerwise-500" : "bg-blue-500",
                  )}
                />
                <div
                  className={cn(
                    "absolute h-24 w-24 rounded-full opacity-30 ripple",
                    isAISpeaking ? "bg-enerwise-500" : "bg-blue-500",
                  )}
                  style={{ animationDelay: "0.5s" }}
                />
              </>
            )}

            {/* Main indicator */}
            <div
              className={cn(
                "relative z-10 flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300",
                isAISpeaking
                  ? "gradient-primary shadow-lg shadow-enerwise-500/30"
                  : isUserTurn
                    ? "bg-blue-500 shadow-lg shadow-blue-500/30"
                    : "bg-white/10",
              )}
            >
              {isAISpeaking ? (
                <Volume2 className="h-8 w-8 text-white animate-pulse" />
              ) : isUserTurn ? (
                <Mic className="h-8 w-8 text-white" />
              ) : (
                <Waves className="h-8 w-8 text-white/40" />
              )}
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4">
          {/* Mic toggle button */}
          <Button
            size="lg"
            variant="ghost"
            onClick={toggleListening}
            disabled={isAssistantSpeaking}
            className={cn(
              "h-14 w-14 rounded-full transition-all",
              isListening
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-white/10 hover:bg-white/20 text-white/70",
              isAssistantSpeaking && "opacity-50 cursor-not-allowed",
            )}
          >
            {isListening ? (
              <Mic className="h-6 w-6" />
            ) : (
              <MicOff className="h-6 w-6" />
            )}
          </Button>

          {/* End chat button */}
          <Button
            size="lg"
            onClick={handleEndChat}
            className="h-14 w-14 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-all"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>

        {/* Help Text */}
        <p className="mt-4 text-center text-sm text-white/40">
          {isAssistantSpeaking
            ? "Asistan konuşmasını bitirdiğinde sizi dinlemeye başlayacak"
            : isListening
              ? '"Görüşürüz" diyerek sohbeti sonlandırabilirsiniz'
              : "Mikrofona basarak konuşmaya başlayın"}
        </p>
      </div>
    </div>
  );
}
