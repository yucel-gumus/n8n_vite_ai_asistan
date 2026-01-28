import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, sendChatMessage } from "@/lib/openai";
import { cn } from "@/lib/utils";
import { useMeetingStore } from "@/store/meetingStore";
import { Bot, Loader2, Send, User } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

interface ChatInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatInterface({ open, onOpenChange }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    transcriptBuffer,
    chatMessages,
    isAssistantTyping,
    addChatMessage,
    setAssistantTyping,
  } = useMeetingStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAssistantTyping]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Add greeting when chat opens for the first time
  useEffect(() => {
    if (open && chatMessages.length === 0) {
      addChatMessage({
        role: "assistant",
        content:
          "Merhaba! Ben Enerwise AI asistanınızım. Toplantı hakkında sorularınız varsa yardımcı olmaktan memnuniyet duyarım. 🎯",
      });
    }
  }, [open, chatMessages.length, addChatMessage]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const message = inputValue.trim();
    if (!message || isAssistantTyping) return;

    // Add user message
    addChatMessage({ role: "user", content: message });
    setInputValue("");

    // Get AI response
    setAssistantTyping(true);

    try {
      const conversationHistory = chatMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })) as ChatMessage[];

      const response = await sendChatMessage(
        message,
        transcriptBuffer,
        conversationHistory,
      );
      addChatMessage({ role: "assistant", content: response });
    } catch (error) {
      addChatMessage({
        role: "assistant",
        content: "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.",
      });
    } finally {
      setAssistantTyping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[600px] max-h-[80vh] flex-col sm:max-w-[500px]">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-enerwise-500/20">
              <Bot className="h-5 w-5 text-enerwise-500" />
            </div>
            <span>Enerwise AI Asistan</span>
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="flex flex-col gap-4 py-4">
            {chatMessages.map((message, index) => (
              <ChatBubble key={index} message={message} />
            ))}

            {isAssistantTyping && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-enerwise-500/20">
                  <Bot className="h-4 w-4 text-enerwise-500" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Transcript preview */}
        {transcriptBuffer && (
          <div className="border-t border-b py-2">
            <p className="text-xs text-muted-foreground">
              📝 Toplantı transkripti: {transcriptBuffer.length} karakter
            </p>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 pt-4">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Mesajınızı yazın..."
            disabled={isAssistantTyping}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputValue.trim() || isAssistantTyping}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
}

function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary/20" : "bg-enerwise-500/20",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary" />
        ) : (
          <Bot className="h-4 w-4 text-enerwise-500" />
        )}
      </div>

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-muted",
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
