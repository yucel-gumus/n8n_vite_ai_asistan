import { cn, formatDuration } from "@/lib/utils";
import { Mic } from "lucide-react";

interface RecordingIndicatorProps {
  isRecording: boolean;
  duration: number;
  className?: string;
}

export function RecordingIndicator({
  isRecording,
  duration,
  className,
}: RecordingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            isRecording
              ? "bg-red-500/20 text-red-500"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Mic className="h-5 w-5" />
        </div>

        {/* Pulsing indicator */}
        {isRecording && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>
        )}
      </div>

      <div className="flex flex-col">
        <span
          className={cn(
            "text-sm font-medium",
            isRecording ? "text-red-500" : "text-muted-foreground",
          )}
        >
          {isRecording ? "Kayıt Yapılıyor" : "Kayıt Durduruldu"}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDuration(duration)}
        </span>
      </div>
    </div>
  );
}
