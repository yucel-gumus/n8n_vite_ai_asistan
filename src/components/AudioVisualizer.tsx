import { cn } from "@/lib/utils";

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
  const rings = 4;
  const bars = 12;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer animated rings */}
      {Array.from({ length: rings }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "absolute rounded-full transition-all duration-500",
            isActive
              ? "border-2 border-enerwise-500/40"
              : "border border-enerwise-500/10",
          )}
          style={{
            width: `${100 + i * 30 + (isActive ? level * 15 : 0)}px`,
            height: `${100 + i * 30 + (isActive ? level * 15 : 0)}px`,
            opacity: isActive ? 0.6 - i * 0.12 : 0.2,
            animationName: isActive ? "pulse" : "none",
            animationDuration: `${2 + i * 0.3}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}

      {/* Ripple effect when active */}
      {isActive && (
        <>
          <div
            className="absolute rounded-full bg-enerwise-500/20 ripple"
            style={{ width: "180px", height: "180px" }}
          />
          <div
            className="absolute rounded-full bg-enerwise-500/15 ripple"
            style={{
              width: "160px",
              height: "160px",
              animationDelay: "0.5s",
            }}
          />
        </>
      )}

      {/* Sound wave bars around circle */}
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          {Array.from({ length: bars }).map((_, i) => {
            const angle = (i / bars) * 360;
            const barHeight = 8 + Math.random() * level * 20;
            return (
              <div
                key={i}
                className="absolute w-1 rounded-full bg-enerwise-400/60 voice-wave"
                style={{
                  height: `${barHeight}px`,
                  transform: `rotate(${angle}deg) translateY(-70px)`,
                  animationDelay: `${i * 0.05}s`,
                  animationDuration: `${0.4 + Math.random() * 0.4}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Center circle with gradient */}
      <div
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full shadow-2xl transition-all duration-200",
          isActive ? "pulse-glow" : "",
        )}
        style={{
          width: `${88 + level * 12}px`,
          height: `${88 + level * 12}px`,
          background: isActive
            ? "linear-gradient(135deg, hsl(152 76% 45%) 0%, hsl(180 70% 40%) 100%)"
            : "linear-gradient(135deg, hsl(152 76% 35%) 0%, hsl(180 70% 30%) 100%)",
        }}
      >
        {/* Inner glow */}
        <div
          className={cn(
            "flex items-center justify-center rounded-full transition-all duration-200",
            isActive ? "bg-white/20" : "bg-white/10",
          )}
          style={{
            width: `${60 + level * 8}px`,
            height: `${60 + level * 8}px`,
          }}
        >
          {/* Core dot with pulse */}
          <div
            className={cn(
              "rounded-full bg-white shadow-lg transition-all duration-150",
              isActive && "animate-pulse",
            )}
            style={{
              width: `${16 + level * 8}px`,
              height: `${16 + level * 8}px`,
              boxShadow: isActive
                ? "0 0 20px rgba(255,255,255,0.6), 0 0 40px rgba(255,255,255,0.3)"
                : "0 0 10px rgba(255,255,255,0.3)",
            }}
          />
        </div>
      </div>

      {/* Status text below */}
      {isActive && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-enerwise-500 status-dot"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
