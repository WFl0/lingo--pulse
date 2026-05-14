import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  Play,
  Square,
  Menu,
} from "lucide-react";
import type { AppSettings } from "@/lib/types";

type Props = {
  settings: AppSettings;
  onToggleMute: () => void;
  onPlayLast: () => void;
  onStop: () => void;
  onOpenSettings: () => void;
  onOpenMenu?: () => void;
  speaking: boolean;
  hasLastReply: boolean;
};

export function TopBar({
  settings,
  onToggleMute,
  onPlayLast,
  onStop,
  onOpenSettings,
  onOpenMenu,
  speaking,
  hasLastReply,
}: Props) {
  const muted = !settings.autoSpeak;
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-20 glass-strong border-b border-border"
    >
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-3 flex items-center gap-2">
        {onOpenMenu && (
          <button
            onClick={onOpenMenu}
            className="md:hidden p-2 rounded-xl hover:bg-muted/40 transition-smooth"
            aria-label="Menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        <div className="flex-1 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                speaking ? "animate-ping bg-[var(--saudi)]" : ""
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                speaking ? "bg-[var(--saudi)]" : "bg-muted-foreground/40"
              }`}
            />
          </span>
          <span className="text-xs text-muted-foreground tracking-wider uppercase">
            {speaking ? "Speaking" : muted ? "Muted" : "Live"}
          </span>
        </div>

        <ToolbarBtn
          onClick={speaking ? onStop : onPlayLast}
          disabled={!hasLastReply && !speaking}
          label={speaking ? "Stop playback" : "Play last reply"}
        >
          {speaking ? (
            <Square className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
        </ToolbarBtn>

        <ToolbarBtn
          onClick={onToggleMute}
          label={muted ? "Unmute auto-speak" : "Mute auto-speak"}
          active={!muted}
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </ToolbarBtn>

        <ToolbarBtn onClick={onOpenSettings} label="Open settings">
          <SettingsIcon className="h-4 w-4" />
        </ToolbarBtn>
      </div>
    </motion.header>
  );
}

function ToolbarBtn({
  children,
  onClick,
  label,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.08 }}
      whileTap={{ scale: disabled ? 1 : 0.92 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="p-2.5 rounded-xl glass hover:bg-muted/40 transition-smooth disabled:opacity-30 disabled:cursor-not-allowed"
      style={
        active
          ? {
              boxShadow:
                "0 0 0 1px var(--saudi), 0 0 18px oklch(0.72 0.18 155 / 0.35)",
            }
          : undefined
      }
    >
      {children}
    </motion.button>
  );
}
