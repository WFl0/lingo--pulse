import { Mic, Square } from "lucide-react";

type Props = {
  listening: boolean;
  speaking: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function MicButton({ listening, speaking, disabled, onClick }: Props) {
  const active = listening || speaking;
  return (
    <div className="relative flex items-center justify-center">
      {active && (
        <>
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle, var(--saudi) 0%, transparent 70%)",
              animation: "pulse-ring 2s ease-out infinite",
            }}
          />
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle, var(--gold) 0%, transparent 70%)",
              animation: "pulse-ring 2s ease-out 0.6s infinite",
            }}
          />
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle, var(--saudi) 0%, transparent 70%)",
              animation: "pulse-ring 2s ease-out 1.2s infinite",
            }}
          />
        </>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={listening ? "Stop listening" : "Start listening"}
        className="relative z-10 grid h-40 w-40 place-items-center rounded-full transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: active
            ? "var(--gradient-primary)"
            : "linear-gradient(135deg, oklch(1 0 0 / 0.12), oklch(1 0 0 / 0.04))",
          backdropFilter: "blur(28px) saturate(180%)",
          border: "1px solid oklch(1 0 0 / 0.18)",
          boxShadow: active
            ? "0 0 80px oklch(0.72 0.18 155 / 0.6), 0 20px 60px -20px oklch(0 0 0 / 0.6)"
            : "0 20px 60px -20px oklch(0 0 0 / 0.6)",
        }}
      >
        <span
          className="absolute inset-2 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, oklch(1 0 0 / 0.15), transparent 60%)",
          }}
        />
        {listening ? (
          <Square className="relative z-10 h-12 w-12 fill-current" />
        ) : (
          <Mic className="relative z-10 h-14 w-14" />
        )}
      </button>
    </div>
  );
}

export function WaveBars({ active }: { active: boolean }) {
  const bars = Array.from({ length: 24 });
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {bars.map((_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full"
          style={{
            height: "100%",
            background: "var(--gradient-primary)",
            transformOrigin: "center",
            animation: active
              ? `wave-bar 1s ease-in-out ${i * 0.05}s infinite`
              : "none",
            opacity: active ? 1 : 0.25,
            transform: active ? undefined : "scaleY(0.2)",
          }}
        />
      ))}
    </div>
  );
}
