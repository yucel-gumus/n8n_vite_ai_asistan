import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { cn } from "@/lib/utils";
import { useMeetingStore } from "@/store/meetingStore";
import { Bot, Mic, MicOff, PhoneOff, User, Volume2 } from "lucide-react";
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
    transcriptBuffer,
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

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="flex h-[700px] max-h-[85vh] flex-col sm:max-w-[550px]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-enerwise-500/20">
                <Bot className="h-5 w-5 text-enerwise-500" />
              </div>
              <span>Sesli Asistan</span>
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-2">
              {isAssistantSpeaking && (
                <div className="flex items-center gap-1 rounded-full bg-enerwise-500/20 px-3 py-1">
                  <Volume2 className="h-4 w-4 text-enerwise-500 animate-pulse" />
                  <span className="text-xs text-enerwise-500">Konuşuyor</span>
                </div>
              )}
              {isUserSpeaking && (
                <div className="flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1">
                  <Mic className="h-4 w-4 text-blue-500 animate-pulse" />
                  <span className="text-xs text-blue-500">Dinliyor</span>
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="flex flex-col gap-4 py-4">
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3",
                  message.role === "user" && "flex-row-reverse",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    message.role === "user"
                      ? "bg-blue-500/20"
                      : "bg-enerwise-500/20",
                  )}
                >
                  {message.role === "user" ? (
                    <User className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Bot className="h-4 w-4 text-enerwise-500" />
                  )}
                </div>

                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    message.role === "user"
                      ? "rounded-tr-sm bg-blue-500 text-white"
                      : "rounded-tl-sm bg-muted",
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}

            {/* Current user speech (interim) */}
            {currentUserSpeech && (
              <div className="flex items-start gap-3 flex-row-reverse">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20">
                  <User className="h-4 w-4 text-blue-500" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-500/50 px-4 py-2">
                  <p className="text-sm text-white/80 italic">
                    {currentUserSpeech}...
                  </p>
                </div>
              </div>
            )}

            {/* Assistant typing indicator */}
            {isAssistantTyping && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-enerwise-500/20">
                  <Bot className="h-4 w-4 text-enerwise-500" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2">
                  <div className="flex gap-1">
                    <span
                      className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Transcript info */}
        {transcriptBuffer && (
          <div className="border-t border-b py-2">
            <p className="text-xs text-muted-foreground">
              📝 Toplantı transkripti: {transcriptBuffer.length} karakter
            </p>
          </div>
        )}

        {/* Voice controls */}
        <div className="flex items-center justify-center gap-4 pt-4">
          {/* Mic toggle button */}
          <Button
            size="lg"
            variant={isListening ? "default" : "outline"}
            onClick={toggleListening}
            disabled={isAssistantSpeaking}
            className={cn(
              "h-16 w-16 rounded-full",
              isListening && "bg-blue-500 hover:bg-blue-600",
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
            variant="destructive"
            onClick={handleEndChat}
            className="h-16 w-16 rounded-full"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-2">
          {isListening
            ? 'Konuşun... "Görüşürüz" veya "Toplantıyı bitir" diyerek çıkabilirsiniz'
            : "Mikrofona basarak konuşmaya başlayın"}
        </p>
      </DialogContent>
    </Dialog>
  );
}
