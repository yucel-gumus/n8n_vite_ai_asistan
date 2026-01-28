import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  levels: number[];
  isActive: boolean;
  className?: string;
}

export function AudioVisualizer({
  levels,
  isActive,
  className,
}: AudioVisualizerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {levels.map((level, index) => (
        <div
          key={index}
          className={cn(
            "w-2 rounded-full bg-gradient-to-t from-enerwise-600 to-enerwise-400 transition-all duration-75",
            isActive ? "opacity-100" : "opacity-30",
          )}
          style={{
            height: `${Math.max(8, level * 64)}px`,
            animationDelay: `${index * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
}

interface AudioVisualizerCircleProps {
  level: number;
  isActive: boolean;
  className?: string;
}

export function AudioVisualizerCircle({
  level,
  isActive,
  className,
}: AudioVisualizerCircleProps) {
  const rings = 3;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer rings */}
      {Array.from({ length: rings }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "absolute rounded-full border-2 border-enerwise-500/30 transition-all duration-300",
            isActive && "animate-pulse",
          )}
          style={{
            width: `${120 + i * 40 + level * 20}px`,
            height: `${120 + i * 40 + level * 20}px`,
            opacity: isActive ? 0.3 - i * 0.08 : 0.1,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}

      {/* Center circle */}
      <div
        className={cn(
          "relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-enerwise-500 to-enerwise-700 shadow-lg transition-transform duration-150",
          isActive && "pulse-glow",
        )}
        style={{
          transform: `scale(${1 + level * 0.15})`,
        }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-enerwise-600/50">
          <div className="h-4 w-4 rounded-full bg-white shadow-inner" />
        </div>
      </div>
    </div>
  );
}
